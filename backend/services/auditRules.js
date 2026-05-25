'use strict';
/**
 * Audit entry point — paper-audit training ONLY (no legacy SIFCO / Kaggle / generic rules).
 */
var paperAudit = require('./organizationTrainingService');

function detectDocumentType(text) {
  var paper = paperAudit.detectPaperType(text || '');
  return paper.key || 'unknown';
}

function runAudit(documentText, context) {
  return paperAudit.runPaperAudit(documentText, context);
}

module.exports = {
  runAudit: runAudit,
  detectDocumentType: detectDocumentType,
};
