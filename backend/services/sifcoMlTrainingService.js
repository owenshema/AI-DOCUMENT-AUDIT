'use strict';
/**
 * SIFCO ML Training Module
 * Trained ONLY on the 7 SIFCO reference documents provided by the organization.
 * Uses TF-IDF similarity + fingerprint markers (logos, signatures, layout phrases).
 * No generic policy rules — accept/reject is similarity to trained corpus.
 */
var fs = require('fs');
var path = require('path');

var TRAINING_DIR = path.join(__dirname, '..', 'data', 'training');
var CORPUS_PATH = path.join(TRAINING_DIR, 'corpus.json');
var auditReportTraining = require('./auditReportTrainingService');
var notebookTraining = require('./notebookTrainingService');
var notebookAudit = require('./sifcoNotebookAuditService');
var calcService = require('./documentCalculationService');

/** SIFCO daily papers — fingerprints extracted from reference documents */
var REFERENCE_SPECS = [
  {
    id: 'packing_list',
    label: 'Packing List',
    sourceFile: '01-packing-list-unique-hybrid.txt',
    referencePdf: 'UNIQUE HYBRID&EV SPARE PARTS PACKING LIST.pdf',
    purpose: 'Lists spare parts/packages, weights, container and B/L for shipment to Kigali.',
    titlePatterns: [/packing\s+list/i],
    brandMarkers: [/unique\s+hybrid/i, /ganador/i, /super\s+international/i, /kigali/i, /rwanda/i],
    signatureMarkers: [],
    requiredMarkers: [
      /packing\s+list/i,
      /(?:consignee|consigne)/i,
      /(?:method\s+of\s+loading|lcl|fcl)/i,
      /(?:weight|kgs)/i,
      /(?:container|[a-z]{4}\d{7})/i,
      /(?:bill\s+of\s+(?:loading|lading)|b\/l)/i,
      /(?:final\s+destination|kigali|mombasa)/i,
      /(?:pcs|packages|qty)/i,
    ],
    optionalMarkers: [/voyage/i, /vessel/i, /etd/i, /unique\s+hybrid/i, /dxb\d+/i],
    filenameHints: [/packing\s*list/i, /unique\s+hybrid/i],
  },
  {
    id: 'bill_of_lading',
    label: 'Bill of Lading (HBL)',
    sourceFile: '03-hbl-unique-hybrid.txt',
    referencePdf: 'UNIQUE HYBRID & EV SPARE PARTS HBL.pdf',
    purpose: 'Sea transport B/L: Al Shamali shipper, Super International presentation, ports, container.',
    titlePatterns: [/bill\s+of\s+lading/i, /\bb\/l\b/i],
    brandMarkers: [/al\s+shamali/i, /super\s+international/i, /superfreightservice/i],
    signatureMarkers: [/authorised\s+signatory|authorized\s+signatory/i, /for\s+al\s+shamali/i, /shipped\s+on\s+board/i],
    requiredMarkers: [
      /bill\s+of\s+lading/i,
      /(?:shipper|exporter)/i,
      /consignee/i,
      /(?:port\s+of\s+(?:loading|discharge)|jebel|mombasa|dar\s+es\s+sal)/i,
      /(?:container|[a-z]{4}\d{7}|seal)/i,
      /(?:notify\s+party|place\s+of\s+receipt)/i,
    ],
    optionalMarkers: [/freight\s*:\s*collect/i, /voyage/i, /vessel/i, /unique\s+hybrid/i, /dxb\d+/i],
    filenameHints: [/hbl/i, /bill\s+of\s+lading/i, /unique\s+hybrid/i],
  },
  {
    id: 'shipping_agreement',
    label: 'Shipping Agreement',
    sourceFile: '02-shipping-agreement-john.txt',
    referencePdf: 'shippimg agreement J0HN.pdf',
    purpose: 'SIFCO–client agreement for vehicle/goods shipment with freight line charges.',
    titlePatterns: [/shipp?ing\s+agreement/i],
    brandMarkers: [/super\s+international/i, /\bsifco\b/i, /superfreightservice/i, /121348946/],
    signatureMarkers: [/sifco\s+signature/i, /client.*signature/i],
    requiredMarkers: [
      /shipp?ing\s+agreement/i,
      /\bsifco\b/i,
      /super\s+international/i,
      /(?:sea\s+freight|road\s+freight)/i,
      /(?:b\/l\s+fee|local\s+charges)/i,
      /\btotal\b/i,
      /(?:jebel|mombasa|kigali|dubai)/i,
    ],
    optionalMarkers: [/hatangimana|john/i, /vessel/i, /dxb\d+/i],
    filenameHints: [/shipp?ing\s+agreement/i, /john/i, /sifco/i],
  },
  {
    id: 'freight_invoice',
    label: 'Freight Invoice (Super International)',
    sourceFile: '04-freight-invoice-unique-hybrid.txt',
    referencePdf: 'UNIQUE HYBRID.pdf',
    purpose: 'Super International freight billing to Unique Hybrid with bank details.',
    titlePatterns: [/\binvoice\b/i],
    brandMarkers: [/super\s+international/i, /superfreightservice/i, /121348946/i, /unique\s+hybrid/i, /ganador/i],
    signatureMarkers: [],
    requiredMarkers: [
      /(?:super\s+international|ganador)/i,
      /\binvoice\b/i,
      /(?:freight\s+charge|bl\s+fee|local\s+charge|sea\s+freight)/i,
      /(?:bank|a\/c\s+name|account)/i,
      /(?:jebel|kigali|mombasa)/i,
      /usd/i,
    ],
    optionalMarkers: [/war\s+cost/i, /unique\s+hybrid/i, /temu|ecmu/i, /dxb\d+/i],
    filenameHints: [/unique\s+hybrid/i, /freight/i, /invoice/i],
  },
  {
    id: 'trucking_invoice',
    label: 'Trucking Invoice',
    sourceFile: '05-trucking-invoice-ecmu5567458.txt',
    referencePdf: 'TRUCK INVOICE ECMU5567458.pdf',
    purpose: 'Top Sifco / Agape House inland transport Mombasa–Kigali.',
    titlePatterns: [/trucking\s+invoice/i],
    brandMarkers: [/agape\s+house/i, /top\s+sifco/i, /4003036334/i],
    signatureMarkers: [],
    requiredMarkers: [
      /trucking\s+invoice/i,
      /(?:top\s+sifco|agape\s+house)/i,
      /inland\s+transport/i,
      /(?:mombasa|kigali)/i,
      /(?:ecmu|temu|[a-z]{4}\d{7}|container|plate)/i,
      /usd/i,
    ],
    optionalMarkers: [/invoice\s+no/i],
    filenameHints: [/truck/i, /ecmu/i, /sifco/i],
  },
  {
    id: 'sea_freight_invoice',
    label: 'Sea Freight Invoice',
    sourceFile: '06-sea-freight-john.txt',
    referencePdf: 'JOHN SEA FREIGHT.pdf',
    purpose: 'Sea freight charge invoice with ports, B/L and consignee.',
    titlePatterns: [/sea\s+freight/i, /freight\s+invoce/i],
    brandMarkers: [/hatangimana|john/i, /ganador/i, /super\s+international/i, /\bsifco\b/i],
    signatureMarkers: [],
    requiredMarkers: [
      /(?:sea\s+freight|freight\s+invoce|freight\s+invoice)/i,
      /consignee/i,
      /port\s+of\s+(?:loading|discharge)/i,
      /(?:jebel|dar\s+es\s+salam|kigali|mombasa)/i,
      /(?:vessel|voyage|b\/l|bill\s+of\s+lading)/i,
    ],
    optionalMarkers: [/etd/i, /dxb\d+/i],
    filenameHints: [/sea\s+freight/i, /john/i, /freight/i],
  },
  {
    id: 'shipping_instruction',
    label: 'Shipping Instruction (SIFCO)',
    sourceFile: '07-shipping-instruction-sifco-3452.txt',
    referencePdf: '07-shipping-instruction-sifco-3452.png',
    purpose: 'Official SIFCO shipping instruction for container/RoRo/air with marks, charges, and delivery terms.',
    titlePatterns: [/shipping\s+instruction/i],
    brandMarkers: [/al\s+shamali/i, /\bsifco\b/i, /sifcoae/i, /freight\s+solution\s+to\s+africa/i],
    signatureMarkers: [/signature\s*\(?\s*h\.?o\.?d/i, /signature\s*\(?\s*customer/i, /signature\s*\(?\s*sales/i],
    requiredMarkers: [
      /shipping\s+instruction/i,
      /(?:al\s+shamali|\bsifco\b)/i,
      /(?:shipper|consignee)/i,
      /(?:port\s+of\s+discharge|final\s+place\s+of\s+delivery)/i,
      /(?:container|[a-z]{4}\d{7})/i,
      /(?:method\s+of\s+loading|lcl|fcl)/i,
      /(?:freight|b\/l\s+fee|wrc|ecs)/i,
      /(?:mark|description\s+of\s+goods)/i,
    ],
    optionalMarkers: [/trading\s+conditions/i, /serial\s+no/i, /mombasa|kgl|kigali|drc|bkv/i, /temu/i],
    filenameHints: [/shipping\s+instruction/i, /sifco/i, /instruction/i],
  },
];

var corpusCacheByKey = {};

function corpusCacheKey(options) {
  options = options || {};
  if (options.excludeSpecIds && options.excludeSpecIds.length) {
    return 'ex:' + options.excludeSpecIds.slice().sort().join(',');
  }
  return 'default';
}

function loadCorpus(options) {
  options = options || {};
  var cacheKey = corpusCacheKey(options);
  if (!options.skipCache && corpusCacheByKey[cacheKey]) {
    return corpusCacheByKey[cacheKey];
  }

  var excludeSet = {};
  (options.excludeSpecIds || []).forEach(function (id) { excludeSet[id] = true; });

  var docs = [];
  var allTokens = [];
  var docFreq = {};

  REFERENCE_SPECS.forEach(function (spec) {
    if (excludeSet[spec.id]) return;
    var filePath = path.join(TRAINING_DIR, spec.sourceFile);
    if (!fs.existsSync(filePath)) return;
    var raw = fs.readFileSync(filePath, 'utf8');
    raw += auditReportTraining.getSupplementTextForSpec(spec.id);
    raw += notebookTraining.getSupplementTextForSpec(spec.id);
    var tokens = tokenize(raw);
    allTokens = allTokens.concat(tokens);
    tokens.forEach(function (t, i, arr) {
      if (arr.indexOf(t) === i) docFreq[t] = (docFreq[t] || 0) + 1;
    });
    docs.push({
      spec: spec,
      raw: raw,
      normalized: normalizeText(raw),
      tokens: tokens,
    });
  });

  var vocab = {};
  Object.keys(docFreq).forEach(function (t) { vocab[t] = 1; });

  var nDocs = docs.length || 1;
  var idfMap = {};
  Object.keys(docFreq).forEach(function (term) {
    idfMap[term] = Math.log((nDocs + 1) / (docFreq[term] + 1)) + 1;
  });

  docs.forEach(function (d) {
    d.vector = buildTfVector(d.tokens, idfMap, vocab);
  });

  var corpus = {
    docs: docs,
    idfMap: idfMap,
    vocab: vocab,
    trainedAt: new Date().toISOString(),
    modelVersion: 'sifco-ml-v1',
    referenceCount: docs.length,
  };

  if (cacheKey === 'default' && options.writeCorpusJson !== false) {
    try {
      var excelLabels = auditReportTraining.loadAuditReportLabels();
      var notebookLabels = notebookTraining.loadNotebookTraining();
      fs.writeFileSync(CORPUS_PATH, JSON.stringify({
        modelVersion: corpus.modelVersion,
        trainedAt: corpus.trainedAt,
        referenceCount: corpus.referenceCount,
        auditReportRows: excelLabels.records.length,
        auditReportSource: excelLabels.meta && excelLabels.meta.sourceFile,
        notebookTrainingSource: notebookLabels.meta && notebookLabels.meta.source,
        notebookReferenceAudits: notebookLabels.meta && notebookLabels.meta.auditedCount,
        types: docs.map(function (d) {
          return {
            id: d.spec.id,
            label: d.spec.label,
            sourceFile: d.spec.sourceFile,
            referencePdf: d.spec.referencePdf,
            tokenCount: d.tokens.length,
          };
        }),
      }, null, 2));
    } catch (e) {
      console.warn('Could not write corpus.json:', e.message);
    }
  }

  corpusCacheByKey[cacheKey] = corpus;
  return corpus;
}

/** Acceptance uses DOCUMENT BODY only — file name is never required */
/** Notebook-first acceptance; ML fallback uses relaxed thresholds */
var ACCEPT_SIMILARITY = 0.40;
var ACCEPT_MARKER_RATIO = 0.50;
var ACCEPT_MIN_SIMILARITY = 0.22;
var ACCEPT_AMBIGUITY_MARGIN = 0.08;
var MIN_BODY_LENGTH = 80;
var REJECTED_COMPLIANCE_SCORE = 0;

var NOT_COMPANY_MESSAGE =
  'Document not from our company. This file does not match any SIFCO trained reference document ' +
  '(packing list, HBL, shipping agreement, shipping instruction, freight invoice, trucking invoice, or sea freight invoice).';

function specForId(id) {
  for (var i = 0; i < REFERENCE_SPECS.length; i++) {
    if (REFERENCE_SPECS[i].id === id) return REFERENCE_SPECS[i];
  }
  return null;
}

var SPEC_TO_NOTEBOOK_TYPE = {
  packing_list: 'PACKING_LIST',
  bill_of_lading: 'HBL',
  shipping_agreement: 'SHIPPING_AGREEMENT',
  freight_invoice: 'SIFCO_INVOICE',
  trucking_invoice: 'TRUCKING_INVOICE',
  sea_freight_invoice: 'FREIGHT_INVOICE',
  shipping_instruction: 'SHIPPING_INSTRUCTION',
};

function specIdToNotebookType(specId) {
  return SPEC_TO_NOTEBOOK_TYPE[specId] || null;
}

function runFullFieldValidation(documentText, specId, notebookResult) {
  var body = extractBodyTextForAudit(documentText || '');
  var docType = (notebookResult && notebookResult.docType) || specIdToNotebookType(specId);
  if (!docType) return { issues: [], fields: {}, missing_fields: [] };

  var fields = (notebookResult && notebookResult.fields) || notebookAudit.extractFields(body);
  var issues = notebookAudit.checkDocument(body, docType, fields);
  return {
    issues: issues,
    fields: fields,
    missing_fields: notebookAudit.issuesToMissingFields(issues),
    docType: docType,
  };
}

function buildRejectedInspection() {
  return {
    assessed: false,
    not_our_document: true,
    signature: null,
    stamp: null,
    organization: null,
    logo: null,
    purpose: null,
    request: null,
    dates: null,
    forgery_analysis: null,
  };
}

function buildAcceptedInspection(documentText, best) {
  var normalized = normalizeText(documentText);
  return {
    assessed: true,
    not_our_document: false,
    signature: { present: !!(best && best.signatureFound), issues: [] },
    stamp: {
      present: /shipped\s+on\s+board|seal|stamp/i.test(normalized),
      stamp_type: 'Seal',
      issues: [],
    },
    forgery_analysis: null,
    organization: {
      present: !!(best && best.markerBrand >= 50),
      primary: best && best.markerBrand >= 50 ? 'SIFCO partner branding detected' : null,
    },
    purpose: {
      present: !!(best && best.purpose),
      subject: best ? best.purpose : null,
      purpose: best ? best.purpose : null,
    },
    request: { has_request: false, approval_status: null },
    dates: { all_dates: [], issues: [] },
  };
}

function buildCompanyIncompleteInspection(documentText, best) {
  var insp = buildAcceptedInspection(documentText, best);
  insp.not_our_document = false;
  return insp;
}

function resolveCompanyDocumentMatch(mlResult, notebookResult, notebookStructuralOk, normalizedText) {
  if (mlResult.accepted && mlResult.bestMatch) {
    return { isCompany: true, specId: mlResult.bestMatch.id, best: mlResult.bestMatch, via: 'ml' };
  }
  if (notebookResult.specId && notebookStructuralOk && notebookResult.confidence >= 50) {
    var nbScore = (mlResult.allScores || []).find(function (s) { return s.id === notebookResult.specId; });
    return {
      isCompany: true,
      specId: notebookResult.specId,
      best: nbScore || mlResult.bestMatch,
      via: 'notebook',
    };
  }
  if (mlResult.bestMatch &&
    mlResult.bestMatch.markerRequired >= 55 &&
    mlResult.bestMatch.markerBrand >= 25 &&
    mlResult.bestMatch.combinedScore >= 0.38 &&
    passesCompanyCriteria(mlResult.bestMatch, normalizedText || '')) {
    return {
      isCompany: true,
      specId: mlResult.bestMatch.id,
      best: mlResult.bestMatch,
      via: 'ml-strong-markers',
    };
  }
  return { isCompany: false, specId: null, best: mlResult.bestMatch, via: null };
}

function passesCompanyCriteria(best, normalizedText) {
  if (!best) return false;
  var sifcoCore = /\bsifco\b|super\s+international|al\s+shamali|agape\s+house|top\s+sifco|ganador|superfreightservice/i.test(normalizedText);
  if (best.markerRequired >= 62) return true;
  if (sifcoCore && best.markerRequired >= 45) return true;
  if (best.markerBrand >= 30 && best.markerRequired >= 50) return true;

  var spec = specForId(best.id);
  if (spec && spec.signatureMarkers && spec.signatureMarkers.length > 0) {
    if (!best.signatureFound && best.markerSignature < 35 && !sifcoCore) return false;
  }

  if (best.id === 'bill_of_lading') {
    if (!sifcoCore && !/shipped\s+on\s+board|seal|authorised\s+signatory|authorized\s+signatory|bill\s+of\s+lading/i.test(normalizedText)) {
      return false;
    }
  }

  if (best.id === 'shipping_agreement') {
    if (!/\bsifco\b/i.test(normalizedText) && !/super\s+international/i.test(normalizedText)) {
      return false;
    }
  }

  if (best.id === 'shipping_instruction') {
    if (!/\bsifco\b/i.test(normalizedText) && !/al\s+shamali/i.test(normalizedText)) {
      return false;
    }
  }

  return sifcoCore || best.markerBrand >= 25;
}

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/\r/g, '\n')
    .replace(/[^\w\s@./\-#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalizeText(text)
    .split(/\s+/)
    .filter(function (w) { return w.length > 2; });
}

function buildTfVector(tokens, idfMap, vocab) {
  var tf = {};
  tokens.forEach(function (t) {
    tf[t] = (tf[t] || 0) + 1;
  });
  var vec = {};
  var norm = 0;
  Object.keys(tf).forEach(function (term) {
    if (!vocab[term]) return;
    var weight = tf[term] * (idfMap[term] || 1);
    vec[term] = weight;
    norm += weight * weight;
  });
  return { vec: vec, norm: Math.sqrt(norm) || 1 };
}

function cosineSimilarity(a, b) {
  var dot = 0;
  Object.keys(a.vec).forEach(function (k) {
    if (b.vec[k]) dot += a.vec[k] * b.vec[k];
  });
  return dot / (a.norm * b.norm);
}

function scoreMarkers(text, patterns) {
  if (!patterns.length) return 1;
  var hit = patterns.filter(function (p) { return p.test(text); }).length;
  return hit / patterns.length;
}

/** True when audit only received upload metadata (no real PDF body) */
function isMetadataOnlyInput(text) {
  var n = normalizeText(text);
  if (n.length < 30) return true;
  var hasOrgContent = /sifco|super\s+international|al\s+shamali|packing\s+list|bill\s+of\s+lading|trucking\s+invoice|shipp?ing\s+agreement|freight\s+invoce|unique\s+hybrid|agape\s+house|top\s+sifco/i.test(n);
  if (hasOrgContent) return false;
  var metaLines = (n.match(/^(title|file|category|department|status|description|classification|date):/gim) || []).length;
  return metaLines >= 2 && n.length < 350;
}

/** Strip upload metadata lines so renamed filenames never influence scoring */
function extractBodyTextForAudit(documentText) {
  var lines = (documentText || '').split(/\n/);
  var body = lines.filter(function (line) {
    return !/^\s*(title|file|category|department|status|description|classification|date)\s*:/i.test(line);
  }).join('\n');
  return body.trim();
}

function classifyDocument(documentText, context) {
  context = context || {};
  var text = extractBodyTextForAudit(documentText || '');
  var normalized = normalizeText(text);

  if (isMetadataOnlyInput(documentText || '')) {
    return {
      accepted: false,
      reason: 'unreadable',
      message:
        'Could not read document content from the PDF. The file name is not used — renaming does not affect the audit. ' +
        'Upload a searchable PDF with SIFCO letterhead, amounts, and B/L text inside the file.',
      bestMatch: null,
      similarity: 0,
    };
  }

  if (!normalized || normalized.length < MIN_BODY_LENGTH) {
    return {
      accepted: false,
      reason: 'unreadable',
      message:
        'The document body is empty or too short. The file name is not used for validation — upload a clear PDF with readable text.',
      bestMatch: null,
      similarity: 0,
    };
  }

  var corpus = loadCorpus(context.corpusOptions || {});
  if (!corpus.docs.length) {
    return {
      accepted: false,
      reason: 'no_training',
      message: 'Training data is missing. Contact administrator to rebuild the SIFCO reference corpus.',
      bestMatch: null,
      similarity: 0,
    };
  }

  var inputTokens = tokenize(text);
  var inputVec = buildTfVector(inputTokens, corpus.idfMap, corpus.vocab);

  var scores = corpus.docs.map(function (ref) {
    var sim = cosineSimilarity(inputVec, ref.vector);
    var titleHit = ref.spec.titlePatterns.some(function (p) { return p.test(normalized); });
    var markerRequired = scoreMarkers(normalized, ref.spec.requiredMarkers);
    var markerBrand = scoreMarkers(normalized, ref.spec.brandMarkers);
    var markerSig = scoreMarkers(normalized, ref.spec.signatureMarkers);
    var markerOptional = scoreMarkers(normalized, ref.spec.optionalMarkers);
    var extraMarkers = auditReportTraining.getExtraMarkersForSpec(ref.spec.id);
    var notebookMarkers = notebookTraining.getExtraMarkersForSpec(ref.spec.id);
    var markerExcel = extraMarkers.length ? scoreMarkers(normalized, extraMarkers) : 0;
    var markerNotebook = notebookMarkers.length ? scoreMarkers(normalized, notebookMarkers) : 0;
    var titleBoost = titleHit ? 0.08 : 0;
    var hintBoost = 0;
    if (context.documentTypeHint && context.documentTypeHint !== 'any' && ref.spec.id === context.documentTypeHint) {
      hintBoost = 0.06;
    }
    var combined =
      sim * 0.46 +
      markerRequired * 0.34 +
      markerBrand * 0.1 +
      markerSig * 0.05 +
      markerOptional * 0.04 +
      markerExcel * 0.03 +
      markerNotebook * 0.03 +
      titleBoost +
      hintBoost;

    return {
      id: ref.spec.id,
      label: ref.spec.label,
      purpose: ref.spec.purpose,
      referencePdf: ref.spec.referencePdf,
      similarity: Math.round(sim * 1000) / 1000,
      combinedScore: Math.round(combined * 1000) / 1000,
      markerRequired: Math.round(markerRequired * 100),
      markerBrand: Math.round(markerBrand * 100),
      markerSignature: Math.round(markerSig * 100),
      titleDetected: titleHit,
      matchedBrands: ref.spec.brandMarkers.filter(function (p) { return p.test(normalized); }).map(function () { return 'brand'; }),
      signatureFound: ref.spec.signatureMarkers.some(function (p) { return p.test(normalized); }),
      missingMarkers: ref.spec.requiredMarkers
        .filter(function (p) { return !p.test(normalized); })
        .map(function (p) { return p.source || p.toString(); }),
    };
  });

  scores.sort(function (a, b) { return b.combinedScore - a.combinedScore; });
  var best = scores[0];
  var second = scores[1];

  var markerOk = best.markerRequired >= ACCEPT_MARKER_RATIO * 100;
  var similarityOk = best.similarity >= ACCEPT_MIN_SIMILARITY;
  var combinedOk = best.combinedScore >= ACCEPT_SIMILARITY;
  var titleOrStrongMarkers = best.titleDetected || best.markerRequired >= 62;

  var accepted = combinedOk && markerOk && similarityOk && titleOrStrongMarkers;

  if (accepted && second) {
    var margin = best.combinedScore - second.combinedScore;
    if (margin < ACCEPT_AMBIGUITY_MARGIN) {
      accepted = false;
    }
    if (margin < 0.12 && second.combinedScore >= 0.45 && second.markerRequired >= 65) {
      accepted = false;
    }
  }

  if (accepted && best.markerBrand < 20 && best.markerRequired < 55) {
    accepted = false;
  }

  var companyCriteriaFailed = false;
  if (accepted && best.markerRequired < 72 && !passesCompanyCriteria(best, normalized)) {
    accepted = false;
    companyCriteriaFailed = true;
  }

  return {
    accepted: accepted,
    reason: accepted ? 'trained_match' : (companyCriteriaFailed ? 'company_criteria_failed' : 'no_trained_match'),
    bestMatch: best,
    allScores: scores,
    matchedBy: 'document_content_only',
    similarity: best.similarity,
    combinedScore: best.combinedScore,
  };
}

/**
 * Run trained audit — notebook rules first (Untitled3.ipynb), ML similarity as fallback.
 */
function runTrainedAudit(documentText, context) {
  context = context || {};
  var mlResult = classifyDocument(documentText, context);
  var notebookResult = notebookAudit.auditText(extractBodyTextForAudit(documentText || ''));

  var accepted = false;
  var best = mlResult.bestMatch;
  var auditEngine = 'sifco-notebook-trained';
  var compliance_score = REJECTED_COMPLIANCE_SCORE;
  var message;
  var violations = [];
  var documentType = 'unknown';
  var paperLabel = null;
  var paperPurpose = null;
  var referencePdf = null;

  // The notebook engine classifies by keyword overlap and can still latch onto an
  // unrelated document. Before trusting it, require real structural/brand support
  // from the ML scorer for the SAME paper type (genuine SIFCO papers score 80-100
  // on required markers / branding; unrelated documents score ~10-15).
  var nbMlScore = (notebookResult.ok && notebookResult.specId)
    ? (mlResult.allScores || []).find(function (s) { return s.id === notebookResult.specId; })
    : null;
  var mlSameType = nbMlScore || (mlResult.bestMatch && notebookResult.specId && mlResult.bestMatch.id === notebookResult.specId ? mlResult.bestMatch : null);
  var notebookStructuralOk = false;
  if (notebookResult.specId) {
    if (mlSameType) {
      notebookStructuralOk = mlSameType.markerRequired >= 35 || mlSameType.markerBrand >= 35 ||
        mlSameType.combinedScore >= 0.40;
    } else {
      notebookStructuralOk = notebookResult.confidence >= 55;
    }
  } else if (mlResult.accepted && mlResult.bestMatch) {
    notebookStructuralOk = true;
  }

  var bodyText = extractBodyTextForAudit(documentText || '');
  var normalizedBody = normalizeText(bodyText);
  var company = resolveCompanyDocumentMatch(mlResult, notebookResult, notebookStructuralOk, normalizedBody);

  if (!company.isCompany) {
    var rejectMessage = NOT_COMPANY_MESSAGE;
    if (mlResult.reason === 'unreadable' || notebookResult.reason === 'unreadable') {
      rejectMessage = mlResult.message || notebookResult.message || rejectMessage;
    } else if (company.best && company.best.label) {
      rejectMessage += ' Closest trained type: ' + company.best.label +
        ' (' + Math.round((company.best.combinedScore || 0) * 100) + '% similarity).';
    }
    violations = [{
      code: 'NOT-COMPANY-DOC',
      title: 'Document not from our company',
      summary: rejectMessage,
      severity: 'CRITICAL',
      detail: company.best
        ? 'Closest type: ' + company.best.label + ' (' + Math.round((company.best.combinedScore || 0) * 100) + '%).'
        : 'Upload a document that matches one of the six SIFCO trained reference formats.',
    }];
    return {
      document_type: 'unknown',
      organization_match: false,
      trained_reference_match: false,
      organization_message: rejectMessage,
      organization_category: null,
      organization_training: {
        paper_label: null,
        paper_purpose: null,
        training_profile: 'sifco-notebook-v2',
        ml_training: {
          model: 'sifco-ml-v1',
          best_match: company.best ? {
            type: company.best.id,
            label: company.best.label,
            reference_pdf: company.best.referencePdf,
            similarity_percent: Math.round((company.best.similarity || 0) * 100),
            confidence_percent: Math.round((company.best.combinedScore || 0) * 100),
            marker_match_percent: company.best.markerRequired,
            brand_match_percent: company.best.markerBrand,
          } : null,
        },
        reference_pdf: company.best ? company.best.referencePdf : null,
        similarity_percent: company.best ? Math.round((company.best.similarity || 0) * 100) : 0,
        confidence_percent: REJECTED_COMPLIANCE_SCORE,
        field_risk_percent: 100,
        missing_field_count: 0,
        valid_but_incomplete: false,
      },
      compliance_score: REJECTED_COMPLIANCE_SCORE,
      ai_generated_percentage: 0,
      ai_threshold_exceeded: false,
      ai_validity_percentage: REJECTED_COMPLIANCE_SCORE,
      risk_level: 'high',
      sentiment: 'negative',
      summary: rejectMessage,
      missing_fields: [],
      extracted_fields: {
        paper_type: null,
        matched_reference: null,
        confidence: REJECTED_COMPLIANCE_SCORE + '%',
        notebook_fields: {},
      },
      violations: violations,
      inconsistencies: violations,
      recommendations: [rejectMessage],
      fraud_flags: violations,
      policy_rules_checked: 0,
      engine: 'sifco-ml-trained',
      document_inspection: buildRejectedInspection(),
    };
  }

  var matchedSpecId = company.specId;
  best = company.best || nbMlScore || mlResult.bestMatch;
  auditEngine = company.via === 'notebook' ? 'sifco-notebook-trained' : 'sifco-ml-trained';

  var fieldValidation = runFullFieldValidation(documentText, matchedSpecId, notebookResult);
  var allIssues = fieldValidation.issues.length ? fieldValidation.issues : (notebookResult.issues || []);
  var missing_fields = notebookAudit.issuesToMissingFields(allIssues);
  var calculation_errors = calcService.calculationErrorsFromIssues(allIssues);
  var fieldBlock = notebookAudit.hasBlockingIssues(allIssues);
  var criticalIssues = notebookAudit.hasCriticalIssues(allIssues);
  var mandatoryMissing = notebookAudit.hasMandatoryMissing(missing_fields, allIssues);
  var validButIncomplete = !!(mandatoryMissing && !criticalIssues);
  violations = notebookAudit.issuesToViolations(allIssues);

  if (!fieldBlock && !mandatoryMissing) {
    accepted = true;
  } else {
    accepted = false;
  }

  compliance_score = notebookAudit.complianceScoreFromFieldGaps(allIssues, missing_fields, {
    recognizedAsSifco: true,
    hasCritical: criticalIssues,
  });
  documentType = matchedSpecId;
  paperLabel = notebookResult.docTypeName || (best && best.label) || documentType;
  var passSpec = specForId(documentType);
  paperPurpose = passSpec ? passSpec.purpose : null;
  referencePdf = passSpec ? passSpec.referencePdf : null;

  if (accepted) {
    message = 'Validated as SIFCO ' + paperLabel + ' — compliance ' + compliance_score +
      '% (' + missing_fields.length + ' missing field(s) checked against trained references).';
    if (missing_fields.length) {
      message += ' Notes: ' + missing_fields.slice(0, 3).join(', ') + '.';
    }
  } else if (criticalIssues) {
    message = 'SIFCO document — critical validation failed. Compliance ' + compliance_score + '%.';
    var crit = allIssues.filter(function (i) { return i.severity === 'CRITICAL'; })[0];
    if (crit) message += ' ' + crit.message;
  } else {
    message = 'SIFCO ' + (paperLabel || documentType) + ' — compliance ' + compliance_score +
      '% based on ' + missing_fields.length + ' missing/incomplete field(s) against trained references.';
    if (missing_fields.length) {
      message += ' Missing: ' + missing_fields.slice(0, 8).join(', ') + '.';
    } else {
      var topIssue = allIssues.filter(function (i) { return i.severity === 'HIGH'; })[0];
      if (topIssue) message += ' ' + topIssue.message;
    }
  }

  var trainingDetail = {
    model: 'sifco-ml-v1',
    trained_on: REFERENCE_SPECS.map(function (s) { return s.referencePdf; }),
    reference_count: loadCorpus().referenceCount,
    notebook_audit: notebookResult.ok || notebookResult.reason ? {
      status: notebookResult.status,
      confidence_percent: notebookResult.confidence,
      doc_type_name: notebookResult.docTypeName,
      issue_count: allIssues.length,
      missing_field_count: missing_fields.length,
      field_validation_blocked: fieldBlock,
    } : null,
    best_match: best ? {
      type: best.id,
      label: best.label || paperLabel,
      reference_pdf: best.referencePdf || referencePdf,
      similarity_percent: Math.round((best.similarity || 0) * 100),
      confidence_percent: Math.round((best.combinedScore || notebookResult.confidence || 0) * (best.combinedScore ? 100 : 1)),
      marker_match_percent: best.markerRequired,
      brand_match_percent: best.markerBrand,
      signature_detected: best.signatureFound,
      title_detected: best.titleDetected,
    } : (notebookResult.specId ? {
      type: notebookResult.specId,
      label: paperLabel,
      reference_pdf: referencePdf,
      confidence_percent: notebookResult.confidence,
    } : null),
    all_type_scores: (mlResult.allScores || []).map(function (s) {
      return {
        type: s.id,
        label: s.label,
        similarity_percent: Math.round(s.similarity * 100),
        confidence_percent: Math.round(s.combinedScore * 100),
      };
    }),
  };

  var orgRecognized = true;
  var highCount = allIssues.filter(function (i) { return i.severity === 'HIGH'; }).length;
  var fieldRiskPct = notebookAudit.fieldRiskPercent(compliance_score, missing_fields.length, highCount);
  var riskLevel = notebookAudit.riskLevelFromScore(compliance_score, orgRecognized);

  return {
    document_type: documentType,
    organization_match: true,
    trained_reference_match: accepted,
    organization_message: message,
    organization_category: orgRecognized ? (documentType || matchedSpecId) : null,
    organization_training: {
      paper_label: paperLabel || (best ? best.label : null),
      paper_purpose: paperPurpose || (best ? best.purpose : null),
      training_profile: 'sifco-notebook-v2',
      ml_training: trainingDetail,
      reference_pdf: referencePdf || (best ? best.referencePdf : null),
      similarity_percent: best ? Math.round((best.similarity || 0) * 100) : (notebookResult.confidence || 0),
      confidence_percent: orgRecognized ? compliance_score : REJECTED_COMPLIANCE_SCORE,
      signature_detected: best ? best.signatureFound : false,
      brand_match_percent: best ? best.markerBrand : 0,
      field_risk_percent: fieldRiskPct,
      missing_field_count: missing_fields.length,
      valid_but_incomplete: validButIncomplete,
    },
    compliance_score: compliance_score,
    ai_generated_percentage: 0,
    ai_threshold_exceeded: false,
    ai_validity_percentage: compliance_score,
    risk_level: riskLevel,
    sentiment: accepted ? 'positive' : (validButIncomplete ? 'neutral' : 'negative'),
    summary: message,
    missing_fields: missing_fields,
    calculation_errors: calculation_errors,
    extracted_fields: {
      paper_type: paperLabel || (best ? best.label : null),
      matched_reference: referencePdf || (best ? best.referencePdf : null),
      confidence: compliance_score + '%',
      notebook_fields: fieldValidation.fields || notebookResult.fields || {},
    },
    violations: violations,
    inconsistencies: violations.length ? violations : [],
    recommendations: violations.length
      ? violations.map(function (v) { return v.summary; })
      : [],
    fraud_flags: violations.filter(function (v) { return v.severity === 'CRITICAL'; }),
    policy_rules_checked: allIssues.length,
    engine: auditEngine,
    document_inspection: accepted
      ? buildAcceptedInspection(documentText, best || { id: documentType, label: paperLabel, purpose: paperPurpose })
      : buildCompanyIncompleteInspection(documentText, best || { id: documentType, label: paperLabel, purpose: paperPurpose }),
  };
}

function clearCorpusCache() {
  corpusCacheByKey = {};
}

function rebuildTrainingFromDisk() {
  clearCorpusCache();
  auditReportTraining.clearCache();
  notebookTraining.clearCache();
  notebookAudit.clearCache();
  return loadCorpus();
}

module.exports = {
  runTrainedAudit: runTrainedAudit,
  classifyDocument: classifyDocument,
  loadCorpus: loadCorpus,
  clearCorpusCache: clearCorpusCache,
  rebuildTrainingFromDisk: rebuildTrainingFromDisk,
  REFERENCE_SPECS: REFERENCE_SPECS,
  ACCEPT_SIMILARITY: ACCEPT_SIMILARITY,
  ACCEPT_MARKER_RATIO: ACCEPT_MARKER_RATIO,
  ACCEPT_MIN_SIMILARITY: ACCEPT_MIN_SIMILARITY,
};
