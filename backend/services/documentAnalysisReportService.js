'use strict';
/**
 * Single-document audit analysis PDF export — same DocAudit AI layout as period audit reports.
 * Annotated mode highlights mistakes in red for document manager review.
 */
const PDFDocument = require('pdfkit');
const layout = require('./reportLayout');
const { buildAuditMarkup } = require('./auditMarkupService');
function scoreColor(score) {
  if (score >= 80) return layout.COLORS.good;
  if (score >= 60) return layout.COLORS.warn;
  return layout.COLORS.danger;
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
      lines: violations.map(v => `• ${typeof v === 'string' ? v : v.message || JSON.stringify(v)}`),
    });
  }

  const missing = results.missing_fields || [];
  if (missing.length) {
    sections.push({
      title: 'Missing Fields',
      lines: missing.map(f => `• ${f}`),
    });
  }

  const recommendations = analysis?.recommendations || [];
  if (recommendations.length) {
    sections.push({
      title: 'Recommendations',
      lines: recommendations.map(r => `• ${r}`),
    });
  }

  const comment = results.auditor_comment || meta.latestAuditorComment;
  if (comment) {
    sections.push({
      title: 'Auditor Comments',
      lines: [comment],
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

function statusBadgeColor(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved' || s === 'reviewed') return layout.COLORS.good;
  if (s === 'changes_requested') return layout.COLORS.warn;
  if (s === 'rejected') return layout.COLORS.danger;
  return layout.COLORS.muted;
}

function renderAnnotatedPdfBody(doc, ctx, startY) {
  const { document, analysis, auditorUser, annotated = false } = ctx;
  const results = analysis?.results || {};
  const meta = document.metadata || {};
  const complianceScore = results.compliance_score ?? meta.latestComplianceScore ?? 0;
  const overallScore = results.overall_audit_score ?? meta.latestOverallAuditScore ?? complianceScore;
  const documentStatus = document.status || meta.latestAuditDecision?.status || 'in_progress';
  const markup = meta.auditMarkup || buildAuditMarkup(analysis, documentStatus);

  let y = startY;
  const pageBottom = () => doc.page.height - 60;
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
      color = layout.COLORS.body,
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

  const renderScoreBar = (label, score) => {
    ensureSpace(50);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(layout.COLORS.text).text(label, 50, y);
    y += 18;
    const barWidth = Math.round((Math.min(100, Math.max(0, score)) / 100) * 495);
    doc.rect(50, y, 495, 14).fillColor('#f3f4f6').fill();
    doc.rect(50, y, barWidth, 14).fillColor(scoreColor(score)).fill();
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
      .text(`${score}%`, 50 + Math.max(barWidth - 28, 4), y + 2, { width: 30, align: 'right' });
    y += 30;
  };

  // ── Audit status banner ──
  ensureSpace(36);
  const statusLabel = String(documentStatus).replace(/_/g, ' ').toUpperCase();
  doc.rect(50, y, 495, 28).fillColor(statusBadgeColor(documentStatus)).fill();
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff')
    .text(`AUDIT STATUS: ${statusLabel}`, 50, y + 8, { width: 495, align: 'center' });
  y += 38;

  if (annotated && markup.length) {
    ensureSpace(30);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(layout.COLORS.danger)
      .text('MISTAKES MARKED FOR CORRECTION', 50, y);
    y += 18;
    doc.moveTo(50, y).lineTo(545, y).strokeColor(layout.COLORS.danger).lineWidth(2).stroke();
    y += 10;

    markup.forEach((item, i) => {
      ensureSpace(44);
      doc.rect(50, y, 495, 2).fillColor(layout.COLORS.danger).fill();
      y += 6;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(layout.COLORS.danger)
        .text(`✕ MARK ${i + 1} — ${String(item.type).replace(/_/g, ' ').toUpperCase()} [${item.severity}]`, 50, y);
      y += 14;
      writeText(item.text, { fontSize: 10, font: 'Helvetica-Bold', color: layout.COLORS.danger, spacing: 4 });
      if (item.location) {
        writeText(`Location: ${item.location}`, { fontSize: 8, color: layout.COLORS.muted, spacing: 4 });
      }
      writeText(`Status: ${String(item.status || documentStatus).replace(/_/g, ' ')}`, {
        fontSize: 8,
        color: layout.COLORS.muted,
        spacing: 8,
      });
    });
    y += 8;
  } else if (annotated) {
    ensureSpace(30);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(layout.COLORS.good)
      .text('No mistakes flagged — document passed audit checks.', 50, y);
    y += 24;
  }

  renderScoreBar('Compliance Score', complianceScore);
  renderScoreBar('Overall Audit Score', overallScore);

  const sections = buildReportSections(document, analysis, auditorUser);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(layout.COLORS.text).text('Analysis Report (attached)', 50, y);
  y += 20;

  sections.forEach(section => {
    writeText(section.title, { fontSize: 10, font: 'Helvetica-Bold', color: '#4f46e5', spacing: 4 });
    (section.lines || []).forEach(line => {
      const isMistakeLine = annotated && markup.some(m =>
        line.includes('•') && m.text && line.includes(String(m.text).slice(0, 20))
      );
      writeText(line, {
        fontSize: 9,
        font: isMistakeLine ? 'Helvetica-Bold' : 'Helvetica',
        color: isMistakeLine ? layout.COLORS.danger : layout.COLORS.body,
        spacing: 4,
      });
    });
    y += 6;
  });

  return y;
}

function streamDocumentAnalysisPdf(res, ctx) {
  const { document, analysis, preparedBy } = ctx;
  const annotated = ctx.annotated !== false && (ctx.annotated === true || ctx.format === 'annotated');
  const results = analysis?.results || {};
  const meta = document.metadata || {};
  const reportTitle = annotated
    ? `Annotated Audit — ${document.title || document.fileName}`
    : `Document Audit Analysis — ${document.title || document.fileName}`;
  const analyzedAt = analysis?.completedAt || meta.latestAuditDecision?.updatedAt || new Date();

  const pdf = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  const safeName = (document.title || document.fileName || 'document').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40);
  const prefix = annotated ? 'annotated_audit_' : 'audit_analysis_';
  res.setHeader('Content-Disposition', `attachment; filename="${prefix}${safeName}.pdf"`);
  pdf.pipe(res);

  let y = layout.drawHeader(pdf);
  y = layout.drawReportDetails(pdf, y, [
    ['Report Type', annotated ? 'Annotated Audit (mistakes marked)' : 'Document Audit Analysis'],
    ['Document', document.title || document.fileName],
    ['Status', (document.status || '—').replace(/_/g, ' ')],
    ['Date Generated', layout.fmtDate(analyzedAt)],
  ], reportTitle);
  y = layout.drawCenteredTitle(pdf, y, `${reportTitle} – ${layout.monthYear(analyzedAt)}`);

  y = renderAnnotatedPdfBody(pdf, { ...ctx, annotated }, y);

  layout.drawSignatureBlock(pdf, y);
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
};