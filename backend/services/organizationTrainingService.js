'use strict';
/**
 * Organization audit — delegates to SIFCO ML training module only.
 * Trained on the 6 reference PDFs; no legacy rule/violation engine.
 */
var ml = require('./sifcoMlTrainingService');

function runPaperAudit(documentText, context) {
  return ml.runTrainedAudit(documentText, context);
}

function evaluateOrganizationDocument(text, context) {
  var r = runPaperAudit(text, context);
  return {
    accepted: r.organization_match,
    organization_match: r.organization_match,
    trained_reference_match: r.trained_reference_match,
    message: r.organization_message,
    category: r.organization_category,
    violations: r.violations,
    inconsistencies: r.inconsistencies,
    recommendations: r.recommendations,
    training_profile: 'sifco-ml-v1',
    signature_validation: r.document_inspection.signature,
    logistics_forgery: r.document_inspection.forgery_analysis,
    required_fields_missing: [],
  };
}

function detectPaperType(text) {
  var c = ml.classifyDocument(text || '', {});
  var best = c.bestMatch;
  return { key: best ? best.id : null, label: best ? best.label : null, score: best ? best.combinedScore : 0 };
}

module.exports = {
  runPaperAudit: runPaperAudit,
  evaluateOrganizationDocument: evaluateOrganizationDocument,
  detectPaperType: detectPaperType,
  rebuildTraining: ml.rebuildTrainingFromDisk,
  REFERENCE_SPECS: ml.REFERENCE_SPECS,
};
