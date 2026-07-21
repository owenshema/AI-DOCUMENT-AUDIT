'use strict';
/**
 * Combined overall audit health score — compliance + forgery integrity.
 * Weights: 60% SIFCO document match, 40% document integrity (inverse forgery risk).
 */

var COMPLIANCE_WEIGHT = 0.6;
var INTEGRITY_WEIGHT = 0.4;
var DL_RISK_THRESHOLD = 0.6;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function round(n) {
  return Math.round(n);
}

function overallAuditStatus(score) {
  if (score >= 85) return { label: 'Excellent', code: 'excellent', color: 'green' };
  if (score >= 60) return { label: 'Good', code: 'good', color: 'emerald' };
  if (score >= 40) return { label: 'Review Required', code: 'review', color: 'amber' };
  return { label: 'Failed', code: 'failed', color: 'red' };
}

function isSifcoDocumentType(documentType) {
  if (!documentType || documentType === 'unknown') return false;
  return [
    'packing_list', 'bill_of_lading', 'shipping_agreement', 'freight_invoice',
    'trucking_invoice', 'sea_freight_invoice', 'shipping_instruction',
  ].indexOf(documentType) >= 0;
}

function isPassingAuditResults(results) {
  results = results || {};
  if (results.organization_match === true) return true;
  if (results.organization_match === false) return false;
  return results.risk_level === 'low'
    && results.document_type
    && results.document_type !== 'unknown';
}

function applyRequiredFieldOverallCap(overall, auditResult) {
  var issues = (auditResult.violations || []).map(function (v) {
    return { severity: v.severity, message: v.summary, check: v.title };
  });
  var notebookAudit = require('./sifcoNotebookAuditService');
  var capped = notebookAudit.scoreForFieldIncomplete(issues);
  if (capped == null) return overall;
  return Math.min(overall, capped);
}

function computeOverallAuditScore(auditResult) {
  auditResult = auditResult || {};
  var forgeryAnalysis = auditResult.document_inspection && auditResult.document_inspection.forgery_analysis;
  var forgeryRisk = clamp(Number(forgeryAnalysis && forgeryAnalysis.forgery_score) || 0, 0, 100);
  if (forgeryAnalysis && forgeryAnalysis.sifco_document) {
    forgeryRisk = Math.min(forgeryRisk, 20);
  } else if (isSifcoDocumentType(auditResult.document_type) && auditResult.organization_match) {
    forgeryRisk = Math.min(forgeryRisk, 25);
  }
  var forgeryBlocked = !!(forgeryAnalysis && forgeryAnalysis.is_suspicious && forgeryRisk >= 45 &&
    !forgeryAnalysis.sifco_document && !isSifcoDocumentType(auditResult.document_type));

  if (auditResult.organization_match && !forgeryBlocked) {
    var compliance = clamp(Number(auditResult.compliance_score) || 0, 0, 100);
    var integrity = clamp(100 - forgeryRisk, 0, 100);
    var overall = round(compliance * COMPLIANCE_WEIGHT + integrity * INTEGRITY_WEIGHT);
    overall = applyRequiredFieldOverallCap(clamp(overall, 0, 100), auditResult);
    var status = overallAuditStatus(overall);
    return {
      overall_audit_score: overall,
      overall_audit_status: status.label,
      overall_audit_status_code: status.code,
      overall_audit_breakdown: {
        compliance_percent: compliance,
        integrity_percent: integrity,
        forgery_risk_percent: forgeryRisk,
        weights: {
          compliance: COMPLIANCE_WEIGHT,
          integrity: INTEGRITY_WEIGHT,
        },
      },
    };
  }

  if (isSifcoDocumentType(auditResult.document_type) && auditResult.organization_match && !forgeryBlocked) {
    var sCompliance = clamp(Number(auditResult.compliance_score) || 0, 0, 100);
    var sIntegrity = clamp(100 - forgeryRisk, 0, 100);
    var sOverall = round(sCompliance * COMPLIANCE_WEIGHT + sIntegrity * INTEGRITY_WEIGHT);
    sOverall = applyRequiredFieldOverallCap(clamp(sOverall, 0, 100), auditResult);
    var sStatus = overallAuditStatus(sOverall);
    return {
      overall_audit_score: sOverall,
      overall_audit_status: sStatus.label,
      overall_audit_status_code: sStatus.code,
      overall_audit_breakdown: {
        compliance_percent: sCompliance,
        integrity_percent: sIntegrity,
        forgery_risk_percent: forgeryRisk,
        weights: {
          compliance: COMPLIANCE_WEIGHT,
          integrity: INTEGRITY_WEIGHT,
        },
      },
    };
  }

  if ((!auditResult.organization_match && !isSifcoDocumentType(auditResult.document_type)) || forgeryBlocked) {
    return {
      overall_audit_score: 0,
      overall_audit_status: 'Failed',
      overall_audit_status_code: 'failed',
      overall_audit_breakdown: {
        compliance_percent: 0,
        integrity_percent: 0,
        forgery_risk_percent: forgeryRisk,
        weights: {
          compliance: COMPLIANCE_WEIGHT,
          integrity: INTEGRITY_WEIGHT,
        },
      },
    };
  }

  var compliance = clamp(Number(auditResult.compliance_score) || 0, 0, 100);
  var integrity = clamp(100 - forgeryRisk, 0, 100);
  var overall = round(compliance * COMPLIANCE_WEIGHT + integrity * INTEGRITY_WEIGHT);
  overall = clamp(overall, 0, 100);
  var status = overallAuditStatus(overall);

  return {
    overall_audit_score: overall,
    overall_audit_status: status.label,
    overall_audit_status_code: status.code,
    overall_audit_breakdown: {
      compliance_percent: compliance,
      integrity_percent: integrity,
      forgery_risk_percent: forgeryRisk,
      weights: {
        compliance: COMPLIANCE_WEIGHT,
        integrity: INTEGRITY_WEIGHT,
      },
    },
  };
}

function averageOverallScore(analyses) {
  var scores = (analyses || [])
    .map(function (a) {
      var results = a.results || {};
      if (typeof results.overall_audit_score === 'number') return results.overall_audit_score;
      if (typeof results.compliance_score === 'number') return results.compliance_score;
      if (isPassingAuditResults(results)) {
        return computeOverallAuditScore(results).overall_audit_score;
      }
      return null;
    })
    .filter(function (n) { return typeof n === 'number' && !isNaN(n); });

  if (!scores.length) return 0;
  return round(scores.reduce(function (sum, n) { return sum + n; }, 0) / scores.length);
}

module.exports = {
  computeOverallAuditScore: computeOverallAuditScore,
  isPassingAuditResults: isPassingAuditResults,
  averageOverallScore: averageOverallScore,
  overallAuditStatus: overallAuditStatus,
  COMPLIANCE_WEIGHT: COMPLIANCE_WEIGHT,
  INTEGRITY_WEIGHT: INTEGRITY_WEIGHT,
};
