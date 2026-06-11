'use strict';
/**
 * Runtime audit engine from Untitled3.ipynb — keyword classification + field/fraud checks.
 * Accepts valid SIFCO document types even when invoice details differ from reference PDFs.
 */
var fs = require('fs');
var path = require('path');
var notebookTraining = require('./notebookTrainingService');

var LABELS_PATH = path.join(__dirname, '..', 'data', 'training', 'labels', 'notebook_training.json');

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
  if (confidence < 20) return { docType: 'UNKNOWN', specId: null, confidence: 0, scores: scores };

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
    (textUpper.match(/(?:TIN|NIF)\s*(?:NUMBER)?\s*[:\-]?\s*(\d{6,12})/g) || [])
      .map(function (m) { return m.replace(/.*?(\d{6,12})$/, '$1'); })
  );

  fields.bl_numbers = unique(
    (textUpper.match(/(?:BILL OF LAD(?:ING|ING NO)|BILL OF LOAD(?:ING)?|BL NUMBER|BL NO|B\/L)[:\s#]*([A-Z]{2,4}\d{6,10})/g) || [])
      .map(function (m) {
        var hit = m.match(/([A-Z]{2,4}\d{6,10})$/);
        return hit ? hit[1] : null;
      }).filter(Boolean)
  );

  var container = textUpper.match(/CONTAINER\s*(?:NO|NUMBER|N[O°]?)[:\s]*([A-Z]{4}\d{7})/);
  fields.container = container ? container[1] : null;

  var vessel = textUpper.match(/(?:NAME OF VESSEL|VESSEL\s*VOYAGE)[:\s]*([\w\s]+?)(?:\n|\/)/);
  fields.vessel = vessel ? vessel[1].trim() : null;

  var voyage = textUpper.match(/VOYAGE\s*(?:NUMBER)?[:\s]*(\w+)/);
  fields.voyage = voyage ? voyage[1].trim() : null;

  var consignee = textUpper.match(/CONSIGN(?:EE|E)[:\s]+([^\n]+)/);
  fields.consignee = consignee ? consignee[1].trim() : null;

  fields.dates = unique((text.match(/\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b/g) || []));

  return fields;
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

  var validTins = template.valid_tins || [];
  var foundTins = fields.tin_numbers || [];
  if (validTins.length) {
    if (!foundTins.length) {
      issues.push({ severity: 'HIGH', check: 'TIN', message: 'TIN number missing for this document type' });
    } else {
      foundTins.forEach(function (tin) {
        if (!allTins[tin]) {
          issues.push({ severity: 'CRITICAL', check: 'TIN', message: "TIN '" + tin + "' is not a valid SIFCO partner TIN" });
        } else if (validTins.indexOf(tin) < 0) {
          issues.push({ severity: 'HIGH', check: 'TIN', message: "TIN '" + tin + "' is valid but not expected for this paper type" });
        }
      });
    }
  }

  var missing = (template.required_fields || []).filter(function (field) {
    return !fieldPresent(textUpper, field);
  });
  if (missing.length) {
    issues.push({ severity: 'MEDIUM', check: 'Required Fields', message: 'Missing: ' + missing.slice(0, 6).join(', ') });
  }

  (fields.bl_numbers || []).forEach(function (bl) {
    if (known.bl_numbers && known.bl_numbers.indexOf(bl) < 0) {
      issues.push({ severity: 'HIGH', check: 'BL Number', message: "BL '" + bl + "' is not in the known shipment BL list" });
    }
  });

  if (fields.container && known.containers && known.containers.indexOf(fields.container) < 0) {
    issues.push({ severity: 'HIGH', check: 'Container', message: "Container '" + fields.container + "' is not in known shipment containers" });
  }

  if (fields.vessel && known.vessels) {
    var vesselOk = known.vessels.some(function (v) { return partialRatio(fields.vessel, v) > 80; });
    if (!vesselOk) {
      issues.push({ severity: 'MEDIUM', check: 'Vessel', message: "Vessel '" + fields.vessel + "' does not match known vessels" });
    }
  }

  if (fields.voyage && known.voyages && known.voyages.indexOf(fields.voyage) < 0) {
    issues.push({ severity: 'MEDIUM', check: 'Voyage', message: "Voyage '" + fields.voyage + "' is not in known voyages" });
  }

  var issuers = template.valid_issuers || [];
  if (issuers.length) {
    var issuerFound = issuers.some(function (issuer) {
      return partialRatio(issuer.toUpperCase(), textUpper) > 75;
    });
    if (!issuerFound) {
      issues.push({ severity: 'HIGH', check: 'Issuer', message: 'Expected company name not found: ' + issuers.join(' or ') });
    }
  }

  (template.required_signatures || []).forEach(function (sig) {
    if (textUpper.indexOf(sig.toUpperCase()) < 0) {
      issues.push({ severity: 'MEDIUM', check: 'Signature', message: "Missing signature field: '" + sig + "'" });
    }
  });

  var aiSignals = ['as an ai', 'language model', 'chatgpt', 'openai', 'artificial intelligence assistant'];
  aiSignals.forEach(function (signal) {
    if ((text || '').toLowerCase().indexOf(signal) >= 0) {
      issues.push({ severity: 'CRITICAL', check: 'AI Content', message: 'AI-generated text detected' });
    }
  });

  if (!fields.dates || !fields.dates.length) {
    issues.push({ severity: 'MEDIUM', check: 'Date', message: 'No date found in document' });
  }

  return issues;
}

function statusFromIssues(issues) {
  if (issues.some(function (i) { return i.severity === 'CRITICAL'; })) return 'REJECTED';
  if (issues.some(function (i) { return i.severity === 'HIGH'; })) return 'FLAGGED';
  if (issues.some(function (i) { return i.severity === 'MEDIUM'; })) return 'WARNING';
  return 'APPROVED';
}

function complianceScoreFromStatus(status) {
  if (status === 'APPROVED') return 100;
  if (status === 'WARNING') return 82;
  if (status === 'FLAGGED') return 65;
  return 10;
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
    complianceScore: complianceScoreFromStatus(status),
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

module.exports = {
  loadConfig: loadConfig,
  clearCache: clearCache,
  classifyDocument: classifyDocument,
  extractFields: extractFields,
  checkDocument: checkDocument,
  auditText: auditText,
  issuesToViolations: issuesToViolations,
  complianceScoreFromStatus: complianceScoreFromStatus,
};
