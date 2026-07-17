'use strict';

/**
 * Build structured audit markup (red-mark items) from analysis results.
 * Used by document manager to see mistakes and by annotated PDF export.
 */

function violationText(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v.summary || v.message || v.title || JSON.stringify(v);
}

/** Keywords to locate a mistake inside document text. */
function extractSearchTerms(item) {
  const terms = [];
  if (item.location) terms.push(String(item.location));
  if (item.field) terms.push(String(item.field));
  if (item.check) terms.push(String(item.check));

  const quoted = String(item.text || '').match(/'([^']+)'|"([^"]+)"/g);
  if (quoted) {
    quoted.forEach(q => terms.push(q.replace(/['"]/g, '')));
  }

  const text = String(item.text || '');
  const fieldLabels = [
    'TIN', 'B/L', 'Bill of Lading', 'Invoice', 'Container', 'Vessel', 'Voyage',
    'Port of Loading', 'Port of Discharge', 'Consignee', 'Shipper', 'Weight',
    'Signature', 'Date', 'Magerwa', 'Amount', 'Total',
  ];
  fieldLabels.forEach(label => {
    if (text.toLowerCase().includes(label.toLowerCase())) terms.push(label);
  });

  if (item.type === 'missing_field') {
    const missing = text.replace(/^missing[:\s]*/i, '').trim();
    if (missing) terms.push(missing.split(/[,(]/)[0].trim());
  }

  return [...new Set(terms.map(t => t.trim()).filter(t => t.length >= 2))];
}

function lineMatchesTerm(line, term) {
  if (!line || !term) return false;
  const l = line.toLowerCase();
  const t = term.toLowerCase();
  if (l.includes(t)) return true;
  // Label-only lines e.g. "TIN:" when term is "TIN"
  if (l.replace(/[:\s\d./-]/g, '').includes(t.replace(/\s/g, ''))) return true;
  return false;
}

/**
 * Map each markup item to a line index in extracted document text.
 */
function attachMarkupPositions(extractedText, markup) {
  const lines = String(extractedText || '').split(/\r?\n/);
  const positioned = (markup || []).map(item => {
    const terms = extractSearchTerms(item);
    let lineIndex = null;
    let matchedLine = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (terms.some(term => lineMatchesTerm(line, term))) {
        lineIndex = i;
        matchedLine = line;
        break;
      }
    }

    // Missing field: find label row or empty value after label
    if (lineIndex == null && item.type === 'missing_field') {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (terms.some(term => lineMatchesTerm(line, term))) {
          lineIndex = i;
          matchedLine = line;
          break;
        }
        if (terms.some(term => new RegExp(`^\\s*${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*$`, 'i').test(line))) {
          lineIndex = i;
          matchedLine = line;
          break;
        }
      }
    }

    // Fallback: search full text for quoted values
    if (lineIndex == null && terms.length) {
      for (let i = 0; i < lines.length; i++) {
        if (terms.some(term => term.length >= 4 && lines[i].toLowerCase().includes(term.toLowerCase()))) {
          lineIndex = i;
          matchedLine = lines[i];
          break;
        }
      }
    }

    return {
      ...item,
      searchTerms: terms,
      lineIndex,
      matchedLine,
    };
  });

  return positioned;
}

function textHasDateValue(text) {
  return /\b\d{1,2}\s*[./\-]\s*\d{1,2}\s*[./\-]\s*\d{2,4}\b/.test(String(text || ''));
}

function isFalseMissingDateItem(item, extractedText) {
  if (!textHasDateValue(extractedText)) return false;
  const blob = `${item?.text || ''} ${item?.check || ''} ${item?.field || ''}`.toLowerCase();
  return /\bdate\b/.test(blob) && /missing|no date found|blank/.test(blob) && !/\btin\b/.test(blob);
}

function buildAuditMarkup(analysis, documentStatus = 'in_progress', extractedText = '') {
  const results = analysis?.results || analysis || {};
  const markup = [];
  let idx = 0;

  (results.violations || []).forEach(v => {
    const item = {
      id: `violation-${idx++}`,
      type: 'violation',
      severity: String(v.severity || 'MEDIUM').toUpperCase(),
      status: documentStatus,
      text: violationText(v),
      location: v.field || v.check || v.title || null,
      field: v.title || v.field || null,
      check: v.title || v.check || null,
      markColor: 'red',
    };
    if (!isFalseMissingDateItem(item, extractedText)) markup.push(item);
  });

  (results.inconsistencies || []).forEach(item => {
    markup.push({
      id: `inconsistency-${idx++}`,
      type: 'inconsistency',
      severity: 'MEDIUM',
      status: documentStatus,
      text: violationText(item),
      location: (item && (item.field || item.check || item.title)) || null,
      markColor: 'red',
    });
  });

  (results.fraud_flags || []).forEach(f => {
    markup.push({
      id: `fraud-${idx++}`,
      type: 'fraud_flag',
      severity: String((f && f.severity) || 'high').toUpperCase(),
      status: documentStatus,
      text: violationText(f),
      location: null,
      markColor: 'red',
    });
  });

  (results.missing_fields || []).forEach(f => {
    const item = {
      id: `missing-${idx++}`,
      type: 'missing_field',
      severity: 'HIGH',
      status: documentStatus,
      text: violationText(f) || (typeof f === 'string' ? f : ''),
      location: null,
      markColor: 'red',
    };
    if (!isFalseMissingDateItem(item, extractedText)) markup.push(item);
  });

  (results.calculation_errors || []).forEach(err => {
    markup.push({
      id: `calc-${idx++}`,
      type: 'calculation_error',
      severity: 'CRITICAL',
      status: documentStatus,
      text: violationText(err),
      location: null,
      markColor: 'red',
    });
  });

  return markup;
}

function managerReviewStatusFromAudit(documentStatus) {
  if (documentStatus === 'changes_requested' || documentStatus === 'rejected') {
    return 'needs_correction';
  }
  if (documentStatus === 'approved' || documentStatus === 'reviewed') {
    return 'ready_for_client';
  }
  return 'pending_manager_review';
}

function hasAuditMistakes(markup) {
  return Array.isArray(markup) && markup.length > 0;
}

module.exports = {
  buildAuditMarkup,
  managerReviewStatusFromAudit,
  hasAuditMistakes,
  violationText,
  extractSearchTerms,
  attachMarkupPositions,
};
