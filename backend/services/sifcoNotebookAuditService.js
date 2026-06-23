'use strict';
/**
 * Runtime audit engine from Untitled3.ipynb — keyword classification + field/fraud checks.
 * Accepts valid SIFCO document types even when invoice details differ from reference PDFs.
 */
var fs = require('fs');
var path = require('path');
var notebookTraining = require('./notebookTrainingService');
var criticalFindings = require('./sifcoCriticalFindingsService');

var LABELS_PATH = path.join(__dirname, '..', 'data', 'training', 'labels', 'notebook_training.json');

// Minimum keyword-overlap confidence (%) before a document is classified as a
// SIFCO paper type. The old value (20%) let unrelated documents (e.g. a thesis
// that merely contains words like "invoice"/"total"/"date") be mislabelled as a
// freight invoice. Genuine SIFCO papers score 80%+, while unrelated documents
// score ~33% — so 55% cleanly separates the two.
var MIN_CLASSIFY_CONFIDENCE = 48;

var DEFAULT_KNOWN = {
  bl_numbers: ['DXB1022332', 'DXB1020247'],
  containers: ['TEMU6439085', 'ECMU5567458'],
  voyages: ['02SOGS1MA'],
  vessels: ['CMA CGM SEMARANG', 'SEMARSNG'],
  tins: {
    '121348946': 'SUPER INTERNATIONAL FREIGHT SERVICES LLC',
    '4003036334': 'TOP SIFCO SURL',
  },
};

var cachedConfig = null;

function loadConfig() {
  if (cachedConfig) return cachedConfig;
  if (!fs.existsSync(LABELS_PATH)) {
    cachedConfig = { templates: {}, known: DEFAULT_KNOWN };
    return cachedConfig;
  }
  try {
    var parsed = JSON.parse(fs.readFileSync(LABELS_PATH, 'utf8'));
    cachedConfig = {
      templates: parsed.templates || {},
      known: parsed.known_values || DEFAULT_KNOWN,
    };
  } catch (e) {
    cachedConfig = { templates: {}, known: DEFAULT_KNOWN };
  }
  return cachedConfig;
}

function clearCache() {
  cachedConfig = null;
}

function partialRatio(a, b) {
  a = String(a || '').toLowerCase();
  b = String(b || '').toLowerCase();
  if (!a || !b) return 0;
  if (b.indexOf(a) >= 0 || a.indexOf(b) >= 0) return 100;
  var shorter = a.length < b.length ? a : b;
  var longer = a.length < b.length ? b : a;
  if (longer.indexOf(shorter) >= 0) return Math.round((shorter.length / longer.length) * 100);
  return 0;
}

function classifyDocument(text) {
  var cfg = loadConfig();
  var textLower = (text || '').toLowerCase();
  var scores = {};
  var bestKey = 'UNKNOWN';
  var bestScore = 0;

  Object.keys(cfg.templates).forEach(function (docType) {
    var template = cfg.templates[docType];
    var keywords = template.keywords || [];
    if (!keywords.length) return;
    var score = 0;
    keywords.forEach(function (keyword) {
      var kw = keyword.toLowerCase();
      if (textLower.indexOf(kw) >= 0) {
        score += 1;
      } else {
        var lines = textLower.split('\n');
        for (var i = 0; i < lines.length; i++) {
          if (partialRatio(kw, lines[i]) > 85) {
            score += 0.5;
            break;
          }
        }
      }
    });
    scores[docType] = score / keywords.length;
  });

  Object.keys(scores).forEach(function (k) {
    if (scores[k] > bestScore) {
      bestScore = scores[k];
      bestKey = k;
    }
  });

  var confidence = Math.round(bestScore * 1000) / 10;
  if (confidence < MIN_CLASSIFY_CONFIDENCE) return { docType: 'UNKNOWN', specId: null, confidence: confidence, scores: scores };

  var specId = cfg.templates[bestKey] && cfg.templates[bestKey].spec_id;
  return {
    docType: bestKey,
    specId: specId,
    docTypeName: cfg.templates[bestKey] && cfg.templates[bestKey].name,
    confidence: confidence,
    scores: scores,
  };
}

function extractFields(text) {
  var textUpper = (text || '').toUpperCase();
  var fields = {};

  fields.tin_numbers = unique(
    (textUpper.match(/(?:TIN|NIF)\s*(?:NO\.?|NUMBER)?\s*[:\-]?\s*(\d{6,12})/g) || [])
      .map(function (m) { return m.replace(/.*?(\d{6,12})$/, '$1'); })
  );

  fields.bl_numbers = unique(
    (textUpper.match(/(?:BILL OF LAD(?:ING|ING NO)|BILL OF LOAD(?:ING)?|BL NUMBER|BL NO|B\/L)[:\s#]*([A-Z]{2,4}\d{6,10})/g) || [])
      .map(function (m) {
        var hit = m.match(/([A-Z]{2,4}\d{6,10})$/);
        return hit ? hit[1] : null;
      }).filter(Boolean)
  );

  var container = textUpper.match(/CONTAINER\s*(?:NO|NUMBER|N[O°]?)?[:\s]*([A-Z]{4}\d{7})/);
  if (!container) {
    var containerBlock = textUpper.match(/CONTAINER\s*(?:NO|NUMBER|N[O°]?)?[:\s]*\n[^\n]*?([A-Z]{4}\d{7})/);
    if (containerBlock) container = containerBlock;
  }
  if (!container && /CONTAINER/i.test(textUpper)) {
    var anyContainer = textUpper.match(/\b([A-Z]{4}\d{7})\b/);
    if (anyContainer) container = anyContainer;
  }
  fields.container = container ? container[1] : null;

  var vessel = textUpper.match(/(?:NAME OF VESSEL|VESSEL\s*VOYAGE)[:\s]*([\w\s]+?)(?:\n|\/|VOYAGE|$)/);
  fields.vessel = vessel ? vessel[1].trim() : null;

  var voyage = textUpper.match(/VOYAGE\s*(?:NUMBER)?[:\s]*([A-Z0-9]+)/);
  fields.voyage = voyage ? voyage[1].trim() : null;

  var consignee = textUpper.match(/CONSIGN(?:EE|E)[:\s]+([^\n]+)/);
  fields.consignee = consignee ? consignee[1].trim() : null;
  if (!fields.consignee) {
    var agr = textUpper.match(/AGREEMENT\s+BETWEEN\s+\S+\s+AND\s+([^\n,]+)/);
    if (agr) fields.consignee = agr[1].trim();
  }

  var inv = textUpper.match(/INVOICE\s*(?:NO\.?|NUMBER)[:\s.]*(\S+)/);
  fields.invoice_no = inv ? inv[1].replace(/[^\d\/A-Z\-]/gi, '') : null;

  var pol = textUpper.match(/PORT\s+OF\s+LOADING\s*[:\s]+([^\n]+)/);
  fields.port_of_loading = pol ? pol[1].trim() : null;
  if (!fields.port_of_loading) {
    var polAlt = textUpper.match(/\bORIGIN\s*[:\s]+([^\n]+)/);
    if (polAlt) fields.port_of_loading = polAlt[1].trim();
    else if (/JEBEL\s+ALI/i.test(text)) fields.port_of_loading = 'JEBEL ALI';
  }

  var pod = textUpper.match(/PORT\s+OF\s+DISCHARGE\s*[:\s]+([^\n]+)/);
  fields.port_of_discharge = pod ? pod[1].trim() : null;

  var dest = textUpper.match(/FINAL\s+DESTINATION\s*[:\s]+([^\n]+)/);
  fields.final_destination = dest ? dest[1].trim() : null;

  var origin = textUpper.match(/ORIGIN\s*[:\s]+([^\n]+)/);
  fields.origin = origin ? origin[1].trim() : null;

  var weight = textUpper.match(/WEIGHT\s*[:\s]*(\d+\s*KGS?)/i);
  fields.weight = weight ? weight[1].trim() : null;

  var totalMatch = textUpper.match(/TOTAL\s*(?:\/\s*USD|\\)?\s*[:\s]*(\d[\d,\.]*)/);
  fields.total = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : null;

  fields.dates = unique((text.match(/\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b/g) || []));

  fields.packing_lines = extractPackingListLines(text);
  fields.invoice_lines = extractInvoiceAmountLines(text);

  return fields;
}

function extractPackingListLines(text) {
  var lines = [];
  var re = /^\s*(\d+)\s+(.+?)\s+(?:PCS|PC|UNIT|KGS|PKG)\s+(\d+)\s+(\d+)/gim;
  var m;
  while ((m = re.exec(text || '')) !== null) {
    lines.push({
      line: parseInt(m[1], 10),
      description: m[2].trim(),
      qty: parseInt(m[3], 10),
      packages: parseInt(m[4], 10),
    });
  }
  return lines;
}

function extractInvoiceAmountLines(text) {
  var lines = [];
  var re = /^\s*(\d+)\s+(\d[\d,\.]*)\s+(\d[\d,\.]*)\s*$/gm;
  var m;
  while ((m = re.exec(text || '')) !== null) {
    var qty = parseFloat(m[1]);
    var rate = parseFloat(m[2].replace(/,/g, ''));
    var total = parseFloat(m[3].replace(/,/g, ''));
    if (qty > 0 && rate > 0 && total > 0) {
      lines.push({ qty: qty, rate: rate, total: total });
    }
  }
  return lines;
}

function isValidContainerFormat(container) {
  return /^[A-Z]{4}\d{7}$/.test(container || '');
}

function isValidBlFormat(bl) {
  return /^[A-Z]{2,4}\d{6,10}$/.test(bl || '');
}

function isValidInvoiceFormat(invoiceNo, docType) {
  if (!invoiceNo) return false;
  if (/^\d{2,4}\/\d{4}\/\d+$/.test(invoiceNo)) return true;
  if (docType === 'TRUCKING_INVOICE' || docType === 'SIFCO_INVOICE') {
    return /\d/.test(invoiceNo) && invoiceNo.length >= 5;
  }
  return false;
}

function isValidTinFormat(tin) {
  return /^\d{6,12}$/.test(tin || '');
}

function normalizePortName(name) {
  return String(name || '').toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

var KNOWN_PORTS = [
  'JEBEL ALI', 'DAR ES SALAM', 'DAR ES SALAAM', 'MOMBASA', 'KIGALI', 'DUBAI',
];

function portLooksValid(name) {
  var n = normalizePortName(name);
  if (!n || n.length < 3) return false;
  return KNOWN_PORTS.some(function (p) {
    return partialRatio(n, p) > 80 || n.indexOf(p) >= 0 || p.indexOf(n) >= 0;
  });
}

function validatePackingListMath(text, fields, issues) {
  if (!fields.packing_lines || !fields.packing_lines.length) return;

  var sumQty = 0;
  var sumPackages = 0;
  var lineIssues = [];

  fields.packing_lines.forEach(function (line) {
    sumQty += line.qty;
    sumPackages += line.packages;
    if (line.qty !== line.packages) {
      lineIssues.push('Line ' + line.line + ' (' + line.description + '): QTY ' + line.qty + ' ≠ packages ' + line.packages);
    }
  });

  var statedTotal = fields.total;
  if (statedTotal == null) {
    var totalLine = (text || '').toUpperCase().match(/TOTAL\s+(\d+)/);
    if (totalLine) statedTotal = parseInt(totalLine[1], 10);
  }

  if (statedTotal != null && sumPackages !== statedTotal) {
    issues.push({
      severity: 'HIGH',
      check: 'Packing List Math',
      message: 'Package total mismatch: line items sum to ' + sumPackages + ' but document states TOTAL ' + statedTotal,
    });
  } else if (statedTotal != null && sumPackages === statedTotal) {
    issues.push({
      severity: 'INFO',
      check: 'Packing List Math',
      message: 'Package count verified: ' + sumPackages + ' items = TOTAL ' + statedTotal,
    });
  }

  if (lineIssues.length) {
    issues.push({
      severity: 'MEDIUM',
      check: 'Packing List Math',
      message: 'QTY/packages mismatch on rows: ' + lineIssues.slice(0, 3).join('; '),
    });
  }
}

function validateInvoiceAmounts(text, fields, docType, issues) {
  if (docType === 'SHIPPING_AGREEMENT' || docType === 'FREIGHT_INVOICE') {
    var amounts = [];
    var re = /(\d[\d,\.]*)\s+(\d[\d,\.]*)\s*$/gm;
    var m;
    var textLines = (text || '').split('\n');
    textLines.forEach(function (line) {
      var match = line.match(/(\d[\d,\.]*)\s+(\d[\d,\.]*)\s*$/);
      if (match) {
        var rate = parseFloat(match[1].replace(/,/g, ''));
        var total = parseFloat(match[2].replace(/,/g, ''));
        if (rate > 0 && total > 0 && Math.abs(rate - total) < 0.01) {
          amounts.push(total);
        } else if (rate > 0 && total > 0) {
          amounts.push(total);
        }
      }
    });

    if (amounts.length && fields.total != null) {
      var sum = amounts.reduce(function (a, b) { return a + b; }, 0);
      if (Math.abs(sum - fields.total) > 1) {
        issues.push({
          severity: 'HIGH',
          check: 'Amount Calculation',
          message: 'Line items sum to ' + sum + ' but TOTAL shows ' + fields.total,
        });
      }
    }
  }

  (fields.invoice_lines || []).forEach(function (line) {
    var expected = line.qty * line.rate;
    if (Math.abs(expected - line.total) > 0.01) {
      issues.push({
        severity: 'HIGH',
        check: 'Amount Calculation',
        message: 'Invoice line error: ' + line.qty + ' × ' + line.rate + ' = ' + expected + ', not ' + line.total,
      });
    }
  });
}

function validateShippingFields(fields, issues) {
  if (fields.port_of_loading && !portLooksValid(fields.port_of_loading)) {
    issues.push({
      severity: 'MEDIUM',
      check: 'Port of Loading',
      message: "Port of loading '" + fields.port_of_loading + "' is not a recognized SIFCO route port",
    });
  }
  if (fields.port_of_discharge && !portLooksValid(fields.port_of_discharge)) {
    issues.push({
      severity: 'MEDIUM',
      check: 'Port of Discharge',
      message: "Port of discharge '" + fields.port_of_discharge + "' is not a recognized SIFCO route port",
    });
  }
  if (fields.final_destination && !portLooksValid(fields.final_destination)) {
    issues.push({
      severity: 'LOW',
      check: 'Final Destination',
      message: "Final destination '" + fields.final_destination + "' — verify against shipment route",
    });
  }
}

function unique(arr) {
  var seen = {};
  return arr.filter(function (x) {
    if (!x || seen[x]) return false;
    seen[x] = true;
    return true;
  });
}

function fieldPresent(textUpper, field) {
  var f = field.toUpperCase();
  if (textUpper.indexOf(f) >= 0) return true;
  return textUpper.split('\n').some(function (line) {
    return partialRatio(f, line) > 80;
  });
}

function fieldCheckLevel(template, key) {
  var checks = (template && template.field_checks) || {};
  return checks[key] || 'off';
}

function pushFieldIssue(issues, level, check, message) {
  if (!level || level === 'off') return;
  var severity = level === 'required' ? 'HIGH' : level === 'warn' ? 'MEDIUM' : 'LOW';
  issues.push({ severity: severity, check: check, message: message });
}

function checkDocument(text, docType, fields) {
  var cfg = loadConfig();
  var issues = [];
  var textUpper = (text || '').toUpperCase();
  var template = cfg.templates[docType];
  var known = cfg.known || DEFAULT_KNOWN;
  var allTins = known.tins || DEFAULT_KNOWN.tins;

  if (!template) {
    return [{ severity: 'CRITICAL', check: 'Type', message: 'Document type unknown' }];
  }

  var tinLevel = fieldCheckLevel(template, 'tin');
  var validTins = template.valid_tins || [];
  var foundTins = fields.tin_numbers || [];
  if (tinLevel !== 'off') {
    if (!foundTins.length) {
      var blankTin = /TIN\s*:\s*(?:\n|$|\r)/im.test(text || '') || /TIN\s*:\s*KIGALI/im.test(text || '');
      if (blankTin) {
        pushFieldIssue(issues, tinLevel, 'TIN', 'TIN field is blank on this document type');
      } else {
        pushFieldIssue(issues, tinLevel, 'TIN', 'TIN number not found in document');
      }
    } else {
      foundTins.forEach(function (tin) {
        if (!isValidTinFormat(tin)) {
          issues.push({ severity: 'CRITICAL', check: 'TIN', message: "TIN '" + tin + "' is not a valid format (expected 6–12 digits)" });
        } else if (tinLevel === 'required' && validTins.length && validTins.indexOf(tin) < 0) {
          pushFieldIssue(issues, 'warn', 'TIN', "TIN '" + tin + "' is valid but not the usual TIN for this paper type");
        } else if (tinLevel === 'required' && !allTins[tin]) {
          pushFieldIssue(issues, 'warn', 'TIN', "TIN '" + tin + "' is not in the known SIFCO partner list — verify manually");
        }
      });
    }
  }

  if (docType === 'PACKING_LIST') {
    validatePackingListMath(text, fields, issues);
  }

  var invoiceLevel = fieldCheckLevel(template, 'invoice_no');
  if (invoiceLevel !== 'off') {
    if (!fields.invoice_no) {
      pushFieldIssue(issues, invoiceLevel, 'Invoice Number', 'Invoice number missing or not readable');
    } else if (!isValidInvoiceFormat(fields.invoice_no, docType)) {
      issues.push({ severity: 'MEDIUM', check: 'Invoice Number', message: "Invoice number '" + fields.invoice_no + "' format looks incorrect" });
    }
  }

  validateInvoiceAmounts(text, fields, docType, issues);

  var containerLevel = fieldCheckLevel(template, 'container');
  if (containerLevel !== 'off') {
    if (fields.container) {
      if (!isValidContainerFormat(fields.container)) {
        pushFieldIssue(issues, 'required', 'Container', "Container '" + fields.container + "' format invalid (expected 4 letters + 7 digits)");
      } else if (known.containers && known.containers.indexOf(fields.container) < 0) {
        issues.push({ severity: 'MEDIUM', check: 'Container', message: "Container '" + fields.container + "' is new — verify against shipment papers" });
      }
    } else {
      pushFieldIssue(issues, containerLevel, 'Container', 'Container number missing for this document type');
    }
  } else if (fields.container && !isValidContainerFormat(fields.container)) {
    issues.push({ severity: 'MEDIUM', check: 'Container', message: "Container '" + fields.container + "' format looks invalid" });
  }

  var blLevel = fieldCheckLevel(template, 'bl');
  if (blLevel !== 'off') {
    if ((fields.bl_numbers || []).length) {
      (fields.bl_numbers || []).forEach(function (bl) {
        if (!isValidBlFormat(bl)) {
          pushFieldIssue(issues, 'required', 'BL Number', "BL '" + bl + "' format invalid (expected e.g. DXB1022332)");
        } else if (known.bl_numbers && known.bl_numbers.indexOf(bl) < 0) {
          issues.push({ severity: 'MEDIUM', check: 'BL Number', message: "BL '" + bl + "' is new — accepted if format is valid" });
        }
      });
    } else {
      pushFieldIssue(issues, blLevel, 'BL Number', 'Bill of Lading number missing from document');
    }
  }

  var missing = (template.required_fields || []).filter(function (field) {
    if (field.toLowerCase() === 'consignee' && fields.consignee) return false;
    if (field.toLowerCase() === 'consigne' && fields.consignee) return false;
    return !fieldPresent(textUpper, field);
  });
  if (missing.length) {
    issues.push({ severity: 'MEDIUM', check: 'Required Fields', message: 'Missing: ' + missing.slice(0, 6).join(', ') });
  }

  if (fieldCheckLevel(template, 'vessel') !== 'off' && fields.vessel && known.vessels) {
    var vesselOk = known.vessels.some(function (v) { return partialRatio(fields.vessel, v) > 80; });
    if (!vesselOk) {
      pushFieldIssue(issues, fieldCheckLevel(template, 'vessel'), 'Vessel', "Vessel '" + fields.vessel + "' does not match known vessels");
    }
  }
  if (fieldCheckLevel(template, 'vessel') !== 'off' && !fields.vessel) {
    pushFieldIssue(issues, fieldCheckLevel(template, 'vessel'), 'Vessel', 'Name of vessel missing');
  }

  if (fieldCheckLevel(template, 'voyage') !== 'off' && fields.voyage && known.voyages && known.voyages.indexOf(fields.voyage) < 0) {
    pushFieldIssue(issues, fieldCheckLevel(template, 'voyage'), 'Voyage', "Voyage '" + fields.voyage + "' is not in known voyages");
  }
  if (fieldCheckLevel(template, 'voyage') !== 'off' && !fields.voyage) {
    pushFieldIssue(issues, fieldCheckLevel(template, 'voyage'), 'Voyage', 'Voyage number missing');
  }

  if (fieldCheckLevel(template, 'ports') !== 'off') {
    validateShippingFields(fields, issues);
    if (!fields.port_of_loading) {
      pushFieldIssue(issues, fieldCheckLevel(template, 'ports'), 'Port of Loading', 'Port of loading missing');
    }
    if (!fields.port_of_discharge && (docType === 'FREIGHT_INVOICE' || docType === 'HBL')) {
      pushFieldIssue(issues, fieldCheckLevel(template, 'ports'), 'Port of Discharge', 'Port of discharge missing');
    }
  }

  if (fieldCheckLevel(template, 'final_destination') !== 'off' && !fields.final_destination) {
    pushFieldIssue(issues, fieldCheckLevel(template, 'final_destination'), 'Final Destination', 'Final destination missing');
  }

  var issuerLevel = fieldCheckLevel(template, 'issuer');
  if (issuerLevel !== 'off') {
    var issuers = template.valid_issuers || [];
    if (issuers.length) {
      var issuerFound = issuers.some(function (issuer) {
        return partialRatio(issuer.toUpperCase(), textUpper) > 75;
      });
      if (!issuerFound) {
        pushFieldIssue(issues, issuerLevel, 'Issuer', 'Expected company name not found: ' + issuers.join(' or '));
      }
    }
  }

  if (fieldCheckLevel(template, 'signatures') !== 'off') {
    (template.required_signatures || []).forEach(function (sig) {
      var normalized = sig.toUpperCase().replace(/[\u2018\u2019]/g, "'");
      var found = textUpper.replace(/[\u2018\u2019]/g, "'").indexOf(normalized) >= 0;
      if (!found) {
        pushFieldIssue(issues, fieldCheckLevel(template, 'signatures'), 'Signature', "Missing signature field: '" + sig + "'");
      }
    });
  }

  var aiSignals = ['as an ai', 'language model', 'chatgpt', 'openai', 'artificial intelligence assistant'];
  aiSignals.forEach(function (signal) {
    if ((text || '').toLowerCase().indexOf(signal) >= 0) {
      issues.push({ severity: 'CRITICAL', check: 'AI Content', message: 'AI-generated text detected' });
    }
  });

  if (fieldCheckLevel(template, 'date') !== 'off' && (!fields.dates || !fields.dates.length)) {
    pushFieldIssue(issues, fieldCheckLevel(template, 'date'), 'Date', 'No date found in document');
  }

  var critical = criticalFindings.runCriticalChecks(text, docType, fields, template.field_checks || {});
  fields = critical.fields;
  issues = issues.concat(critical.issues);

  return issues.filter(function (i) { return i.severity !== 'INFO'; });
}

function statusFromIssues(issues) {
  if (issues.some(function (i) { return i.severity === 'CRITICAL'; })) return 'REJECTED';
  if (issues.some(function (i) { return i.severity === 'HIGH'; })) return 'FLAGGED';
  if (issues.some(function (i) { return i.severity === 'MEDIUM'; })) return 'WARNING';
  return 'APPROVED';
}

function complianceScoreFromStatus(status, issues, missingFields) {
  missingFields = missingFields || issuesToMissingFields(issues);
  if (missingFields.length || (issues && issues.length)) {
    return complianceScoreFromFieldGaps(issues || [], missingFields, { recognizedAsSifco: true });
  }
  if (status === 'APPROVED') return 100;
  if (status === 'WARNING') return 82;
  if (status === 'FLAGGED') return 65;
  return 10;
}

function hasCriticalIssues(issues) {
  return (issues || []).some(function (i) { return i.severity === 'CRITICAL'; });
}

/**
 * Valid SIFCO document with missing / risky fields — score from ~40% up based on gaps.
 * Critical fraud/arithmetic errors score 10–35%.
 */
function complianceScoreFromFieldGaps(issues, missingFields, options) {
  options = options || {};
  issues = issues || [];
  missingFields = missingFields || [];

  if (!options.recognizedAsSifco) return 10;

  if (hasCriticalIssues(issues)) {
    var criticalCount = issues.filter(function (i) { return i.severity === 'CRITICAL'; }).length;
    return Math.max(10, Math.min(35, 32 - criticalCount * 6));
  }

  var highCount = issues.filter(function (i) { return i.severity === 'HIGH'; }).length;
  var mediumCount = issues.filter(function (i) { return i.severity === 'MEDIUM'; }).length;
  var missingCount = missingFields.length;

  var score = 100;
  score -= missingCount * 10;
  score -= highCount * 9;
  score -= mediumCount * 4;

  if (missingCount === 0 && highCount === 0 && mediumCount <= 3) {
    return Math.max(82, Math.min(100, Math.round(score)));
  }

  if (missingCount >= 1 || highCount >= 1 || mediumCount >= 1) {
    score = Math.max(60, score);
  }
  if (missingCount >= 4 || highCount >= 3) {
    score = Math.min(score, 52);
  }
  if (missingCount >= 6 || (missingCount >= 4 && highCount >= 2)) {
    score = Math.min(score, 45);
  }
  if (missingCount >= 8) {
    score = Math.min(score, 40);
  }

  return Math.max(10, Math.min(100, Math.round(score)));
}

function riskLevelFromScore(score, recognizedValid) {
  score = Number(score) || 0;
  if (!recognizedValid) return 'high';
  if (score >= 85) return 'low';
  if (score >= 65) return 'medium';
  if (score >= 40) return 'high';
  return 'critical';
}

function fieldRiskPercent(score, missingCount, highCount) {
  score = Number(score) || 0;
  var fromScore = Math.max(0, Math.min(100, 100 - score));
  var fromGaps = Math.min(100, missingCount * 12 + highCount * 10);
  return Math.round(Math.max(fromScore, fromGaps));
}

function auditText(text) {
  if (!text || text.trim().length < 50) {
    return { ok: false, reason: 'unreadable', message: 'Document text too short for audit' };
  }

  var classification = classifyDocument(text);
  if (classification.docType === 'UNKNOWN' || !classification.specId) {
    return {
      ok: false,
      reason: 'unknown_type',
      message: 'Document does not match any of the six SIFCO paper types from your training notebook.',
      classification: classification,
    };
  }

  var fields = extractFields(text);
  var issues = checkDocument(text, classification.docType, fields);
  var status = statusFromIssues(issues);

  return {
    ok: status !== 'REJECTED',
    accepted: status !== 'REJECTED',
    reason: status === 'REJECTED' ? 'fraud_or_critical' : 'notebook_match',
    docType: classification.docType,
    specId: classification.specId,
    docTypeName: classification.docTypeName,
    confidence: classification.confidence,
    status: status,
    fields: fields,
    issues: issues,
    complianceScore: complianceScoreFromStatus(status, issues, issuesToMissingFields(issues)),
    message: buildMessage(classification, status, issues),
  };
}

function buildMessage(classification, status, issues) {
  var name = classification.docTypeName || classification.specId;
  if (status === 'APPROVED') {
    return 'SIFCO ' + name + ' recognized (' + classification.confidence + '% match) — all notebook checks passed.';
  }
  if (status === 'WARNING') {
    return 'SIFCO ' + name + ' recognized (' + classification.confidence + '% match) — approved with warnings.';
  }
  if (status === 'FLAGGED') {
    return 'SIFCO ' + name + ' recognized (' + classification.confidence + '% match) — flagged for manual review.';
  }
  var critical = issues.filter(function (i) { return i.severity === 'CRITICAL'; });
  return 'SIFCO document rejected — ' + (critical[0] ? critical[0].message : 'critical validation failed');
}

function issuesToViolations(issues) {
  return (issues || []).map(function (i) {
    return {
      code: 'NB-' + (i.check || 'CHECK').replace(/\s+/g, '-').toUpperCase(),
      title: i.check,
      summary: i.message,
      severity: i.severity,
    };
  });
}

function issuesToMissingFields(issues) {
  var missing = [];
  (issues || []).forEach(function (i) {
    var sev = i.severity || 'MEDIUM';
    if (i.check === 'Required Fields' && i.message && sev !== 'LOW') {
      var match = i.message.match(/Missing:\s*(.+)/i);
      if (match) {
        match[1].split(/,\s*/).forEach(function (f) {
          if (f && missing.indexOf(f) < 0) missing.push(f.trim());
        });
      }
    } else if ((sev === 'HIGH' || sev === 'CRITICAL') &&
      /missing|blank|not found|not readable|not in document/i.test(i.message || '')) {
      var label = i.check + (i.message ? ': ' + i.message : '');
      if (missing.indexOf(label) < 0) missing.push(label);
    }
  });
  return missing;
}

function hasBlockingIssues(issues) {
  return (issues || []).some(function (i) {
    if (i.severity === 'CRITICAL') return true;
    if (i.severity !== 'HIGH') return false;
    return /format invalid \(expected 4 letters|format invalid \(expected e.g\. DXB|Package total mismatch|AI-generated text detected/i.test(i.message || '');
  });
}

function hasMandatoryMissing(missingFields, issues) {
  issues = issues || [];
  missingFields = missingFields || [];
  if (issues.some(function (i) { return i.severity === 'CRITICAL'; })) return true;
  if (issues.some(function (i) {
    return i.severity === 'HIGH' &&
      /Invoice number missing or not readable|format invalid \(expected 6|Package total mismatch|Container.*format invalid|BL.*format invalid/i.test(i.message || '');
  })) return true;
  return false;
}

module.exports = {
  loadConfig: loadConfig,
  clearCache: clearCache,
  classifyDocument: classifyDocument,
  extractFields: extractFields,
  checkDocument: checkDocument,
  auditText: auditText,
  issuesToViolations: issuesToViolations,
  issuesToMissingFields: issuesToMissingFields,
  hasBlockingIssues: hasBlockingIssues,
  hasMandatoryMissing: hasMandatoryMissing,
  hasCriticalIssues: hasCriticalIssues,
  complianceScoreFromFieldGaps: complianceScoreFromFieldGaps,
  riskLevelFromScore: riskLevelFromScore,
  fieldRiskPercent: fieldRiskPercent,
  complianceScoreFromStatus: complianceScoreFromStatus,
  partialRatio: partialRatio,
};
