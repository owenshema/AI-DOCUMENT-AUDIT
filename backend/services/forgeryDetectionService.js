'use strict';
/**
 * Forgery detection — Colab pipeline (OpenCV + Tesseract + EfficientNet ONNX).
 * Matches Document_Forgery_Detection.ipynb predict_document().
 */

var path = require('path');
var fs = require('fs');
var { execFile } = require('child_process');
var { promisify } = require('util');
var { resolveExistingPath } = require('./pdfTextService');

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

function analyzeText(documentText) {
  var text = (documentText || '').toLowerCase();
  var flags = [];
  var score = 0;

  var found = {};
  REQUIRED_FIELDS.forEach(function (field) {
    found[field] = text.indexOf(field) >= 0 ||
      (field === 'bill of lading' && /b\s*\/\s*l|bill of lading|bl no/i.test(documentText));
  });

  var missing = REQUIRED_FIELDS.filter(function (f) { return !found[f]; });

  if (!/stamp|seal|shipped on board/i.test(text)) {
    score += 30;
    flags.push('MISSING_STAMP');
  }
  if (!/signature|signed|authorized/i.test(text)) {
    score += 25;
    flags.push('MISSING_SIGNATURE');
  }
  if (!/sifco|ganador|super international/i.test(text)) {
    score += 20;
    flags.push('MISSING_LOGO');
  }
  if (missing.length > 4) {
    score += 25;
    flags.push('MANY_MISSING_FIELDS');
  }
  if (text.replace(/\s/g, '').length < 100) {
    score += 20;
    flags.push('LOW_TEXT_CONTENT');
  }

  var level = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';

  return {
    is_suspicious: score >= 30,
    forgery_score: Math.min(100, score),
    risk_level: level,
    flags: flags,
    missing_fields: missing,
    engine: 'forgery-text-fallback',
  };
}

function writeTempText(documentText) {
  var tempDir = path.join(FORGERY_DIR, '..', 'data', 'audit_temp');
  fs.mkdirSync(tempDir, { recursive: true });
  var tempPath = path.join(tempDir, 'fallback_text_' + Date.now() + '.txt');
  fs.writeFileSync(tempPath, documentText || '', 'utf8');
  return tempPath;
}

function runColabAnalysis(filePath, documentText) {
  var resolved = resolveExistingPath(filePath);
  if (!resolved) {
    return Promise.reject(new Error('file_not_found'));
  }

  var args = ['-3.12', ANALYZE_SCRIPT, resolved, '--json'];
  var tempTextPath = null;

  if (documentText && documentText.trim()) {
    tempTextPath = writeTempText(documentText);
    args.push('--fallback-text', documentText.slice(0, 50000));
  }

  return execFileAsync('py', args, {
    cwd: FORGERY_DIR,
    timeout: 180000,
    maxBuffer: 4 * 1024 * 1024,
  }).then(function (result) {
    if (tempTextPath && fs.existsSync(tempTextPath)) {
      try { fs.unlinkSync(tempTextPath); } catch (e) { /* ignore */ }
    }
    return JSON.parse(result.stdout.trim());
  });
}

async function analyzeDocument(documentText, options) {
  options = options || {};

  if (options.filePath && modelAvailable()) {
    try {
      return await runColabAnalysis(options.filePath, documentText);
    } catch (err) {
      var fallback = analyzeText(documentText);
      fallback.fallback_reason = 'colab_pipeline_error: ' + (err.message || 'unknown');
      return fallback;
    }
  }

  if (options.imagePath && modelAvailable() && fs.existsSync(options.imagePath)) {
    try {
      return await runColabAnalysis(options.imagePath, documentText);
    } catch (err) {
      var imageFallback = analyzeText(documentText);
      imageFallback.fallback_reason = 'colab_pipeline_error: ' + (err.message || 'unknown');
      return imageFallback;
    }
  }

  return analyzeText(documentText);
}

module.exports = {
  analyzeDocument: analyzeDocument,
  analyzeText: analyzeText,
  modelAvailable: modelAvailable,
  REQUIRED_FIELDS: REQUIRED_FIELDS,
  FORGERY_DIR: FORGERY_DIR,
};
