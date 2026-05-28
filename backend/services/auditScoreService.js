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
  if (score >= 70) return { label: 'Good', code: 'good', color: 'emerald' };
  if (score >= 50) return { label: 'Review Required', code: 'review', color: 'amber' };
  return { label: 'Failed', code: 'failed', color: 'red' };
}

function isPassingAuditResults(results) {
  results = results || {};
  if (results.organization_match === true) return true;
  if (results.organization_match === false) return false;
  return results.risk_level === 'low'
    && results.document_type
    && results.document_type !== 'unknown';
}

function computeOverallAuditScore(auditResult) {
  auditResult = auditResult || {};
  var forgeryAnalysis = auditResult.document_inspection && auditResult.document_inspection.forgery_analysis;
  var forgeryRisk = clamp(Number(forgeryAnalysis && forgeryAnalysis.forgery_score) || 0, 0, 100);
  var forgeryBlocked = !!(forgeryAnalysis && forgeryAnalysis.is_suspicious && forgeryRisk >= 45);

  if (auditResult.organization_match && !forgeryBlocked) {
    return {
      overall_audit_score: 100,
      overall_audit_status: 'Excellent',
      overall_audit_status_code: 'excellent',
      overall_audit_breakdown: {
        compliance_percent: 100,
        integrity_percent: 100,
        forgery_risk_percent: forgeryRisk,
        weights: {
          compliance: COMPLIANCE_WEIGHT,
          integrity: INTEGRITY_WEIGHT,
        },
      },
    };
  }

  if (!auditResult.organization_match || forgeryBlocked) {
    return {
      overall_audit_score: 10,
      overall_audit_status: 'Failed',
      overall_audit_status_code: 'failed',
      overall_audit_breakdown: {
        compliance_percent: 10,
        integrity_percent: 10,
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
  var passing = (analyses || []).filter(function (a) {
    return isPassingAuditResults(a.results);
  });

  var scores = passing
    .map(function (a) {
      var stored = a.results && a.results.overall_audit_score;
      if (typeof stored === 'number') return stored;
      return computeOverallAuditScore(a.results || {}).overall_audit_score;
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
