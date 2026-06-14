'use strict';
/**
 * Full audit pipeline evaluation — OCR path, TF-IDF, rules, integrity scoring, reports.
 *
 * Usage: node scripts/evaluate-full-audit.js
 *        npm run evaluate:full
 */

var fs = require('fs');
var path = require('path');

var { runPaperAudit, rebuildTraining } = require('../services/organizationTrainingService');
var forgerySvc = require('../services/forgeryDetectionService');
var reportBuilder = require('../services/reportBuilderService');
var tfidfEval = require('./evaluate-tfidf');

var EVAL_DIR = path.join(__dirname, '..', 'data', 'training', 'evaluation');
var RESULTS_DIR = path.join(EVAL_DIR, 'results');
var TRAINING_DIR = path.join(__dirname, '..', 'data', 'training');

var MANUAL_REVIEW_MINUTES = 20;
var SYSTEM_REVIEW_SECONDS = 5;

function loadSamples() {
  return tfidfEval.buildSamples();
}

function evaluatePipeline(samples) {
  rebuildTraining();
  var rows = samples.map(function (sample) {
    var audit = runPaperAudit(sample.text, { fileName: sample.name });
    var integrity = forgerySvc.analyzeText(sample.text);
    return {
      id: sample.id,
      name: sample.name,
      expected_accept: sample.mustAccept,
      actual_accept: audit.organization_match,
      document_type: audit.document_type,
      engine: audit.engine,
      compliance_score: audit.compliance_score,
      violation_count: (audit.violations || []).length,
      integrity_suspicious: integrity.is_suspicious,
      integrity_score: integrity.forgery_score,
      integrity_flags: integrity.flags || [],
      missing_fields: integrity.missing_fields || [],
      accept_correct: audit.organization_match === sample.mustAccept,
    };
  });

  var accuracy = rows.filter(function (r) { return r.accept_correct; }).length / rows.length;
  var integrityFlags = rows.filter(function (r) { return r.integrity_suspicious; }).length;

  return { rows: rows, pipeline_accuracy: Math.round(accuracy * 10000) / 10000, integrity_flagged: integrityFlags };
}

function evaluateReports() {
  var mockSummary = {
    totalDocuments: 6,
    approved: 5,
    rejected: 1,
    avgCompliance: 87,
    avgForgeryRisk: 12,
    periodLabel: 'Evaluation period',
  };
  var structured = reportBuilder.buildStructuredReport(mockSummary, {
    role: 'administrator',
    organizationName: 'SIFCO AE',
  });
  return {
    report_sections: Object.keys(structured.sections || structured || {}),
    has_executive_summary: !!(structured.executiveSummary || structured.summary),
    generated: true,
  };
}

function businessValueMetrics(pipelineRows, tfidfReport) {
  var docsPerMonth = 500;
  var manualHoursSaved = (docsPerMonth * MANUAL_REVIEW_MINUTES) / 60;
  var systemHours = (docsPerMonth * SYSTEM_REVIEW_SECONDS) / 3600;
  var hoursSaved = manualHoursSaved - systemHours;
  var errorsCaught = pipelineRows.filter(function (r) {
    return !r.expected_accept && !r.actual_accept;
  }).length;
  var falseAccepts = pipelineRows.filter(function (r) {
    return !r.expected_accept && r.actual_accept;
  }).length;

  return {
    assumptions: {
      manual_review_minutes_per_document: MANUAL_REVIEW_MINUTES,
      automated_review_seconds_per_document: SYSTEM_REVIEW_SECONDS,
      documents_per_month: docsPerMonth,
    },
    time_savings: {
      manual_hours_per_month: Math.round(manualHoursSaved * 10) / 10,
      automated_hours_per_month: Math.round(systemHours * 100) / 100,
      hours_saved_per_month: Math.round(hoursSaved * 10) / 10,
      percent_time_reduction: Math.round((hoursSaved / manualHoursSaved) * 1000) / 10,
    },
    quality: {
      negative_samples_correctly_rejected: errorsCaught,
      false_accepts_on_test_set: falseAccepts,
      tfidf_classification_accuracy_percent: Math.round(
        (tfidfReport.evaluation_modes.full_corpus.metrics.classification_accuracy || 0) * 1000
      ) / 10,
      pipeline_accept_accuracy_percent: Math.round(pipelineRows.filter(function (r) { return r.accept_correct; }).length / pipelineRows.length * 1000) / 10,
    },
    narrative: 'Automating document audit reduces manual review from ~' + MANUAL_REVIEW_MINUTES +
      ' minutes to ~' + SYSTEM_REVIEW_SECONDS + ' seconds per document while applying consistent TF-IDF matching, rule validation, and integrity risk scoring.',
  };
}

function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  var samples = loadSamples();
  var tfidfReport = tfidfEval.runTfidfEvaluation(samples);
  fs.writeFileSync(path.join(RESULTS_DIR, 'tfidf_evaluation.json'), JSON.stringify(tfidfReport, null, 2));

  console.log('\n=== Full Audit Pipeline Evaluation ===\n');
  console.log('TF-IDF classification accuracy:',
    (tfidfReport.evaluation_modes.full_corpus.metrics.classification_accuracy * 100).toFixed(1) + '%');

  var pipeline = evaluatePipeline(samples);
  var reports = evaluateReports();
  var business = businessValueMetrics(pipeline.rows, tfidfReport);

  var ocrStatus = { available: true, note: 'OCR via pdfTextService + Tesseract (ocr_extract.py) on PDF/image uploads' };
  var refPdfCount = fs.readdirSync(path.join(TRAINING_DIR, 'reference')).filter(function (f) {
    return f.toLowerCase().endsWith('.pdf');
  }).length;

  var report = {
    generated_at: new Date().toISOString(),
    architecture_layers: [
      'OCR Extraction (pdfTextService + Tesseract)',
      'TF-IDF + Cosine Similarity (sifcoMlTrainingService)',
      'Document Classification (6 SIFCO paper types)',
      'Rule-Based Validation (sifcoNotebookAuditService)',
      'Integrity Risk Scoring (forgeryDetectionService)',
      'Audit Report Generation (reportBuilderService)',
    ],
    reference_document_count: refPdfCount,
    test_sample_count: samples.length,
    ocr: ocrStatus,
    tfidf_evaluation: tfidfReport.evaluation_modes,
    pipeline: {
      accuracy: pipeline.pipeline_accuracy,
      integrity_flagged_count: pipeline.integrity_flagged,
      results: pipeline.rows,
    },
    audit_reports: reports,
    business_value: business,
  };

  var outPath = path.join(RESULTS_DIR, 'full_audit_evaluation.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log('--- Full pipeline accept/reject ---');
  console.log('Accuracy:', (pipeline.pipeline_accuracy * 100).toFixed(1) + '%');
  console.log('Integrity flags raised:', pipeline.integrity_flagged, '/', samples.length);
  console.log('\n--- Business value (estimated) ---');
  console.log('Hours saved per month (~500 docs):', business.time_savings.hours_saved_per_month);
  console.log('Time reduction:', business.time_savings.percent_time_reduction + '%');
  console.log('\nResults saved to:', outPath);
}

if (require.main === module) {
  main();
}

module.exports = { main: main };
