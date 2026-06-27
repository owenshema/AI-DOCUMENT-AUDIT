'use strict';

const AUDIT_PENDING_STATUSES = ['uploaded', 'in_review', 'in_progress', 'submitted'];
const AUDIT_DONE_STATUSES = ['reviewed', 'changes_requested', 'approved', 'rejected'];

function documentHasAuditorReview(document) {
  const meta = document?.metadata || {};
  return Boolean(
    meta.latestAuditDecision?.updatedBy ||
    meta.latestComplianceScore != null ||
    meta.latestAuditSummary ||
    AUDIT_DONE_STATUSES.includes(document?.status)
  );
}

function documentNeedsAudit(document) {
  return AUDIT_PENDING_STATUSES.includes(document?.status) && !documentHasAuditorReview(document);
}

async function fetchDocumentsForAuditMetrics(Document, docWhere = {}) {
  return Document.findAll({
    where: docWhere,
    attributes: ['id', 'status', 'metadata'],
  });
}

async function countAuditedDocuments(Document, docWhere = {}) {
  const docs = await fetchDocumentsForAuditMetrics(Document, docWhere);
  return docs.filter(documentHasAuditorReview).length;
}

async function countPendingAuditDocuments(Document, docWhere = {}) {
  const docs = await fetchDocumentsForAuditMetrics(Document, docWhere);
  return docs.filter(documentNeedsAudit).length;
}

async function countAuditorCompletedAudits(DocumentAnalysis, userId) {
  const rows = await DocumentAnalysis.findAll({
    where: { status: 'completed', performedBy: userId },
    attributes: ['documentId'],
  });
  return new Set(rows.map(r => r.documentId).filter(Boolean)).size;
}

module.exports = {
  AUDIT_PENDING_STATUSES,
  AUDIT_DONE_STATUSES,
  documentHasAuditorReview,
  documentNeedsAudit,
  countAuditedDocuments,
  countPendingAuditDocuments,
  countAuditorCompletedAudits,
};
