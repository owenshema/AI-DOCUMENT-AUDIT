'use strict';
/**
 * Training supplements from Untitled3.ipynb (sifco_audit_engine.py output).
 */
var fs = require('fs');
var path = require('path');
var { execFileSync } = require('child_process');

var TRAINING_DIR = path.join(__dirname, '..', 'data', 'training');
var LABELS_PATH = path.join(TRAINING_DIR, 'labels', 'notebook_training.json');
var ENGINE_PATH = path.join(__dirname, '..', 'forgery', 'sifco_audit_engine.py');

var cached = null;

function runNotebookIngest() {
  if (!fs.existsSync(ENGINE_PATH)) {
    return { ok: false, error: 'sifco_audit_engine.py not found' };
  }
  try {
    execFileSync('py', ['-3.12', ENGINE_PATH], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 120000,
    });
  } catch (e) {
    var out = (e.stdout || '') + (e.stderr || '');
    if (!fs.existsSync(LABELS_PATH)) {
      return { ok: false, error: out || e.message };
    }
  }
  cached = null;
  return loadNotebookTraining();
}

function loadNotebookTraining() {
  if (cached) return cached;
  if (!fs.existsSync(LABELS_PATH)) {
    cached = { supplementsBySpec: {}, markersBySpec: {}, meta: {} };
    return cached;
  }
  try {
    var parsed = JSON.parse(fs.readFileSync(LABELS_PATH, 'utf8'));
    cached = {
      supplementsBySpec: parsed.supplements_by_spec || {},
      markersBySpec: parsed.markers_by_spec || {},
      knownValues: parsed.known_values || {},
      referenceResults: parsed.reference_results || [],
      meta: { source: parsed.source, auditedCount: parsed.audited_count },
    };
  } catch (e) {
    cached = { supplementsBySpec: {}, markersBySpec: {}, meta: {} };
  }
  return cached;
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSupplementTextForSpec(specId) {
  var data = loadNotebookTraining();
  var chunks = data.supplementsBySpec && data.supplementsBySpec[specId];
  if (!chunks || !chunks.length) return '';
  return '\n\n--- NOTEBOOK AUDIT TRAINING (Untitled3.ipynb) ---\n' + chunks.join('\n\n');
}

function getExtraMarkersForSpec(specId) {
  var data = loadNotebookTraining();
  var raw = (data.markersBySpec && data.markersBySpec[specId]) || [];
  return raw
    .filter(function (m) { return m && String(m).length >= 3; })
    .map(function (m) {
      return new RegExp(escapeRegex(String(m)).replace(/\s+/g, '\\s+'), 'i');
    });
}

function clearCache() {
  cached = null;
}

module.exports = {
  LABELS_PATH,
  runNotebookIngest,
  loadNotebookTraining,
  getSupplementTextForSpec,
  getExtraMarkersForSpec,
  clearCache,
};
