'use strict';
/**
 * Single-document audit analysis PDF export — same DocAudit AI layout as period audit reports.
 * Annotated mode: clean professional layout focused on scores and mistakes only.
 */
const PDFDocument = require('pdfkit');
const layout = require('./reportLayout');
const { buildAuditMarkup, violationText } = require('./auditMarkupService');

/** Flatten any markup / finding value to readable text (avoids [object Object]). */
function safeMarkupText(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    return (
      value.summary ||
      value.message ||
      value.title ||
      value.description ||
      value.detail ||
      value.text ||
      violationText(value) ||
      ''
    );
  }
  return String(value);
}

function riskLabel(level) {
  const map = { high: 'High', medium: 'Medium', low: 'Low' };
  return map[String(level || 'low').toLowerCase()] || 'Low';
}

function buildReportSections(document, analysis, auditorUser) {
  const results = analysis?.results || {};
  const meta = document.metadata || {};
  const decision = results.decision || meta.latestAuditDecision || {};
  const sections = [];

  sections.push({
    title: 'Executive Summary',
    lines: [
      analysis?.summary || meta.latestAuditSummary || 'No summary available for this document.',
      '',
      `Overall audit status: ${results.overall_audit_status || meta.latestOverallAuditStatus || '—'}`,
      `Auditor decision: ${(decision.status || document.status || '—').replace(/_/g, ' ')}`,
      decision.reason ? `Decision reason: ${decision.reason}` : null,
    ].filter(Boolean),
  });

  sections.push({
    title: 'Key Metrics',
    lines: [
      `Compliance score: ${results.compliance_score ?? meta.latestComplianceScore ?? '—'}%`,
      `Overall audit score: ${results.overall_audit_score ?? meta.latestOverallAuditScore ?? '—'}%`,
      `Risk level: ${riskLabel(results.risk_level || analysis?.riskFactors?.level)}`,
      `AI-generated content: ${results.ai_generated_percentage ?? meta.latestAiGeneratedPercentage ?? '—'}%`,
      `Organization match: ${results.organization_match === true ? 'Yes' : results.organization_match === false ? 'No' : '—'}`,
    ],
  });

  const violations = results.violations || [];
  if (violations.length) {
    sections.push({
      title: 'Violations',
      lines: violations.map(v => `• ${safeMarkupText(v) || JSON.stringify(v)}`),
    });
  }

  const missing = results.missing_fields || [];
  if (missing.length) {
    sections.push({
      title: 'Missing Fields',
      lines: missing.map(f => `• ${safeMarkupText(f)}`),
    });
  }

  const recommendations = analysis?.recommendations || [];
  if (recommendations.length) {
    sections.push({
      title: 'Recommendations',
      lines: recommendations.map(r => `• ${safeMarkupText(r)}`),
    });
  }

  const comment = results.auditor_comment || meta.latestAuditorComment;
  if (comment) {
    sections.push({
      title: 'Auditor Comments',
      lines: [safeMarkupText(comment)],
    });
  }

  sections.push({
    title: 'Document Details',
    lines: [
      `Category: ${document.category || '—'}`,
      `Department: ${document.department || '—'}`,
      `File: ${document.fileName || '—'}`,
      `Uploaded: ${layout.fmtDate(document.uploadedAt || document.createdAt)}`,
      `Analyzed: ${layout.fmtDate(analysis?.completedAt)}`,
      `Auditor: ${auditorUser?.fullName || auditorUser?.email || '—'}`,
    ],
  });

  return sections;
}

function normalizeMarkupItem(item, documentStatus) {
  const text = safeMarkupText(item?.text) || safeMarkupText(item) || 'Issue noted';
  return {
    type: String(item?.type || 'issue').replace(/_/g, ' '),
    severity: String(item?.severity || 'MEDIUM').toUpperCase(),
    text,
    location: item?.location ? safeMarkupText(item.location) : null,
    status: String(item?.status || documentStatus || '').replace(/_/g, ' '),
  };
}

/**
 * Annotated PDF body: scores + mistakes only, neutral professional styling.
 */
function renderAnnotatedPdfBody(doc, ctx, startY) {
  const { document, analysis, annotated = false } = ctx;
  const results = analysis?.results || {};
  const meta = document.metadata || {};
  const complianceScore = Number(results.compliance_score ?? meta.latestComplianceScore ?? 0);
  const overallScore = Number(results.overall_audit_score ?? meta.latestOverallAuditScore ?? complianceScore);
  const documentStatus = document.status || meta.latestAuditDecision?.status || 'in_progress';
  const rawMarkup = meta.auditMarkup
    || buildAuditMarkup(analysis, documentStatus, document.extractedText || '');
  const markup = (rawMarkup || []).map(item => normalizeMarkupItem(item, documentStatus));

  let y = startY;
  const pageBottom = () => doc.page.height - 60;
  const ink = layout.COLORS.text;
  const body = layout.COLORS.body;
  const muted = layout.COLORS.muted;
  const line = layout.COLORS.line;

  const ensureSpace = (needed) => {
    if (y + needed > pageBottom()) {
      doc.addPage();
      y = 50;
    }
  };

  const writeText = (text, opts = {}) => {
    const {
      x = 50,
      width = 495,
      fontSize = 9,
      font = 'Helvetica',
      color = body,
      lineGap = 3,
      spacing = 6,
    } = opts;
    const content = String(text || '').slice(0, 4000);
    if (!content.trim()) return;
    doc.fontSize(fontSize).font(font).fillColor(color);
    const height = doc.heightOfString(content, { width, lineGap });
    ensureSpace(height + spacing);
    doc.text(content, x, y, { width, lineGap });
    y += height + spacing;
  };

  const sectionRule = () => {
    ensureSpace(12);
    doc.moveTo(50, y).lineTo(545, y).strokeColor(line).lineWidth(0.75).stroke();
    y += 14;
  };

  const renderScoreRow = (label, score) => {
    const value = Math.min(100, Math.max(0, Math.round(Number(score) || 0)));
    ensureSpace(36);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(ink).text(label, 50, y);
    doc.fontSize(10).font('Helvetica').fillColor(ink)
      .text(`${value}%`, 50, y, { width: 495, align: 'right' });
    y += 16;
    const barWidth = Math.round((value / 100) * 495);
    doc.rect(50, y, 495, 8).fillColor('#f3f4f6').fill();
    doc.rect(50, y, barWidth, 8).fillColor('#1f3a5f').fill();
    y += 22;
  };

  // ── Status (plain text, no colored banner) ──
  ensureSpace(28);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(ink)
    .text('Audit status', 50, y);
  doc.fontSize(10).font('Helvetica').fillColor(body)
    .text(String(documentStatus).replace(/_/g, ' '), 160, y);
  y += 20;
  sectionRule();

  // ── Scores ──
  doc.fontSize(11).font('Helvetica-Bold').fillColor(ink).text('Scores', 50, y);
  y += 18;
  renderScoreRow('Compliance score', complianceScore);
  renderScoreRow('Overall audit score', overallScore);
  sectionRule();

  // ── Mistakes only (annotated) ──
  if (annotated) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(ink).text('Mistakes', 50, y);
    y += 8;
    doc.fontSize(8).font('Helvetica').fillColor(muted)
      .text(markup.length ? `${markup.length} item(s) marked for review` : 'No mistakes flagged.', 50, y + 6);
    y += 22;

    if (!markup.length) {
      writeText('Document passed audit checks with no marked mistakes.', {
        fontSize: 9,
        color: body,
        spacing: 8,
      });
    } else {
      markup.forEach((item, i) => {
        ensureSpace(56);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(ink)
          .text(`${i + 1}. ${item.type.toUpperCase()} · ${item.severity}`, 50, y);
        y += 13;
        writeText(item.text, { fontSize: 9, font: 'Helvetica', color: body, spacing: 4 });
        if (item.location) {
          writeText(`Location: ${item.location}`, { fontSize: 8, color: muted, spacing: 4 });
        }
        if (item.status) {
          writeText(`Status: ${item.status}`, { fontSize: 8, color: muted, spacing: 10 });
        }
        if (i < markup.length - 1) {
          doc.moveTo(50, y).lineTo(545, y).strokeColor(line).lineWidth(0.5).stroke();
          y += 10;
        }
      });
    }
    return y;
  }

  // ── Full analysis (non-annotated exports) ──
  const sections = buildReportSections(document, analysis, ctx.auditorUser);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(ink).text('Analysis', 50, y);
  y += 18;

  sections.forEach(section => {
    writeText(section.title, { fontSize: 10, font: 'Helvetica-Bold', color: ink, spacing: 4 });
    (section.lines || []).forEach(line => {
      writeText(line, { fontSize: 9, font: 'Helvetica', color: body, spacing: 4 });
    });
    y += 6;
  });

  return y;
}

function streamDocumentAnalysisPdf(res, ctx) {
  const { document, analysis, preparedBy, auditorUser, exportedByRole } = ctx;
  const annotated = ctx.annotated !== false && (ctx.annotated === true || ctx.format === 'annotated');
  const isClient = String(exportedByRole || '').toLowerCase() === 'client';
  const meta = document.metadata || {};
  const reportTitle = annotated
    ? `Annotated Audit — ${document.title || document.fileName}`
    : `Document Audit Analysis — ${document.title || document.fileName}`;
  const analyzedAt = analysis?.completedAt || meta.latestAuditDecision?.updatedAt || new Date();
  const generatedBy = preparedBy
    || (auditorUser && (auditorUser.fullName || auditorUser.email))
    || 'System';

  const pdf = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  const safeName = (document.title || document.fileName || 'document').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40);
  const prefix = annotated ? 'annotated_audit_' : 'audit_analysis_';
  res.setHeader('Content-Disposition', `attachment; filename="${prefix}${safeName}.pdf"`);
  pdf.pipe(res);

  const detailPairs = [
    ['Report Type', annotated ? 'Annotated Audit' : 'Document Audit Analysis'],
    ['Document', document.title || document.fileName],
    ['Status', (document.status || '—').replace(/_/g, ' ')],
  ];
  if (!isClient) {
    detailPairs.push(['Generated by', generatedBy]);
  }
  detailPairs.push(['Date Generated', layout.fmtDate(analyzedAt)]);

  let y = layout.drawHeader(pdf);
  y = layout.drawReportDetails(pdf, y, detailPairs, reportTitle, { minimal: annotated || isClient });
  y = layout.drawCenteredTitle(pdf, y, `${reportTitle} – ${layout.monthYear(analyzedAt)}`);

  y = renderAnnotatedPdfBody(pdf, { ...ctx, annotated }, y);

  if (!isClient) {
    layout.drawSignatureBlock(pdf, y);
  }
  layout.drawFooter(pdf);
  pdf.end();
}

function streamDocumentAnalysisPdfLegacy(res, { document, analysis, preparedBy, auditorUser }) {
  streamDocumentAnalysisPdf(res, { document, analysis, preparedBy, auditorUser, annotated: false });
}

module.exports = {
  buildReportSections,
  streamDocumentAnalysisPdf,
  streamDocumentAnalysisPdfLegacy,
  safeMarkupText,
};
