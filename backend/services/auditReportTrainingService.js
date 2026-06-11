'use strict';
/**
 * Ingest SIFCO_Audit_Report.xlsx into ML training labels + corpus supplements.
 * Place file at: backend/data/training/SIFCO_Audit_Report.xlsx
 */
var fs = require('fs');
var path = require('path');

var TRAINING_DIR = path.join(__dirname, '..', 'data', 'training');
var DEFAULT_XLSX = path.join(TRAINING_DIR, 'SIFCO_Audit_Report.xlsx');
var LABELS_OUT = path.join(TRAINING_DIR, 'labels', 'audit_report_labels.json');
var GROUND_TRUTH_PATH = path.join(TRAINING_DIR, 'labels', 'ground_truth.jsonl');

var DOC_ID_TO_SPEC = {
  '01-packing-list-unique-hybrid': 'packing_list',
  '02-shipping-agreement-john': 'shipping_agreement',
  '03-hbl-unique-hybrid': 'bill_of_lading',
  '04-freight-invoice-unique-hybrid': 'freight_invoice',
  '05-trucking-invoice-ecmu5567458': 'trucking_invoice',
  '06-sea-freight-john': 'sea_freight_invoice',
};

var TYPE_TO_SPEC = {
  packing_list: 'packing_list',
  packinglist: 'packing_list',
  packing: 'packing_list',
  shipping_agreement: 'shipping_agreement',
  shippingagreement: 'shipping_agreement',
  shipping: 'shipping_agreement',
  bill_of_lading: 'bill_of_lading',
  house_bill_of_lading: 'bill_of_lading',
  hbl: 'bill_of_lading',
  bol: 'bill_of_lading',
  freight_invoice: 'freight_invoice',
  freight: 'freight_invoice',
  trucking_invoice: 'trucking_invoice',
  trucking: 'trucking_invoice',
  sea_freight_invoice: 'sea_freight_invoice',
  sea_freight: 'sea_freight_invoice',
  seafreight: 'sea_freight_invoice',
  sifco_invoice: 'sea_freight_invoice',
  sifco: 'sea_freight_invoice',
};

var HEADER_ALIASES = {
  doc_id: ['doc_id', 'document_id', 'reference_id', 'ref_id', 'id', 'file_id'],
  document_type: ['document_type', 'paper_type', 'type', 'document category', 'category'],
  consignee: ['consignee', 'consignee_name', 'receiver'],
  shipper: ['shipper', 'shipper_name', 'exporter'],
  cargo_type: ['cargo_type', 'cargo', 'goods_type'],
  container_number: ['container_number', 'container', 'container_no', 'container #'],
  bill_of_lading: ['bill_of_lading', 'bl_number', 'bl', 'b/l', 'bol'],
  total_usd: ['total_usd', 'total', 'amount', 'grand_total', 'invoice_total', 'usd_total'],
  weight_kg: ['weight_kg', 'weight', 'gross_weight'],
  total_packages: ['total_packages', 'packages', 'package_count', 'pcs'],
  cargo_details: ['cargo_details', 'description', 'goods_description', 'item_description'],
  tin: ['tin', 'nif', 'tax_id', 'company_tin'],
  vessel: ['vessel', 'vessel_name'],
  voyage: ['voyage', 'voyage_no'],
  status: ['status', 'audit_status', 'valid', 'result'],
  notes: ['notes', 'remarks', 'comments', 'audit_notes'],
};

var cachedLabels = null;

function normalizeKey(key) {
  return String(key || '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .trim();
}

function mapHeader(rowKeys) {
  var map = {};
  rowKeys.forEach(function (rawKey) {
    var nk = normalizeKey(rawKey);
    Object.keys(HEADER_ALIASES).forEach(function (field) {
      if (map[field]) return;
      var aliases = HEADER_ALIASES[field];
      if (aliases.indexOf(nk) >= 0 || nk === field) map[field] = rawKey;
    });
  });
  return map;
}

function resolveSpecId(record) {
  if (record.doc_id && DOC_ID_TO_SPEC[record.doc_id]) {
    return DOC_ID_TO_SPEC[record.doc_id];
  }
  var dt = normalizeKey(record.document_type || '').replace(/-/g, '_');
  if (TYPE_TO_SPEC[dt]) return TYPE_TO_SPEC[dt];
  var compact = dt.replace(/_/g, '');
  if (TYPE_TO_SPEC[compact]) return TYPE_TO_SPEC[compact];
  Object.keys(TYPE_TO_SPEC).forEach(function (key) {
    if (dt.indexOf(key) >= 0 || key.indexOf(dt) >= 0) {
      if (!record._specGuess) record._specGuess = TYPE_TO_SPEC[key];
    }
  });
  return record._specGuess || null;
}

function rowToRecord(row, headerMap) {
  var record = {};
  Object.keys(headerMap).forEach(function (field) {
    var val = row[headerMap[field]];
    if (val === undefined || val === null || val === '') return;
    if (typeof val === 'number' && field.endsWith('_usd')) {
      record[field] = val;
    } else {
      record[field] = String(val).trim();
    }
  });
  record.spec_id = resolveSpecId(record);
  return record;
}

function buildSupplementText(record) {
  var parts = [];
  if (record.document_type) parts.push('Document type: ' + record.document_type);
  if (record.consignee) parts.push('Consignee: ' + record.consignee);
  if (record.shipper) parts.push('Shipper: ' + record.shipper);
  if (record.cargo_type) parts.push('Cargo: ' + record.cargo_type);
  if (record.cargo_details) parts.push('Details: ' + record.cargo_details);
  if (record.container_number) parts.push('Container: ' + record.container_number);
  if (record.bill_of_lading) parts.push('Bill of lading: ' + record.bill_of_lading);
  if (record.total_usd != null) parts.push('Total USD: ' + record.total_usd);
  if (record.weight_kg != null) parts.push('Weight KG: ' + record.weight_kg);
  if (record.total_packages != null) parts.push('Packages: ' + record.total_packages);
  if (record.tin) parts.push('TIN: ' + record.tin);
  if (record.vessel) parts.push('Vessel: ' + record.vessel);
  if (record.voyage) parts.push('Voyage: ' + record.voyage);
  if (record.status) parts.push('Audit status: ' + record.status);
  if (record.notes) parts.push('Notes: ' + record.notes);
  return parts.join('\n');
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function valueToMarker(value) {
  if (value == null) return null;
  var s = String(value).trim();
  if (s.length < 3) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return null;
  return new RegExp(escapeRegex(s).replace(/\s+/g, '\\s+'), 'i');
}

function ingestAuditReportExcel(options) {
  options = options || {};
  var xlsxPath = options.path || DEFAULT_XLSX;

  if (!fs.existsSync(xlsxPath)) {
    return {
      ok: false,
      skipped: true,
      message: 'SIFCO_Audit_Report.xlsx not found at ' + xlsxPath,
      path: xlsxPath,
    };
  }

  var XLSX;
  try {
    XLSX = require('xlsx');
  } catch (e) {
    return {
      ok: false,
      error: 'xlsx package not installed. Run: npm install xlsx',
    };
  }

  var workbook = XLSX.readFile(xlsxPath, { cellDates: true });
  var records = [];
  workbook.SheetNames.forEach(function (sheetName) {
    var sheet = workbook.Sheets[sheetName];
    var rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!rows.length) return;
    var headerMap = mapHeader(Object.keys(rows[0]));
    rows.forEach(function (row, index) {
      var record = rowToRecord(row, headerMap);
      if (Object.keys(record).length <= 1 && !record.spec_id) return;
      record.source_sheet = sheetName;
      record.source_row = index + 2;
      record.supplement_text = buildSupplementText(record);
      records.push(record);
    });
  });

  if (!records.length) {
    return { ok: false, error: 'No usable rows found in ' + xlsxPath };
  }

  fs.mkdirSync(path.dirname(LABELS_OUT), { recursive: true });
  fs.writeFileSync(LABELS_OUT, JSON.stringify({
    sourceFile: path.basename(xlsxPath),
    ingestedAt: new Date().toISOString(),
    rowCount: records.length,
    records: records,
  }, null, 2));

  mergeGroundTruth(records);
  cachedLabels = null;

  return {
    ok: true,
    path: xlsxPath,
    rowCount: records.length,
    labelsPath: LABELS_OUT,
    bySpec: summarizeBySpec(records),
  };
}

function mergeGroundTruth(records) {
  var existing = [];
  if (fs.existsSync(GROUND_TRUTH_PATH)) {
    existing = fs.readFileSync(GROUND_TRUTH_PATH, 'utf8')
      .split(/\n/)
      .filter(Boolean)
      .map(function (line) { try { return JSON.parse(line); } catch (e) { return null; } })
      .filter(Boolean);
  }

  var byDocId = {};
  existing.forEach(function (row) { byDocId[row.doc_id] = row; });

  records.forEach(function (rec) {
    if (!rec.doc_id) return;
    var merged = Object.assign({}, byDocId[rec.doc_id] || {}, {
      doc_id: rec.doc_id,
      document_type: rec.document_type || (byDocId[rec.doc_id] && byDocId[rec.doc_id].document_type),
      consignee: rec.consignee,
      shipper: rec.shipper,
      cargo_type: rec.cargo_type,
      total_packages: rec.total_packages != null ? Number(rec.total_packages) : undefined,
      weight_kg: rec.weight_kg != null ? Number(rec.weight_kg) : undefined,
      container_number: rec.container_number,
      bill_of_lading: rec.bill_of_lading,
      total_usd: rec.total_usd != null ? Number(rec.total_usd) : undefined,
      cargo_details: rec.cargo_details,
      audit_report_source: 'SIFCO_Audit_Report.xlsx',
    });
    Object.keys(merged).forEach(function (k) {
      if (merged[k] === undefined || merged[k] === null || merged[k] === '') delete merged[k];
    });
    byDocId[rec.doc_id] = merged;
  });

  var lines = Object.keys(byDocId).sort().map(function (id) {
    return JSON.stringify(byDocId[id]);
  });
  fs.writeFileSync(GROUND_TRUTH_PATH, lines.join('\n') + '\n', 'utf8');
}

function summarizeBySpec(records) {
  var out = {};
  records.forEach(function (r) {
    var id = r.spec_id || 'unmapped';
    out[id] = (out[id] || 0) + 1;
  });
  return out;
}

function loadAuditReportLabels() {
  if (cachedLabels) return cachedLabels;
  if (!fs.existsSync(LABELS_OUT)) {
    cachedLabels = { records: [], bySpec: {} };
    return cachedLabels;
  }
  try {
    var parsed = JSON.parse(fs.readFileSync(LABELS_OUT, 'utf8'));
    cachedLabels = {
      records: parsed.records || [],
      meta: {
        sourceFile: parsed.sourceFile,
        ingestedAt: parsed.ingestedAt,
        rowCount: parsed.rowCount,
      },
    };
  } catch (e) {
    cachedLabels = { records: [], bySpec: {} };
  }

  cachedLabels.bySpec = {};
  cachedLabels.supplementsBySpec = {};
  cachedLabels.markersBySpec = {};

  cachedLabels.records.forEach(function (rec) {
    if (!rec.spec_id) return;
    if (!cachedLabels.supplementsBySpec[rec.spec_id]) {
      cachedLabels.supplementsBySpec[rec.spec_id] = [];
      cachedLabels.markersBySpec[rec.spec_id] = [];
    }
    if (rec.supplement_text) {
      cachedLabels.supplementsBySpec[rec.spec_id].push(rec.supplement_text);
    }
    ['consignee', 'shipper', 'container_number', 'bill_of_lading', 'cargo_details', 'tin', 'vessel', 'voyage'].forEach(function (field) {
      var marker = valueToMarker(rec[field]);
      if (marker) cachedLabels.markersBySpec[rec.spec_id].push(marker);
    });
    cachedLabels.bySpec[rec.spec_id] = (cachedLabels.bySpec[rec.spec_id] || 0) + 1;
  });

  return cachedLabels;
}

function getSupplementTextForSpec(specId) {
  var labels = loadAuditReportLabels();
  var chunks = labels.supplementsBySpec && labels.supplementsBySpec[specId];
  if (!chunks || !chunks.length) return '';
  return '\n\n--- SIFCO AUDIT REPORT TRAINING ---\n' + chunks.join('\n\n');
}

function getExtraMarkersForSpec(specId) {
  var labels = loadAuditReportLabels();
  return (labels.markersBySpec && labels.markersBySpec[specId]) || [];
}

function clearCache() {
  cachedLabels = null;
}

module.exports = {
  DEFAULT_XLSX,
  LABELS_OUT,
  ingestAuditReportExcel,
  loadAuditReportLabels,
  getSupplementTextForSpec,
  getExtraMarkersForSpec,
  clearCache,
};
