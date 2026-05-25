/**
 * Analysis Controller
 * Real AI audit engine — rule-based + optional OpenAI
 * Extracts text from PDF/DOCX files, runs full compliance audit
 */

const fs   = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');
const { extractTextFromFile } = require('../services/pdfTextService');

function decideDocumentStatus(result) {
  if (result.organization_match) {
    var ml = result.organization_training && result.organization_training.ml_training;
    var ref = ml && ml.best_match ? ml.best_match.reference_pdf : '';
    return {
      status: 'approved',
      title: 'SIFCO document validated',
      reason: result.organization_message,
      detail: ref ? 'Matched training reference: ' + ref : result.summary,
      nextSteps: [
        'Document matches a trained SIFCO daily paper.',
        'Proceed with workflow or compliance reporting.',
      ],
      code: 'ML-OK',
    };
  }
  return {
    status: 'rejected',
    title: 'Not a SIFCO trained document',
    reason: result.organization_message,
    detail: (result.inconsistencies && result.inconsistencies[0] && result.inconsistencies[0].detail) || '',
    nextSteps: [
      'Upload only packing list, HBL, shipping agreement, freight invoice, trucking invoice, or sea freight invoice.',
      'Use the same format as the six reference PDFs provided for training.',
    ],
    code: 'ML-REJECT',
  };
}

async function notifyAuditCompletion(models, document, result, decision, auditor, auditorComment = '') {
  const { Notification, User } = models;
  const [owner, auditorUser] = await Promise.all([
    document.uploadedBy ? User.findByPk(document.uploadedBy, { attributes: ['id', 'email', 'fullName', 'role'] }) : null,
    auditor?.id ? User.findByPk(auditor.id, { attributes: ['id', 'email', 'fullName', 'role'] }) : null,
  ]);

  const summary = [
    decision.title || (decision.status === 'approved' ? 'Document approved' : 'Document rejected'),
    decision.reason,
    decision.detail,
    decision.nextSteps && decision.nextSteps[0] ? `Next step: ${decision.nextSteps[0]}` : null,
    auditorComment ? `Auditor comment: ${auditorComment}` : null,
    `Compliance score: ${result.compliance_score}/100.`,
    `AI-written content: ${result.ai_generated_percentage ?? 0}% (limit: 25%).`,
    `Risk: ${result.risk_level || 'low'}.`,
  ].filter(Boolean).join(' ');

  const recipients = [owner, auditorUser]
    .filter(Boolean)
    .filter((user, index, all) => all.findIndex(u => u.id === user.id) === index);

  await Promise.all(recipients.map(user => Notification.create({
    recipientId: user.id,
    notificationType: user.id === auditorUser?.id ? 'audit_result_recorded' : 'document_audit_completed',
    channel: 'in_app',
    priority: decision.status === 'approved' ? 'medium' : 'high',
    subject: `Audit result: ${document.title}`,
    message: summary,
    details: {
      documentId: document.id,
      status: decision.status,
      auditorComment: auditorComment || null,
      complianceScore: result.compliance_score,
      aiGeneratedPercentage: result.ai_generated_percentage,
      riskLevel: result.risk_level,
      recipientRole: user.id === auditorUser?.id ? 'auditor' : 'document_owner',
    },
    relatedEntityType: 'document',
    relatedEntityId: document.id,
    actionUrl: `/documents?documentId=${document.id}`,
    status: 'unread',
    sentAt: new Date(),
    deliveryStatus: 'sent',
  })));

  if (owner?.email) {
    await emailService.sendAuditComplete(
      owner.email,
      owner.fullName || owner.email,
      document.title,
      auditorUser?.fullName || auditor?.email || 'Auditor',
      decision.status,
      summary,
      process.env.PORTAL_URL || 'http://localhost:3000/documents'
    );
  }

  if (auditorUser?.email && auditorUser.id !== owner?.id) {
    await emailService.sendEmail({
      to: auditorUser.email,
      subject: `Audit result recorded: "${document.title}" - ${decision.status.replace(/_/g, ' ')}`,
      html: `
        <p>Hi <strong>${auditorUser.fullName || auditorUser.email}</strong>,</p>
        <p>Your audit review for <strong>"${document.title}"</strong> has been recorded.</p>
        <p>${summary}</p>
        <p>Log in to the portal to view the full analysis and workflow status.</p>
      `,
      text: `Hi ${auditorUser.fullName || auditorUser.email},\n\nYour audit review for "${document.title}" has been recorded.\n\n${summary}\n\nLog in to the portal to view the full analysis and workflow status.`,
    });
  }
}

// ── POST /api/analysis/:documentId/analyze ────────────────────────────────────

const analyzeDocument = async (req, res) => {
  try {
    if (req.user?.role !== 'auditor') {
      return res.status(403).json({ error: 'Only approved auditors can run document audits.' });
    }

    const { documentId } = req.params;
    const auditorComment = (req.body?.auditorComment || req.body?.comment || '').trim();
    const { Document, DocumentAnalysis } = req.app.locals.models;

    const document = await Document.findByPk(documentId);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    // Always re-extract from PDF so audit uses full document text (not stale sparse cache)
    let textToAnalyze = null;
    if (document.filePath) {
      textToAnalyze = await extractTextFromFile(document.filePath, document.mimeType);
      if (textToAnalyze) {
        await document.update({ extractedText: textToAnalyze.slice(0, 10000), ocrProcessed: true });
      } else {
        console.warn('[analyze] PDF/text extraction returned empty for', document.fileName || document.id);
      }
    }
    if (!textToAnalyze) {
      textToAnalyze = document.extractedText || null;
    }

    // 2. No metadata fallback for audit — file name/title do not identify SIFCO papers
    if (!textToAnalyze || textToAnalyze.trim().length < 25) {
      return res.status(422).json({
        error: 'Could not read document content from the PDF. Renaming the file does not change the audit — the system reads text inside the document (letterhead, SIFCO, amounts, B/L). Re-upload a searchable PDF and analyze again.',
        documentId,
        fileName: document.fileName,
        hint: 'filename_ignored',
      });
    }

    // 3. ML audit — content only (filename is NOT passed to the classifier)
    const result = await aiService.auditDocument(textToAnalyze, [], {
      contentOnly: true,
    });
    const decision = decideDocumentStatus(result);

    // 4. Persist analysis
    await DocumentAnalysis.upsert({
      documentId,
      analysisType:    'compliance_audit',
      status:          'completed',
      summary:         result.summary       || '',
      results: {
        compliance_score:    result.compliance_score,
        ai_generated_percentage: result.ai_generated_percentage,
        ai_threshold_exceeded: result.ai_threshold_exceeded,
        ai_validity_percentage: result.ai_validity_percentage,
        risk_level:          result.risk_level,
        missing_fields:      result.missing_fields,
        extracted_fields:    result.extracted_fields,
        violations:          result.violations,
        inconsistencies:     result.inconsistencies,
        fraud_flags:         result.fraud_flags,
        dataset_baseline:    result.dataset_baseline,
        document_type:       result.document_type,
        document_inspection: result.document_inspection,
        auditor_comment:     auditorComment || null,
      },
      keywords:        result.missing_fields || [],
      recommendations: result.recommendations || [],
      riskFactors:     { level: result.risk_level, flags: result.fraud_flags || [] },
      confidence:      result.ai_validity_percentage !== undefined ? (result.ai_validity_percentage / 100) : 0.95,
      model:           result.engine || 'rule-based-v4',
      performedBy:     req.user?.id || null,
      completedAt:     new Date(),
    });

    await document.update({
      status: decision.status,
      ocrProcessed: Boolean(textToAnalyze) || document.ocrProcessed,
      metadata: {
        ...(document.metadata || {}),
        latestAuditDecision: decision,
        latestAuditSummary: result.summary,
        latestAuditorComment: auditorComment || null,
        latestComplianceScore: result.compliance_score,
        latestAiGeneratedPercentage: result.ai_generated_percentage,
        statusReason: decision.reason,
        statusTitle: decision.title,
        statusDetail: decision.detail,
        statusNextSteps: decision.nextSteps,
        statusCode: decision.code,
      },
      lastModifiedBy: req.user?.id || null,
      lastModifiedAt: new Date(),
    });

    try {
      await notifyAuditCompletion(req.app.locals.models, document, result, decision, req.user, auditorComment);
    } catch (notifyError) {
      console.warn('Audit completion notification failed:', notifyError.message);
    }

    res.json({
      message:  'Document analysis complete',
      engine:   result.engine,
      analysis: {
        documentId,
        documentTitle:    document.title,
        documentType:     result.document_type,
        compliance_score: result.compliance_score,
        ai_generated_percentage: result.ai_generated_percentage,
        ai_threshold_exceeded: result.ai_threshold_exceeded,
        ai_validity_percentage: result.ai_validity_percentage,
        missing_fields:   result.missing_fields,
        extracted_fields: result.extracted_fields,
        inconsistencies:  result.inconsistencies,
        violations:       result.violations,
        fraud_flags:      result.fraud_flags,
        recommendations:  result.recommendations || [],
        ml_training:      result.organization_training && result.organization_training.ml_training,
        sentiment:        result.sentiment,
        risk_level:       result.risk_level,
        riskLevel:        result.risk_level,
        summary:          result.summary,
        policy_rules_checked: result.policy_rules_checked,
        engine:           result.engine,
        dataset_baseline: result.dataset_baseline,
        decision,
        document_inspection: result.document_inspection,
        auditor_comment: auditorComment || null,
        analyzedAt:       new Date(),
      },
    });
  } catch (error) {
    console.error('Analyze document error:', error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
};

// ── POST /api/analysis/text — analyze raw pasted/uploaded text ────────────────

const analyzeText = async (req, res) => {
  try {
    if (req.user?.role !== 'auditor') {
      return res.status(403).json({ error: 'Only approved auditors can run document audits.' });
    }

    const { text, policyRules } = req.body;
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: 'text is required (min 10 characters)' });
    }

    const result = await aiService.auditDocument(text, policyRules || []);

    res.json({
      message: 'Text analysis complete',
      engine:  result.engine,
      result,
    });
  } catch (error) {
    console.error('Analyze text error:', error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
};

// ── POST /api/analysis/parse — extract metadata ───────────────────────────────

const parseDocumentText = async (req, res) => {
  try {
    if (req.user?.role !== 'auditor') {
      return res.status(403).json({ error: 'Only approved auditors can parse audit documents.' });
    }

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const result = await aiService.parseDocument(text);
    res.json({ message: 'Document parsed', engine: result.engine, metadata: result });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Parse failed' });
  }
};

// ── GET /api/analysis/:documentId/insights ────────────────────────────────────

const getDocumentInsights = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { Document, DocumentAnalysis } = req.app.locals.models;
    const document = await Document.findByPk(documentId);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    const isOwner = document.uploadedBy === req.user?.id;
    if (!['administrator', 'auditor'].includes(req.user?.role) && !isOwner) {
      return res.status(403).json({ error: 'Access denied to this document analysis' });
    }
    const analysis = await DocumentAnalysis.findOne({ where: { documentId } });
    if (!analysis) return res.status(404).json({ error: 'No analysis found. Run analysis first.' });
    res.json({
      documentId,
      riskLevel:       analysis.riskFactors?.level || 'low',
      summary:         analysis.summary,
      recommendations: analysis.recommendations,
      results:         analysis.results,
      auditorComment:  analysis.results?.auditor_comment || null,
      analyzedAt:      analysis.completedAt,
      confidenceScore: Math.round((analysis.confidence || 0.95) * 100),
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch insights' });
  }
};

// ── POST /api/analysis/bulk/analyze ──────────────────────────────────────────

const bulkAnalyze = async (req, res) => {
  try {
    if (req.user?.role !== 'auditor') {
      return res.status(403).json({ error: 'Only approved auditors can run document audits.' });
    }

    const { documentIds } = req.body;
    const { Document, DocumentAnalysis } = req.app.locals.models;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'documentIds array is required' });
    }

    const results = [];
    for (const docId of documentIds) {
      try {
        const doc = await Document.findByPk(docId);
        if (!doc) { results.push({ documentId: docId, status: 'not_found' }); continue; }

        let text = null;
        if (doc.filePath) {
          text = await extractTextFromFile(doc.filePath, doc.mimeType);
          if (text) await doc.update({ extractedText: text.slice(0, 10000) });
        }
        if (!text) text = doc.extractedText;
        if (!text || text.trim().length < 25) {
          results.push({
            documentId: docId,
            status: 'failed',
            error: 'Could not read PDF content (file name is not used for audit).',
          });
          continue;
        }

        const result = await aiService.auditDocument(text, [], { contentOnly: true });

        await DocumentAnalysis.upsert({
          documentId: docId,
          analysisType:    'compliance_audit',
          status:          'completed',
          summary:         result.summary       || '',
          results: {
            compliance_score: result.compliance_score,
            ai_generated_percentage: result.ai_generated_percentage,
            ai_threshold_exceeded: result.ai_threshold_exceeded,
            ai_validity_percentage: result.ai_validity_percentage,
            risk_level:       result.risk_level,
            missing_fields:   result.missing_fields,
            violations:       result.violations,
            dataset_baseline: result.dataset_baseline,
          },
          keywords:        result.missing_fields || [],
          recommendations: result.recommendations || [],
          riskFactors:     { level: result.risk_level },
          confidence:      result.ai_validity_percentage !== undefined ? (result.ai_validity_percentage / 100) : 0.95,
          model:           result.engine || 'rule-based-v2',
          performedBy:     req.user?.id || null,
          completedAt:     new Date(),
        });

        results.push({
          documentId: docId,
          status:     'success',
          riskLevel:  result.risk_level,
          score:      result.compliance_score,
          ai_generated_percentage: result.ai_generated_percentage,
          ai_threshold_exceeded: result.ai_threshold_exceeded,
          ai_validity_percentage: result.ai_validity_percentage,
          engine:     result.engine,
        });
      } catch (err) {
        results.push({ documentId: docId, status: 'error', error: err.message });
      }
    }

    res.json({
      message:    'Bulk analysis complete',
      successful: results.filter(r => r.status === 'success').length,
      failed:     results.filter(r => r.status === 'error').length,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Bulk analysis failed' });
  }
};

// ── GET /api/analysis/:documentId/status ─────────────────────────────────────

const getAnalysisStatus = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { Document, DocumentAnalysis } = req.app.locals.models;
    const document = await Document.findByPk(documentId);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    const isOwner = document.uploadedBy === req.user?.id;
    if (!['administrator', 'auditor'].includes(req.user?.role) && !isOwner) {
      return res.status(403).json({ error: 'Access denied to this document analysis' });
    }
    const analysis = await DocumentAnalysis.findOne({ where: { documentId } });
    if (!analysis) return res.status(404).json({ error: 'No analysis found' });
    res.json({ documentId, status: 'completed', progress: 100, analysis });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch status' });
  }
};

// ── GET /api/analysis/trend/history ──────────────────────────────────────────

const getAnalysisTrend = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const { Document, DocumentAnalysis } = req.app.locals.models;
    const options = {
      where: { completedAt: { [Op.gte]: new Date(Date.now() - days * 86400000) } },
      order: [['completedAt', 'ASC']],
    };
    if (['viewer', 'document_manager'].includes(req.user?.role)) {
      options.include = [{
        model: Document,
        attributes: [],
        required: true,
        where: { uploadedBy: req.user.id },
      }];
    }
    const analyses = await DocumentAnalysis.findAll(options);
    const trendData = {};
    analyses.forEach(a => {
      const date = a.completedAt?.toISOString().split('T')[0];
      if (!date) return;
      if (!trendData[date]) trendData[date] = { total: 0, highRisk: 0 };
      trendData[date].total++;
      if ((a.riskFactors?.level || a.results?.risk_level) === 'high') trendData[date].highRisk++;
    });
    res.json({ data: Object.entries(trendData).map(([date, s]) => ({ date, ...s })), totalAnalyzed: analyses.length });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch trend' });
  }
};

// ── GET /api/analysis/stats/overview ─────────────────────────────────────────

const getAnalysisStats = async (req, res) => {
  try {
    const { Document, DocumentAnalysis } = req.app.locals.models;
    const options = {};
    if (['viewer', 'document_manager'].includes(req.user?.role)) {
      options.include = [{
        model: Document,
        attributes: [],
        required: true,
        where: { uploadedBy: req.user.id },
      }];
    }
    const all = await DocumentAnalysis.findAll(options);
    res.json({
      totalAnalyzed:     all.length,
      averageConfidence: 95,
      riskDistribution: {
        high:   all.filter(a => (a.riskFactors?.level || a.results?.risk_level) === 'high').length,
        medium: all.filter(a => (a.riskFactors?.level || a.results?.risk_level) === 'medium').length,
        low:    all.filter(a => (a.riskFactors?.level || a.results?.risk_level || 'low') === 'low').length,
      },
      aiEngine: process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-key'
        ? 'openai+rules' : 'rule-based-v2',
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
};

module.exports = {
  analyzeDocument,
  analyzeText,
  parseDocumentText,
  getDocumentInsights,
  bulkAnalyze,
  getAnalysisStatus,
  getAnalysisTrend,
  getAnalysisStats,
};
