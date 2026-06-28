'use strict';
/**
 * Cross-document consistency for SIFCO shipment bundles (bulk audit).
 * Compares BL, container, vessel, voyage, ports, and consignee across uploaded papers.
 */
var notebookAudit = require('./sifcoNotebookAuditService');
var criticalFindings = require('./sifcoCriticalFindingsService');

var CROSS_DOC_FIELDS = [
  { key: 'bl_numbers', label: 'BL Number', severity: 'HIGH' },
  { key: 'container', label: 'Container', severity: 'HIGH' },
  { key: 'vessel', label: 'Vessel', severity: 'MEDIUM' },
  { key: 'voyage', label: 'Voyage', severity: 'MEDIUM' },
  { key: 'port_of_loading', label: 'Port of Loading', severity: 'MEDIUM' },
  { key: 'port_of_discharge', label: 'Port of Discharge', severity: 'MEDIUM' },
  { key: 'final_destination', label: 'Final Destination', severity: 'MEDIUM' },
  { key: 'consignee', label: 'Consignee', severity: 'LOW' },
];

function normalizeField(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return value.length ? value[0] : null;
  return String(value).trim().toUpperCase().replace(/\s+/g, ' ');
}

function fieldsMatch(a, b) {
  if (!a || !b) return true;
  a = normalizeField(a);
  b = normalizeField(b);
  if (a === b) return true;
  if (a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return true;
  return notebookAudit.partialRatio(a, b) > 82;
}

function extractBundleFields(text, auditResult) {
  var fields = notebookAudit.extractFields(text || '');
  var specId = auditResult && auditResult.document_type;
  var label = auditResult && auditResult.organization_training && auditResult.organization_training.paper_label;
  var critical = criticalFindings.runCriticalChecks(text, mapSpecToDocType(specId), fields);
  return {
    specId: specId,
    label: label || specId,
    fields: critical.fields,
    rawText: text || '',
  };
}

function mapSpecToDocType(specId) {
  var map = {
    packing_list: 'PACKING_LIST',
    bill_of_lading: 'HBL',
    shipping_agreement: 'SHIPPING_AGREEMENT',
    freight_invoice: 'SIFCO_INVOICE',
    trucking_invoice: 'TRUCKING_INVOICE',
    sea_freight_invoice: 'FREIGHT_INVOICE',
    shipping_instruction: 'SHIPPING_INSTRUCTION',
  };
  return map[specId] || specId;
}

function findSharedKey(docs, fieldKey) {
  var values = {};
  docs.forEach(function (doc) {
    var raw = doc.fields[fieldKey];
    var val = normalizeField(raw);
    if (!val) return;
    if (!values[val]) values[val] = 0;
    values[val] += 1;
  });
  var keys = Object.keys(values);
  if (!keys.length) return null;
  keys.sort(function (a, b) { return values[b] - values[a]; });
  return keys[0];
}

function auditShipmentBundle(entries) {
  entries = (entries || []).filter(function (e) {
    return e && e.auditResult && e.auditResult.organization_match && e.text;
  });

  if (entries.length < 2) {
    return {
      checked: false,
      reason: 'Need at least 2 validated SIFCO documents for cross-document checks',
      issues: [],
      matched_fields: {},
      document_count: entries.length,
    };
  }

  var docs = entries.map(function (e) {
    return extractBundleFields(e.text, e.auditResult);
  });

  var issues = [];
  var matched = {};

  CROSS_DOC_FIELDS.forEach(function (field) {
    var key = field.key;
    var present = docs.filter(function (d) {
      var val = d.fields[key];
      if (Array.isArray(val)) return val.length > 0;
      return !!val;
    });
    if (present.length < 2) return;

    var anchor = findSharedKey(present, key);
    if (!anchor) return;

    var mismatches = [];
    present.forEach(function (d) {
      var val = normalizeField(d.fields[key]);
      if (!fieldsMatch(val, anchor)) {
        mismatches.push({ label: d.label, value: val });
      }
    });

    if (mismatches.length) {
      issues.push({
        severity: field.severity,
        check: 'Cross-Document',
        message:
          field.label + " mismatch across shipment papers. Expected '" + anchor +
          "' but found: " + mismatches.map(function (m) { return m.label + '=' + m.value; }).join('; '),
      });
    } else {
      matched[key] = anchor;
    }
  });

  var blSet = {};
  docs.forEach(function (d) {
    (d.fields.bl_numbers || []).forEach(function (bl) { blSet[bl] = true; });
  });
  var blKeys = Object.keys(blSet);
  if (blKeys.length > 1) {
    issues.push({
      severity: 'HIGH',
      check: 'Cross-Document',
      message: 'Multiple BL numbers in one shipment bundle: ' + blKeys.join(', ') +
        ' — verify these documents belong to the same shipment.',
    });
  }

  var containerSet = {};
  docs.forEach(function (d) {
    if (d.fields.container) containerSet[d.fields.container] = true;
  });
  var containerKeys = Object.keys(containerSet);
  if (containerKeys.length > 1) {
    issues.push({
      severity: 'HIGH',
      check: 'Cross-Document',
      message: 'Multiple container numbers in one shipment bundle: ' + containerKeys.join(', ') +
        ' — trucking and sea papers should reference the same container.',
    });
  }

  issues = issues.concat(criticalFindings.runCrossDocumentCriticalChecks(docs));

  var expectedTypes = [
    'packing_list', 'bill_of_lading', 'shipping_agreement',
    'freight_invoice', 'trucking_invoice', 'sea_freight_invoice', 'shipping_instruction',
  ];
  var foundTypes = docs.map(function (d) { return d.specId; }).filter(Boolean);
  var missingTypes = expectedTypes.filter(function (t) { return foundTypes.indexOf(t) < 0; });

  return {
    checked: true,
    document_count: entries.length,
    document_types: foundTypes,
    missing_paper_types: missingTypes,
    matched_fields: matched,
    issues: issues,
    status: issues.some(function (i) { return i.severity === 'HIGH' || i.severity === 'CRITICAL'; })
      ? 'FLAGGED'
      : issues.length ? 'WARNING' : 'APPROVED',
    summary: issues.length
      ? issues.length + ' cross-document issue(s) found across ' + entries.length + ' SIFCO papers.'
      : 'All ' + entries.length + ' SIFCO papers are consistent on shared shipment fields.',
  };
}

module.exports = {
  auditShipmentBundle: auditShipmentBundle,
  CROSS_DOC_FIELDS: CROSS_DOC_FIELDS,
};
