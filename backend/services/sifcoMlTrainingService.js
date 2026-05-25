'use strict';
/**
 * SIFCO ML Training Module
 * Trained ONLY on the 6 reference PDFs provided by the organization.
 * Uses TF-IDF similarity + fingerprint markers (logos, signatures, layout phrases).
 * No generic policy rules — accept/reject is similarity to trained corpus.
 */
var fs = require('fs');
var path = require('path');

var TRAINING_DIR = path.join(__dirname, '..', 'data', 'training');
var CORPUS_PATH = path.join(TRAINING_DIR, 'corpus.json');

/** Six SIFCO daily papers — fingerprints extracted from your reference PDFs */
var REFERENCE_SPECS = [
  {
    id: 'packing_list',
    label: 'Packing List',
    sourceFile: '01-packing-list-unique-hybrid.txt',
    referencePdf: 'UNIQUE HYBRID&EV SPARE PARTS PACKING LIST.pdf',
    purpose: 'Lists spare parts/packages, weights, container and B/L for shipment to Kigali.',
    titlePatterns: [/packing\s+list/i],
    brandMarkers: [/unique\s+hybrid/i, /kigali/i, /rwanda/i],
    signatureMarkers: [],
    requiredMarkers: [
      /packing\s+list/i,
      /(?:consignee|consigne)/i,
      /(?:method\s+of\s+loading|lcl|fcl)/i,
      /(?:weight|kgs)/i,
      /(?:container|temu|ecmu)/i,
      /(?:bill\s+of\s+loading|b\/l|dxb\d+)/i,
      /(?:final\s+destination|kigali)/i,
      /(?:pcs|packages|qty)/i,
    ],
    optionalMarkers: [/voyage/i, /vessel/i, /etd/i],
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
      /(?:port\s+of\s+(?:loading|discharge)|jebel|mombasa)/i,
      /(?:container|temu|ecmu|seal)/i,
      /dxb\d{5,}/i,
      /unique\s+hybrid/i,
    ],
    optionalMarkers: [/freight\s*:\s*collect/i, /voyage/i, /vessel/i],
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
    brandMarkers: [/super\s+international/i, /superfreightservice/i, /121348946/i, /unique\s+hybrid/i],
    signatureMarkers: [],
    requiredMarkers: [
      /super\s+international/i,
      /\binvoice\b/i,
      /unique\s+hybrid/i,
      /(?:freight\s+charge|bl\s+fee|local\s+charge)/i,
      /bank\s+of\s+kigali/i,
      /(?:jebel|kigali)/i,
      /usd/i,
    ],
    optionalMarkers: [/war\s+cost/i, /temu|ecmu/i],
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
      /(?:ecmu|container|plate)/i,
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
    brandMarkers: [/hatangimana|john/i],
    signatureMarkers: [],
    requiredMarkers: [
      /(?:sea\s+freight|freight\s+invoce)/i,
      /consignee/i,
      /port\s+of\s+(?:loading|discharge)/i,
      /(?:jebel|dar\s+es\s+salam|kigali)/i,
      /dxb\d+/i,
      /(?:vessel|voyage)/i,
    ],
    optionalMarkers: [/etd/i],
    filenameHints: [/sea\s+freight/i, /john/i, /freight/i],
  },
];

var corpusCache = null;
/** Acceptance uses DOCUMENT BODY only — file name is never required */
var ACCEPT_SIMILARITY = 0.24;
var ACCEPT_MARKER_RATIO = 0.45;

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

function loadCorpus() {
  if (corpusCache) return corpusCache;

  var docs = [];
  var allTokens = [];
  var docFreq = {};

  REFERENCE_SPECS.forEach(function (spec) {
    var filePath = path.join(TRAINING_DIR, spec.sourceFile);
    if (!fs.existsSync(filePath)) return;
    var raw = fs.readFileSync(filePath, 'utf8');
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

  corpusCache = {
    docs: docs,
    idfMap: idfMap,
    vocab: vocab,
    trainedAt: new Date().toISOString(),
    modelVersion: 'sifco-ml-v1',
    referenceCount: docs.length,
  };

  try {
    fs.writeFileSync(CORPUS_PATH, JSON.stringify({
      modelVersion: corpusCache.modelVersion,
      trainedAt: corpusCache.trainedAt,
      referenceCount: corpusCache.referenceCount,
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

  return corpusCache;
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

  if (!normalized || normalized.length < 20) {
    return {
      accepted: false,
      reason: 'unreadable',
      message:
        'The document body is empty or too short. The file name is not used for validation — upload a clear PDF with readable text.',
      bestMatch: null,
      similarity: 0,
    };
  }

  var corpus = loadCorpus();
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
    var titleBoost = titleHit ? 0.08 : 0;
    var combined =
      sim * 0.48 +
      markerRequired * 0.36 +
      markerBrand * 0.1 +
      markerSig * 0.05 +
      markerOptional * 0.05 +
      titleBoost;

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

  var accepted =
    best.combinedScore >= ACCEPT_SIMILARITY &&
    (
      best.markerRequired >= ACCEPT_MARKER_RATIO * 100 ||
      best.similarity >= 0.2 ||
      (best.titleDetected && best.markerRequired >= 32) ||
      (best.markerBrand >= 50 && best.markerRequired >= 35)
    );

  if (accepted && second && best.combinedScore - second.combinedScore < 0.06 && second.markerRequired > best.markerRequired) {
    accepted = false;
  }

  return {
    accepted: accepted,
    reason: accepted ? 'trained_match' : 'no_trained_match',
    bestMatch: best,
    allScores: scores,
    matchedBy: 'document_content_only',
    similarity: best.similarity,
    combinedScore: best.combinedScore,
  };
}

/**
 * Run ML-trained audit — output compatible with existing API shape.
 */
function runTrainedAudit(documentText, context) {
  var result = classifyDocument(documentText, context);
  var accepted = result.accepted;
  var best = result.bestMatch;

  var trainingDetail = {
    model: 'sifco-ml-v1',
    trained_on: REFERENCE_SPECS.map(function (s) { return s.referencePdf; }),
    reference_count: loadCorpus().referenceCount,
    best_match: best ? {
      type: best.id,
      label: best.label,
      reference_pdf: best.referencePdf,
      similarity_percent: Math.round((best.similarity || 0) * 100),
      confidence_percent: Math.round((best.combinedScore || 0) * 100),
      marker_match_percent: best.markerRequired,
      brand_match_percent: best.markerBrand,
      signature_detected: best.signatureFound,
      title_detected: best.titleDetected,
    } : null,
    all_type_scores: (result.allScores || []).map(function (s) {
      return {
        type: s.id,
        label: s.label,
        similarity_percent: Math.round(s.similarity * 100),
        confidence_percent: Math.round(s.combinedScore * 100),
      };
    }),
  };

  var message;
  if (!accepted) {
    if (result.reason === 'unreadable') {
      message = result.message;
    } else if (best && best.markerRequired >= 30) {
      message =
        'This document is closest to "' + best.label + '" (' + Math.round(best.combinedScore * 100) +
        '% confidence) but does not sufficiently match the SIFCO reference "' + best.referencePdf + '".';
    } else {
      message =
        'This document does not match any of the six SIFCO daily papers used for training (packing list, HBL, shipping agreement, freight invoice, trucking invoice, sea freight invoice).';
    }
  } else {
    message =
      'Validated against SIFCO training reference "' + best.referencePdf + '" — classified as ' + best.label +
      ' with ' + Math.round(best.combinedScore * 100) + '% match confidence.';
  }

  var compliance_score = accepted
    ? Math.min(100, Math.max(82, 75 + Math.round((best.combinedScore || 0) * 25)))
    : Math.max(5, Math.round((best ? best.combinedScore : 0) * 40));

  return {
    document_type: best ? best.id : 'unknown',
    organization_match: accepted,
    trained_reference_match: accepted,
    organization_message: message,
    organization_category: best ? best.id : null,
    organization_training: {
      paper_label: best ? best.label : null,
      paper_purpose: best ? best.purpose : null,
      training_profile: 'sifco-ml-v1',
      ml_training: trainingDetail,
      reference_pdf: best ? best.referencePdf : null,
      similarity_percent: best ? Math.round(best.similarity * 100) : 0,
      confidence_percent: best ? Math.round(best.combinedScore * 100) : 0,
      signature_detected: best ? best.signatureFound : false,
      brand_match_percent: best ? best.markerBrand : 0,
    },
    compliance_score: compliance_score,
    ai_generated_percentage: 0,
    ai_threshold_exceeded: false,
    ai_validity_percentage: compliance_score,
    risk_level: accepted ? 'low' : 'high',
    sentiment: accepted ? 'positive' : 'negative',
    summary: message,
    missing_fields: [],
    extracted_fields: {
      paper_type: best ? best.label : null,
      matched_reference: best ? best.referencePdf : null,
      confidence: best ? Math.round(best.combinedScore * 100) + '%' : null,
    },
    violations: [],
    inconsistencies: accepted ? [] : [{
      code: 'ML-REJECT',
      title: 'Not a trained SIFCO document',
      summary: message,
      detail: best
        ? 'Closest type: ' + best.label + ' (' + Math.round(best.combinedScore * 100) + '%). Required training markers were not met.'
        : 'Upload one of the six reference document types used in daily SIFCO customer operations.',
    }],
    recommendations: [],
    fraud_flags: [],
    policy_rules_checked: 0,
    engine: 'sifco-ml-trained',
    document_inspection: {
      signature: { present: !!(best && best.signatureFound), issues: [] },
      stamp: { present: /shipped\s+on\s+board|seal/i.test(normalizeText(documentText)), issues: [] },
      forgery_analysis: { is_suspicious: false, forgery_score: 0, flags: [] },
      organization: {
        present: !!(best && best.markerBrand >= 50),
        primary: best && best.markerBrand >= 50 ? 'SIFCO partner branding detected' : null,
      },
    },
  };
}

function rebuildTrainingFromDisk() {
  corpusCache = null;
  return loadCorpus();
}

module.exports = {
  runTrainedAudit: runTrainedAudit,
  classifyDocument: classifyDocument,
  loadCorpus: loadCorpus,
  rebuildTrainingFromDisk: rebuildTrainingFromDisk,
  REFERENCE_SPECS: REFERENCE_SPECS,
};
