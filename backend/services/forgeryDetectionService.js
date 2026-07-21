'use strict';
/**
 * Integrity risk scoring — Colab pipeline (OpenCV + Tesseract + EfficientNet ONNX).
 * Flags suspicious documents via missing stamps, signatures, logos, and field gaps.
 */

var path = require('path');
var fs = require('fs');
var { execFile } = require('child_process');
var { promisify } = require('util');
var { resolveExistingPath, sniffFileType } = require('./pdfTextService');

var execFileAsync = promisify(execFile);

var FORGERY_DIR = path.join(__dirname, '..', 'forgery');
var ANALYZE_SCRIPT = path.join(FORGERY_DIR, 'analyze_document.py');
var ONNX_MODEL = path.join(FORGERY_DIR, 'model', 'forgery_model.onnx');

var REQUIRED_FIELDS = [
  'invoice', 'date', 'total', 'consignee', 'container', 'bill of lading',
  'freight', 'destination', 'origin', 'signature', 'stamp', 'vessel', 'weight',
];

function modelAvailable() {
  return fs.existsSync(ANALYZE_SCRIPT);
}

function isSifcoPaperText(text) {
  var n = (text || '').toLowerCase();
  var brand = /sifco|super\s+international|al\s+shamali|agape\s+house|top\s+sifco|ganador|superfreightservice|unique\s+hybrid/i.test(n);
  var paper = /packing\s+list|bill\s+of\s+lading|\bb\s*\/\s*l\b|shipping\s+agreement|trucking\s+invoice|freight\s+invo|sea\s+freight|freight\s+charges|\binvoice\b|house\s+bill|bl\s+fee|bl\s+number/i.test(n);
  if (brand && paper) return true;
  if (/sea\s+freight|freight\s+invo/i.test(n) &&
    /port\s+of\s+(loading|discharge)|bl\s+number|final\s+destination|consignee|name\s+of\s+vessel/i.test(n)) {
    return true;
  }
  return false;
}

function sanitizeForgeryResult(result, documentText) {
  if (!result || typeof result !== 'object') return result;
  if (isSifcoPaperText(documentText)) {
    result.sifco_document = true;
    result.missing_fields = [];
    if (Number(result.forgery_score) > 30) {
      result.forgery_score = Math.min(Number(result.forgery_score) || 0, 25);
    }
    result.is_suspicious = Number(result.forgery_score) >= 45;
  }
  return result;
}

function analyzeText(documentText) {
  var text = (documentText || '').toLowerCase();
  var flags = [];
  var score = 0;

  if (isSifcoPaperText(documentText)) {
    if (text.replace(/\s/g, '').length < 80) {
      score += 15;
      flags.push('LOW_TEXT_CONTENT');
    }
    return {
      is_suspicious: score >= 45,
      forgery_score: Math.min(100, score),
      risk_level: score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW',
      flags: flags,
      missing_fields: [],
      engine: 'integrity-risk-scoring-sifco',
      sifco_document: true,
    };
  }

  var found = {};
  REQUIRED_FIELDS.forEach(function (field) {
    found[field] = text.indexOf(field) >= 0 ||
      (field === 'bill of lading' && /b\s*\/\s*l|bill of lading|bl no/i.test(documentText));
  });

  var missing = REQUIRED_FIELDS.filter(function (f) { return !found[f]; });

  if (!/stamp|seal|shipped on board/i.test(text)) {
    score += 15;
    flags.push('MISSING_STAMP');
  }
  if (!/signature|signed|authorized|signatory/i.test(text)) {
    score += 10;
    flags.push('MISSING_SIGNATURE');
  }
  if (!/sifco|ganador|super international|al shamali|top sifco/i.test(text)) {
    score += 15;
    flags.push('MISSING_LOGO');
  }
  if (missing.length > 6) {
    score += 10;
    flags.push('MANY_MISSING_FIELDS');
  }
  if (text.replace(/\s/g, '').length < 100) {
    score += 15;
    flags.push('LOW_TEXT_CONTENT');
  }

  var level = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';

  return {
    is_suspicious: score >= 45,
    forgery_score: Math.min(100, score),
    risk_level: level,
    flags: flags,
    missing_fields: missing,
    engine: 'integrity-risk-scoring',
  };
}

function writeTempText(documentText) {
  var tempDir = path.join(FORGERY_DIR, '..', 'data', 'audit_temp');
  fs.mkdirSync(tempDir, { recursive: true });
  var tempPath = path.join(tempDir, 'fallback_text_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.txt');
  fs.writeFileSync(tempPath, documentText || '', 'utf8');
  return tempPath;
}

function runColabAnalysis(filePath, documentText) {
  var resolved = resolveExistingPath(filePath);
  if (!resolved) {
    return Promise.reject(new Error('file_not_found'));
  }

  var text = (documentText || '').trim();
  var args = ['-3.12', ANALYZE_SCRIPT, resolved, '--json'];
  var tempTextPath = null;

  // Prefer a temp file over stuffing tens of KB onto argv (slow + fragile on Windows).
  if (text) {
    tempTextPath = writeTempText(text.slice(0, 100000));
    args.push('--fallback-text-file', tempTextPath);
    // Skip heavy ONNX reload when we already have usable document text.
    if (text.length >= 200) {
      args.push('--skip-onnx');
    }
  }

  return execFileAsync('py', args, {
    cwd: FORGERY_DIR,
    timeout: 90000,
    maxBuffer: 4 * 1024 * 1024,
  }).then(function (result) {
    if (tempTextPath && fs.existsSync(tempTextPath)) {
      try { fs.unlinkSync(tempTextPath); } catch (e) { /* ignore */ }
    }
    try {
      return sanitizeForgeryResult(JSON.parse(result.stdout.trim()), documentText);
    } catch (parseErr) {
      throw new Error('invalid_forgery_json');
    }
  }).catch(function (err) {
    if (tempTextPath && fs.existsSync(tempTextPath)) {
      try { fs.unlinkSync(tempTextPath); } catch (e) { /* ignore */ }
    }
    throw err;
  });
}

function isVisualDocument(filePath) {
  if (!filePath) return false;
  // Detect by real content first so a wrong/renamed extension (e.g. a PDF
  // saved as .docx) still gets the visual forgery/stamp/signature analysis.
  var resolved = resolveExistingPath(filePath);
  if (resolved) {
    try {
      var fd = fs.openSync(resolved, 'r');
      var head = Buffer.alloc(16);
      fs.readSync(fd, head, 0, 16, 0);
      fs.closeSync(fd);
      var realType = sniffFileType(head);
      if (realType === 'pdf' || realType === 'image') return true;
      if (realType === 'zip' || realType === 'ole') return false; // real docx/xlsx/doc — text only
    } catch (e) { /* fall through to extension check */ }
  }
  var ext = path.extname(String(filePath)).toLowerCase();
  return ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff'].indexOf(ext) >= 0;
}

async function analyzeDocument(documentText, options) {
  options = options || {};

  if (options.filePath && modelAvailable() && isVisualDocument(options.filePath)) {
    try {
      return await runColabAnalysis(options.filePath, documentText);
    } catch (err) {
      var fallback = sanitizeForgeryResult(analyzeText(documentText), documentText);
      fallback.fallback_reason = 'colab_pipeline_error: ' + (err.message || 'unknown');
      return fallback;
    }
  }

  if (options.imagePath && modelAvailable() && fs.existsSync(options.imagePath)) {
    try {
      return await runColabAnalysis(options.imagePath, documentText);
    } catch (err) {
      var imageFallback = sanitizeForgeryResult(analyzeText(documentText), documentText);
      imageFallback.fallback_reason = 'colab_pipeline_error: ' + (err.message || 'unknown');
      return imageFallback;
    }
  }

  return sanitizeForgeryResult(analyzeText(documentText), documentText);
}

module.exports = {
  analyzeDocument: analyzeDocument,
  analyzeText: analyzeText,
  isSifcoPaperText: isSifcoPaperText,
  sanitizeForgeryResult: sanitizeForgeryResult,
  modelAvailable: modelAvailable,
  REQUIRED_FIELDS: REQUIRED_FIELDS,
  FORGERY_DIR: FORGERY_DIR,
};
