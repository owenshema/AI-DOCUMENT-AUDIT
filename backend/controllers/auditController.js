/**
 * Audit Controller
 * AI-generated audit reports — OpenAI API + rule-based fallback
 */

const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');
const reportBuilder = require('../services/reportBuilderService');

const canAccessReport = (report, user) => {
  if (!user) return false;
  if (['administrator', 'auditor'].includes(user.role)) return true;
  return report.createdBy === user.id || report.scope?.userId === user.id || (report.scope?.ownerIds || []).includes(user.id);
};

const formatReportForClient = (report, user) => {
  const plain = report.toJSON ? report.toJSON() : report;
  const role = user?.role || 'viewer';
  const structured = plain.metrics?.structuredReport || plain.statistics?.structuredReport;
  return {
    ...plain,
    structured: structured ? reportBuilder.filterStructuredForRole(structured, role) : null,
    viewerRole: role,
    viewerRoleLabel: reportBuilder.ROLE_LABELS[role] || role,
  };
};

const generateAuditReport = async (req, res) => {
  try {
    const {
      title,
      reportType = 'compliance_audit',
      periodStart,
      periodEnd,
      scope = {},
    } = req.body;

    const { AuditReport, ComplianceCheck, Document, DocumentAnalysis } = req.app.locals.models;
    const { Op } = require('sequelize');
    const currentUser = req.user || {};
    const ownerScoped = ['viewer', 'document_manager'].includes(currentUser.role);

    if (!title || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'title, periodStart, and periodEnd are required' });
    }

    const start = new Date(periodStart);
    const end   = new Date(periodEnd);
    // Include the full end day
    end.setHours(23, 59, 59, 999);

    const dateRange = { [Op.between]: [start, end] };
    const documentWhere = { createdAt: dateRange };
    const activityWhere = { createdAt: dateRange };

    if (ownerScoped) {
      documentWhere.uploadedBy = currentUser.id;
    }

    // ── Pull real data for the period ────────────────────────────────────────

    // 1. Documents uploaded in period — include uploader info
    const documents = await Document.findAll({
      where: documentWhere,
      attributes: ['id', 'title', 'category', 'department', 'status', 'uploadedBy', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    const docIds = documents.map(d => d.id);
    if (ownerScoped) {
      activityWhere[Op.or] = [
        { userId: currentUser.id },
        ...(docIds.length > 0 ? [{ resourceType: 'document', resourceId: { [Op.in]: docIds } }] : []),
      ];
    }

    // 2. AI analyses run in period — include full results for accurate reporting
    const analysisWhere = { completedAt: dateRange };
    if (ownerScoped) analysisWhere.documentId = { [Op.in]: docIds };

    const analyses = await DocumentAnalysis.findAll({
      where: analysisWhere,
      attributes: ['id', 'documentId', 'riskFactors', 'results', 'summary', 'recommendations', 'performedBy', 'completedAt'],
      order: [['completedAt', 'DESC']],
    });

    // Also get ALL analyses ever for documents uploaded in this period (even if analyzed later)
    const analysesForDocs = docIds.length > 0 ? await DocumentAnalysis.findAll({
      where: { documentId: docIds },
      attributes: ['id', 'documentId', 'riskFactors', 'results', 'summary', 'recommendations', 'completedAt'],
      order: [['completedAt', 'DESC']],
    }) : [];

    // Merge: use period analyses + analyses for docs in period (deduplicated)
    const allAnalysesMap = {};
    [...analyses, ...analysesForDocs].forEach(a => { allAnalysesMap[a.id] = a; });
    const allAnalyses = Object.values(allAnalysesMap);

    // 3. Compliance checks in period
    const complianceWhere = { createdAt: dateRange };
    if (ownerScoped) complianceWhere.documentId = { [Op.in]: docIds };

    const complianceChecks = await ComplianceCheck.findAll({
      where: complianceWhere,
      attributes: ['id', 'documentId', 'status', 'complianceScore', 'findings', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    // ── Compute statistics ────────────────────────────────────────────────────

    const totalDocs      = documents.length;
    const totalAnalyses  = allAnalyses.length;
    const totalChecks    = complianceChecks.length;

    const passedChecks   = complianceChecks.filter(c => c.status === 'passed').length;
    const failedChecks   = complianceChecks.filter(c => c.status === 'failed').length;
    const passRate       = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

    // Risk levels from riskFactors.level or results.risk_level
    const getRisk = a => a.riskFactors?.level || a.results?.risk_level || 'low';
    const highRisk   = allAnalyses.filter(a => getRisk(a) === 'high').length;
    const medRisk    = allAnalyses.filter(a => getRisk(a) === 'medium').length;
    const lowRisk    = allAnalyses.filter(a => getRisk(a) === 'low').length;

    // Compliance scores from AI analyses (results.compliance_score)
    const analysisScores = allAnalyses
      .map(a => a.results?.compliance_score)
      .filter(s => typeof s === 'number' && s >= 0);
    const avgAnalysisScore = analysisScores.length > 0
      ? Math.round(analysisScores.reduce((s, x) => s + x, 0) / analysisScores.length)
      : null;

    // Compliance check scores
    const checkScores = complianceChecks.map(c => c.complianceScore).filter(s => typeof s === 'number' && s >= 0);
    const avgCheckScore = checkScores.length > 0
      ? Math.round(checkScores.reduce((s, x) => s + x, 0) / checkScores.length)
      : null;

    // Best available compliance score
    const avgComplianceScore = avgAnalysisScore ?? avgCheckScore ?? passRate ?? 0;

    // Collect all violations and missing fields from analyses
    const allViolations = [];
    const allMissingFields = [];
    const allRecommendations = [];
    allAnalyses.forEach(a => {
      if (Array.isArray(a.results?.violations)) allViolations.push(...a.results.violations);
      if (Array.isArray(a.results?.missing_fields)) allMissingFields.push(...a.results.missing_fields);
      if (Array.isArray(a.recommendations)) allRecommendations.push(...a.recommendations);
    });
    // Deduplicate
    const uniqueViolations = [...new Set(allViolations)].slice(0, 15);
    const uniqueMissing = [...new Set(allMissingFields)].slice(0, 10);
    const uniqueRecs = [...new Set(allRecommendations)].slice(0, 8);

    // Department breakdown
    const deptMap = {};
    documents.forEach(d => {
      const dept = d.department || 'Unknown';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    // Category breakdown
    const catMap = {};
    documents.forEach(d => {
      const cat = d.category || 'other';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });

    // Status breakdown
    const statusMap = {};
    documents.forEach(d => {
      const s = d.status || 'uploaded';
      statusMap[s] = (statusMap[s] || 0) + 1;
    });

    // Violations from compliance checks + AI analyses
    const violations = [
      ...uniqueViolations,
      ...complianceChecks
        .filter(c => c.status === 'failed')
        .flatMap(c => {
          if (Array.isArray(c.findings)) return c.findings.map(f => (typeof f === 'string' ? f : f.policyName || 'Policy violation'));
          return ['Policy violation'];
        }),
    ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 15);

    // ── Resolve user names for activity tracking ──────────────────────────────
    const { User, AuditLog } = req.app.locals.models;
    const allUserIds = [...new Set([
      ...documents.map(d => d.uploadedBy),
      ...allAnalyses.map(a => a.performedBy),
    ].filter(Boolean))];
    // ── Activity log for the period ───────────────────────────────────────────
    const activityLogs = await AuditLog.findAll({
      where: activityWhere,
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    activityLogs.forEach(l => {
      if (l.userId && !allUserIds.includes(l.userId)) allUserIds.push(l.userId);
    });
    const users = allUserIds.length > 0
      ? await User.findAll({ where: { id: allUserIds }, attributes: ['id', 'fullName', 'email', 'role'] })
      : [];
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u.fullName || u.email; });
    const getName = id => (id && userMap[id]) ? userMap[id] : 'System';

    // Build human-readable activity timeline
    const activityTimeline = [
      ...documents.map(d => ({
        time:   d.createdAt?.toISOString().split('T')[0],
        user:   getName(d.uploadedBy),
        action: `Uploaded document: "${d.title}" (${d.category}, ${d.department || 'No dept'})`,
        type:   'upload',
      })),
      ...allAnalyses.map(a => {
        const doc = documents.find(d => d.id === a.documentId);
        return {
          time:   a.completedAt?.toISOString().split('T')[0],
          user:   getName(a.performedBy),
          action: `AI audit run on "${doc?.title || 'document'}" — score: ${a.results?.compliance_score ?? '—'}/100, risk: ${a.riskFactors?.level || a.results?.risk_level || 'low'}`,
          type:   'analysis',
        };
      }),
      ...activityLogs
        .filter(l => ['login', 'post_documents', 'delete_document'].includes(l.action))
        .map(l => ({
          time:   l.createdAt?.toISOString().split('T')[0],
          user:   getName(l.userId),
          action: l.description || l.action.replace(/_/g, ' '),
          type:   l.action,
        })),
    ].sort((a, b) => (b.time || '').localeCompare(a.time || '')).slice(0, 50);

    // ── Build audit summary for AI report writer ──────────────────────────────

    const auditSummary = {
      title,
      reportType,
      period:           { start: periodStart, end: periodEnd },
      compliance_score: avgComplianceScore,
      document_type:    reportType,

      // Real counts
      total_documents:  totalDocs,
      total_analyses:   totalAnalyses,
      total_checks:     totalChecks,
      passed_checks:    passedChecks,
      failed_checks:    failedChecks,
      pass_rate:        passRate,

      // Risk breakdown
      risk_distribution: { high: highRisk, medium: medRisk, low: lowRisk },

      // Breakdowns
      departments:  deptMap,
      categories:   catMap,
      doc_statuses: statusMap,

      // Findings from actual AI analyses
      violations:       violations,
      missing_fields:   uniqueMissing,
      inconsistencies:  [],
      recommendations:  uniqueRecs.length > 0 ? uniqueRecs : [
        ...(failedChecks > 0 ? [`Review ${failedChecks} failed compliance check(s) and remediate violations`] : []),
        ...(highRisk > 0     ? [`Escalate ${highRisk} high-risk document(s) for immediate review`] : []),
        ...(passRate < 80    ? ['Strengthen document review processes to improve compliance rate'] : ['Maintain current compliance standards']),
        ...(totalDocs === 0  ? ['No documents were uploaded in this period — ensure document ingestion is active'] : []),
      ],

      summary: `${reportType.replace(/_/g, ' ')} audit for the period ${periodStart} to ${periodEnd}. ` +
        `${totalDocs} document(s) uploaded, ${totalAnalyses} AI analysis run(s), ` +
        `${totalChecks} compliance check(s) performed with a ${passRate}% pass rate. ` +
        `Average compliance score: ${avgComplianceScore}/100. ` +
        `Risk distribution: ${highRisk} high, ${medRisk} medium, ${lowRisk} low.`,

      // Per-document details
      document_list: documents.slice(0, 20).map(d => {
        const analysis = allAnalyses.find(a => a.documentId === d.id);
        return {
          title:            d.title,
          category:         d.category,
          department:       d.department,
          status:           d.status,
          date:             d.createdAt?.toISOString().split('T')[0],
          compliance_score: analysis?.results?.compliance_score ?? null,
          risk_level:       analysis ? getRisk(analysis) : null,
          violations_count: analysis?.results?.violations?.length ?? 0,
          missing_fields:   analysis?.results?.missing_fields?.slice(0, 3) ?? [],
        };
      }),

      // Score breakdown per document for the report
      score_breakdown: analysisScores,
      engine: 'rule-based-v5-org-trained',
      _rawAnalyses: allAnalyses,

      // Activity log — who did what during this period
      activity_log: activityTimeline,
      generated_by: req.user ? req.user.fullName || req.user.email : 'System',
      generated_by_role: req.user?.role || 'system',
    };

    // ── Generate professional structured report ───────────────────────────────

    const aiReport = await aiService.generateAuditReport(auditSummary, {
      viewerRole: currentUser.role,
      ownerScoped,
    });
    const structured = aiReport.structured || reportBuilder.buildStructuredReport(auditSummary, {
      viewerRole: currentUser.role,
      ownerScoped,
    });
    const shortSummary = structured.sections?.find(s => s.id === 'executive')?.paragraphs?.[0]
      || auditSummary.summary;

    // ── Save report ───────────────────────────────────────────────────────────

    const notifiedOwners = [...new Set(documents.map(d => d.uploadedBy).filter(Boolean))]
      .filter(ownerId => ownerId !== currentUser.id);

    const orgStats = structured.organizationValidation || {};

    const report = await AuditReport.create({
      id:               uuidv4(),
      reportType,
      title,
      description:      `${structured.meta?.reportTypeLabel || reportType} · ${structured.meta?.scopeLabel || 'Organization'} · ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
      status:           'published',
      periodStart:      start,
      periodEnd:        end,
      scope: ownerScoped ? { ...scope, userId: currentUser.id, ownerScope: currentUser.role } : { ...scope, ownerIds: notifiedOwners },
      findings:         complianceChecks.map(c => ({
        checkId:         c.id,
        documentId:      c.documentId,
        status:          c.status,
        score:           c.complianceScore,
      })),
      summary:          shortSummary?.slice(0, 2000) || auditSummary.summary,
      riskSummary:      structured.riskSummary || { high: highRisk, medium: medRisk, low: lowRisk },
      recommendations:  structured.recommendations || uniqueRecs,
      metrics: {
        totalDocuments:  totalDocs,
        totalAnalyses,
        totalChecks,
        passedChecks,
        failedChecks,
        passRate,
        avgComplianceScore,
        riskDistribution: { high: highRisk, medium: medRisk, low: lowRisk },
        departments:      deptMap,
        categories:       catMap,
        organizationValidation: orgStats,
        structuredReport: structured,
        reportEngine: aiReport.engine,
      },
      statistics: {
        compliance: structured.compliance,
        documentList: auditSummary.document_list,
        violations: uniqueViolations,
        missingFields: uniqueMissing,
        structuredReport: structured,
      },
      complianceScore:  avgComplianceScore,
      executiveSummary: aiReport.report_text,
      publishedAt:      new Date(),
      createdBy:        currentUser.id,
    });

    if (notifiedOwners.length > 0) {
      const { Notification, User } = req.app.locals.models;
      const owners = await User.findAll({ where: { id: notifiedOwners }, attributes: ['id', 'email', 'fullName'] });
      await Promise.all(owners.map(async owner => {
        await Notification.create({
          recipientId: owner.id,
          notificationType: 'audit_report_ready',
          priority: 'medium',
          subject: 'Audit report ready',
          message: `An audit report is ready to view: "${report.title}".`,
          details: { reportId: report.id, reportType, periodStart, periodEnd },
          relatedEntityType: 'audit_report',
          relatedEntityId: report.id,
          actionUrl: '/audit-reports',
          status: 'unread',
          sentAt: new Date(),
          deliveryStatus: 'sent',
        });

        await emailService.sendEmail({
          to: owner.email,
          subject: `Audit report ready: ${report.title}`,
          text: `Hi ${owner.fullName || owner.email},\n\nAn audit report has been updated in your portal.\nPeriod: ${periodStart} to ${periodEnd}\n\nLog in to view the changes: ${process.env.PORTAL_URL || 'http://localhost:3000/audit-reports'}`,
          html: `<p>Hi <strong>${owner.fullName || owner.email}</strong>,</p><p>An audit report has been updated in your portal.</p><p>Period: ${periodStart} to ${periodEnd}</p><p><a href="${process.env.PORTAL_URL || 'http://localhost:3000/audit-reports'}">Log in to view the changes</a></p>`,
        });
      }));
    }

    res.status(201).json({
      message:    'Audit report generated successfully',
      report:     formatReportForClient(report, req.user),
      aiEngine:   aiReport.engine,
      reportText: aiReport.report_text,
      structured,
      statistics: {
        period:           { start: periodStart, end: periodEnd },
        totalDocuments:   totalDocs,
        totalAnalyses,
        totalChecks,
        passRate,
        avgComplianceScore,
        riskDistribution: { high: highRisk, medium: medRisk, low: lowRisk },
      },
    });
  } catch (error) {
    console.error('Generate audit report error:', error);
    res.status(500).json({ error: error.message || 'Report generation failed' });
  }
};

const getAuditReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { AuditReport } = req.app.locals.models;

    const report = await AuditReport.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (!canAccessReport(report, req.user)) {
      return res.status(403).json({ error: 'Access denied to this report' });
    }

    res.json(formatReportForClient(report, req.user));
  } catch (error) {
    console.error('Get audit report error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch report' });
  }
};

const listAuditReports = async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;
    const { AuditReport } = req.app.locals.models;
    const { Op } = require('sequelize');

    const where = {};
    if (status) where.status = status;
    if (['viewer', 'document_manager'].includes(req.user?.role)) {
      where[Op.or] = [
        { createdBy: req.user.id },
        { scope: { [Op.contains]: { userId: req.user.id } } },
        { scope: { [Op.contains]: { ownerIds: [req.user.id] } } },
      ];
    }

    const { count, rows } = await AuditReport.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      reports: rows.map(r => formatReportForClient(r, req.user)),
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit),
      viewerRole: req.user?.role,
    });
  } catch (error) {
    console.error('List audit reports error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch reports' });
  }
};

const exportAuditReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { format = 'PDF' } = req.query;
    const { AuditReport, AuditLog, User } = req.app.locals.models;
    const { Op } = require('sequelize');

    const report = await AuditReport.findByPk(reportId, {
      include: [{ model: User, attributes: ['fullName', 'email', 'role'] }]
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (!canAccessReport(report, req.user)) {
      return res.status(403).json({ error: 'Access denied to this report' });
    }

    const ownerScoped = ['viewer', 'document_manager'].includes(req.user?.role);
    let reportDocIds = [];
    if (ownerScoped) {
      const ownerIds = [
        report.createdBy,
        report.scope?.userId,
        ...(Array.isArray(report.scope?.ownerIds) ? report.scope.ownerIds : []),
      ].filter(Boolean);

      reportDocIds = (report.findings || [])
        .map(f => f.documentId)
        .filter(Boolean);

      if (reportDocIds.length === 0 && ownerIds.length > 0) {
        const { Document } = req.app.locals.models;
        const ownerDocs = await Document.findAll({
          where: {
            uploadedBy: { [Op.in]: ownerIds },
            createdAt: { [Op.between]: [report.periodStart, report.periodEnd] },
          },
          attributes: ['id'],
        });
        reportDocIds = ownerDocs.map(d => d.id);
      }
    }

    // Fetch activities for the period. Viewer and document manager exports stay
    // scoped to their account and document portal instead of system-wide logs.
    const logWhere = {
      createdAt: {
        [Op.between]: [report.periodStart, report.periodEnd]
      }
    };
    if (ownerScoped) {
      logWhere[Op.or] = [
        { userId: req.user.id },
        ...(reportDocIds.length > 0 ? [{ resourceType: 'document', resourceId: { [Op.in]: reportDocIds } }] : []),
      ];
    }

    const logs = await AuditLog.findAll({
      where: logWhere,
      include: [{ model: User, attributes: ['fullName', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    const activitiesList = logs.map(log => {
      const userName = log.User ? log.User.fullName : 'System';
      const userRole = log.User ? `(${log.User.role})` : '';
      const dateStr = new Date(log.createdAt).toLocaleDateString();
      const desc = log.description || log.action.replace(/_/g, ' ');
      return `[${dateStr}] ${userName} ${userRole}: ${desc}`;
    });

    const fmt = format.toUpperCase();

    // ── Plain text / "Word" export ──────────────────────────────────────────
    if (fmt === 'TXT' || fmt === 'WORD' || fmt === 'EXCEL') {
      const lines = [
        '='.repeat(60),
        `AUDIT REPORT`,
        '='.repeat(60),
        '',
        `Title       : ${report.title}`,
        `Type        : ${report.reportType}`,
        `Status      : ${report.status}`,
        `Period      : ${report.periodStart ? new Date(report.periodStart).toLocaleDateString() : '—'} to ${report.periodEnd ? new Date(report.periodEnd).toLocaleDateString() : '—'}`,
        `Compliance  : ${report.complianceScore ?? '—'}%`,
        `Generated By: ${report.User ? report.User.fullName : 'System'} (${report.User ? report.User.role : 'system'})`,
        `Generated   : ${new Date(report.createdAt).toLocaleString()}`,
        '',
        '='.repeat(60),
        'REPORT CONTENT',
        '='.repeat(60),
        '',
        report.executiveSummary || 'No AI-generated content available for this report.',
        '',
        '='.repeat(60),
        'ACTIVITY TIMELINE',
        '='.repeat(60),
        '',
        activitiesList.length > 0 ? activitiesList.join('\n') : 'No activities recorded during this period.',
        '',
        '='.repeat(60),
        `Super International Freight / SIFCO — DocAudit AI  |  Exported ${new Date().toLocaleString()}`,
      ];

      const content = lines.join('\n');
      const ext = fmt === 'EXCEL' ? 'csv' : 'txt';
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit_report_${reportId.slice(0, 8)}.${ext}"`);
      return res.send(content);
    }

    // ── PDF export ──────────────────────────────────────────────────────────
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="audit_report_${reportId.slice(0, 8)}.pdf"`);
    doc.pipe(res);

    // Header bar
    doc.rect(0, 0, doc.page.width, 80).fill('#1a1d24');
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
      .text('AUDIT REPORT', 50, 25);
    doc.fillColor('#a5b4fc').fontSize(10).font('Helvetica')
      .text('DocAudit AI  ·  Super International Freight / SIFCO', 50, 52);

    // Reset color
    doc.fillColor('#1a1d24');
    let y = 110;

    // Meta table
    const meta = [
      ['Title',            report.title],
      ['Report Type',      (report.reportType || '').replace(/_/g, ' ')],
      ['Status',           report.status],
      ['Period',           `${report.periodStart ? new Date(report.periodStart).toLocaleDateString() : '—'} to ${report.periodEnd ? new Date(report.periodEnd).toLocaleDateString() : '—'}`],
      ['Compliance Score', `${report.complianceScore ?? '—'}%`],
      ['Documents',        `${report.metrics?.totalDocuments ?? 0} uploaded`],
      ['AI Analyses',      `${report.metrics?.totalAnalyses ?? 0} run`],
      ['Checks',           `${report.metrics?.totalChecks ?? 0} (${report.metrics?.passRate ?? 0}% pass rate)`],
      ['Generated By',     `${report.User ? report.User.fullName : 'System'} (${report.User ? report.User.role : 'system'})`],
      ['Generated Date',   new Date(report.createdAt).toLocaleString()],
    ];

    doc.fontSize(11).font('Helvetica-Bold').text('Report Details', 50, y);
    y += 18;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 10;

    meta.forEach(([key, val]) => {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text(key, 50, y, { width: 130 });
      doc.fontSize(9).font('Helvetica').fillColor('#111827').text(String(val || '—'), 185, y, { width: 360 });
      y += 18;
    });

    y += 10;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 20;

    // Compliance score visual
    const score = report.complianceScore ?? 0;
    const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    const barWidth = Math.round((score / 100) * 495);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1d24').text('Compliance Score', 50, y);
    y += 18;
    doc.rect(50, y, 495, 14).fillColor('#f3f4f6').fill();
    doc.rect(50, y, barWidth, 14).fillColor(scoreColor).fill();
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
      .text(`${score}%`, 50 + barWidth - 28, y + 2, { width: 30, align: 'right' });
    y += 30;

    const structured = report.metrics?.structuredReport;

    const renderPdfSection = (title, bodyLines) => {
      if (y > doc.page.height - 100) { doc.addPage(); y = 50; }
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#4f46e5').text(title, 50, y, { width: 495 });
      y += 16;
      (bodyLines || []).forEach(line => {
        if (y > doc.page.height - 80) { doc.addPage(); y = 50; }
        doc.fontSize(9).font('Helvetica').fillColor('#374151').text(String(line).slice(0, 500), 50, y, { width: 495 });
        y += 14;
      });
      y += 8;
    };

    if (structured?.sections?.length) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1d24').text('Report Sections', 50, y);
      y += 20;
      structured.sections.forEach(section => {
        const lines = [];
        (section.paragraphs || []).forEach(p => lines.push(p));
        (section.highlights || []).forEach(h => lines.push(`${h.label}: ${h.value}`));
        (section.metrics || []).forEach(m => lines.push(`${m.label}: ${m.value}`));
        (section.bullets || []).forEach(b => lines.push(`• ${b}`));
        (section.numbered || []).forEach((r, i) => lines.push(`${i + 1}. ${r}`));
        (section.violations || []).forEach(v => lines.push(`• ${v}`));
        if (section.narrative) lines.push(section.narrative);
        renderPdfSection(section.title, lines);
      });
    } else if (report.executiveSummary) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1d24').text('Report Content', 50, y);
      y += 18;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
      y += 12;

      const sections = report.executiveSummary.split(/\n(?=\d+\.|[A-Z]{2,})/);
      sections.forEach(section => {
        const lines = section.trim().split('\n');
        lines.forEach(line => {
          if (!line.trim()) { y += 6; return; }
          if (y > doc.page.height - 80) { doc.addPage(); y = 50; }
          const isHeading = /^\d+\.|^[A-Z\s]{4,}:?$/.test(line.trim());
          if (isHeading) {
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#4f46e5').text(line.trim(), 50, y, { width: 495 });
            y += 16;
          } else {
            doc.fontSize(9).font('Helvetica').fillColor('#374151').text(line.trim(), 50, y, { width: 495 });
            y += 14;
          }
        });
      });
    } else {
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
        .text('No AI-generated content available for this report.', 50, y);
      y += 20;
    }

    // Activity timeline section in PDF
    if (y > doc.page.height - 120) {
      doc.addPage();
      y = 50;
    }
    y += 15;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1d24').text('Activity Timeline (Who Did What)', 50, y);
    y += 18;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 12;

    if (activitiesList.length > 0) {
      activitiesList.forEach(act => {
        if (y > doc.page.height - 80) {
          doc.addPage();
          y = 50;
        }
        doc.fontSize(8).font('Helvetica').fillColor('#374151').text(act, 50, y, { width: 495 });
        y += 14;
      });
    } else {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#6b7280').text('No activities recorded during this period.', 50, y);
      y += 20;
    }

    // Footer
    const footerY = doc.page.height - 40;
    doc.rect(0, footerY - 10, doc.page.width, 50).fill('#f9fafb');
    doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
      .text(`Super International Freight / SIFCO  ·  DocAudit AI  ·  Exported ${new Date().toLocaleString()}  ·  CONFIDENTIAL`, 50, footerY, { align: 'center', width: 495 });

    doc.end();
  } catch (error) {
    console.error('Export audit report error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Export failed' });
    }
  }
};

const scheduleAuditReport = async (req, res) => {
  try {
    const { title, frequency, reportType, recipients, scope } = req.body;

    if (!title || !frequency || !reportType) {
      return res.status(400).json({ error: 'title, frequency, and reportType required' });
    }

    // Schedule record (in production, use job scheduler like Node-cron or Bull)
    const schedule = {
      id: uuidv4(),
      title,
      frequency, // 'daily', 'weekly', 'monthly'
      reportType,
      recipients: recipients || [],
      scope: scope || {},
      createdBy: req.user?.id || 'system',
      createdAt: new Date(),
      nextRunDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'active'
    };

    res.status(201).json({
      message: 'Scheduled audit report created',
      schedule
    });
  } catch (error) {
    console.error('Schedule audit report error:', error);
    res.status(500).json({ error: error.message || 'Scheduling failed' });
  }
};

const distributeAuditReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { recipients, format = 'PDF', deliveryMethod = 'email' } = req.body;
    const { AuditReport } = req.app.locals.models;

    const report = await AuditReport.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // In production, queue distribution jobs
    res.json({
      message: 'Report distribution initiated',
      reportId,
      recipientCount: recipients?.length || 0,
      deliveryMethod,
      format,
      status: 'queued'
    });
  } catch (error) {
    console.error('Distribute audit report error:', error);
    res.status(500).json({ error: error.message || 'Distribution failed' });
  }
};

const archiveAuditReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { AuditReport } = req.app.locals.models;

    const report = await AuditReport.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await report.update({ status: 'archived' });

    res.json({
      message: 'Audit report archived successfully',
      reportId,
      archivedAt: new Date()
    });
  } catch (error) {
    console.error('Archive audit report error:', error);
    res.status(500).json({ error: error.message || 'Archive failed' });
  }
};

module.exports = {
  generateAuditReport,
  getAuditReport,
  listAuditReports,
  exportAuditReport,
  scheduleAuditReport,
  distributeAuditReport,
  archiveAuditReport
};
