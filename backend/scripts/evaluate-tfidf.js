'use strict';
/**
 * TF-IDF + Cosine Similarity — classification evaluation for thesis metrics.
 * Outputs: accuracy, precision, recall, F1, confusion matrix (JSON + console).
 *
 * Usage: node scripts/evaluate-tfidf.js
 *        npm run evaluate
 */

var fs = require('fs');
var path = require('path');

var ml = require('../services/sifcoMlTrainingService');

var TRAINING_DIR = path.join(__dirname, '..', 'data', 'training');
var EVAL_DIR = path.join(TRAINING_DIR, 'evaluation');
var TEST_CASES_PATH = path.join(EVAL_DIR, 'test_cases.json');
var RESULTS_DIR = path.join(EVAL_DIR, 'results');

var REJECT_LABEL = 'reject';

function loadTestCases() {
  return JSON.parse(fs.readFileSync(TEST_CASES_PATH, 'utf8'));
}

function readPositiveCase(item) {
  var text = fs.readFileSync(path.join(TRAINING_DIR, item.sourceFile), 'utf8');
  return {
    id: item.id,
    name: item.sourceFile,
    text: text,
    expectedType: item.expectedType,
    mustAccept: item.mustAccept !== false,
  };
}

function buildSamples() {
  var cfg = loadTestCases();
  var samples = cfg.positive_cases.map(readPositiveCase);
  cfg.negative_cases.forEach(function (item) {
    samples.push({
      id: item.id,
      name: item.name,
      text: item.text,
      expectedType: item.expectedType,
      mustAccept: false,
    });
  });
  return samples;
}

function predictedType(result) {
  if (!result.bestMatch) return REJECT_LABEL;
  if (!result.accepted) return REJECT_LABEL;
  return result.bestMatch.id;
}

function actualType(sample) {
  if (!sample.mustAccept || !sample.expectedType) return REJECT_LABEL;
  return sample.expectedType;
}

function top1Type(result) {
  if (!result.bestMatch) return REJECT_LABEL;
  return result.bestMatch.id;
}

function uniqueLabels(samples, predictions) {
  var set = {};
  samples.forEach(function (s) {
    var a = actualType(s);
    set[a] = true;
  });
  predictions.forEach(function (p) {
    set[p.predictedTop1] = true;
    set[p.actual] = true;
  });
  return Object.keys(set).sort();
}

function buildConfusionMatrix(labels, pairs, valueFn) {
  var matrix = {};
  labels.forEach(function (row) {
    matrix[row] = {};
    labels.forEach(function (col) { matrix[row][col] = 0; });
  });
  pairs.forEach(function (p) {
    var row = valueFn(p, 'actual');
    var col = valueFn(p, 'predicted');
    if (!matrix[row]) matrix[row] = {};
    if (matrix[row][col] == null) matrix[row][col] = 0;
    matrix[row][col] += 1;
  });
  return matrix;
}

function perClassMetrics(matrix, labels) {
  var rows = {};
  labels.forEach(function (label) {
    var tp = (matrix[label] && matrix[label][label]) || 0;
    var fp = 0;
    var fn = 0;
    labels.forEach(function (other) {
      if (other !== label) {
        fp += (matrix[other] && matrix[other][label]) || 0;
        fn += (matrix[label] && matrix[label][other]) || 0;
      }
    });
    var precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    var recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    var f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    rows[label] = {
      tp: tp, fp: fp, fn: fn,
      precision: round(precision),
      recall: round(recall),
      f1: round(f1),
    };
  });
  return rows;
}

function macroAverage(perClass, field) {
  var labels = Object.keys(perClass);
  if (!labels.length) return 0;
  var sum = labels.reduce(function (acc, k) { return acc + perClass[k][field]; }, 0);
  return round(sum / labels.length);
}

function round(n) {
  return Math.round(n * 10000) / 10000;
}

function formatMatrixTable(matrix, labels) {
  var header = ['actual \\ predicted'].concat(labels);
  var lines = [header.join('\t')];
  labels.forEach(function (row) {
    var cells = labels.map(function (col) {
      return String((matrix[row] && matrix[row][col]) || 0);
    });
    lines.push([row].concat(cells).join('\t'));
  });
  return lines.join('\n');
}

function evaluateMode(samples, mode) {
  ml.clearCorpusCache();
  ml.rebuildTrainingFromDisk();

  var pairs = samples.map(function (sample) {
    var corpusOptions = {};
    if (mode === 'leave_one_out' && sample.expectedType && sample.mustAccept) {
      corpusOptions = { excludeSpecIds: [sample.expectedType], writeCorpusJson: false };
    }
    var result = ml.classifyDocument(sample.text, { corpusOptions: corpusOptions });
    return {
      id: sample.id,
      name: sample.name,
      actual: actualType(sample),
      expectedType: sample.expectedType,
      mustAccept: sample.mustAccept,
      predictedTop1: top1Type(result),
      predictedAccepted: result.accepted,
      predictedType: predictedType(result),
      similarity: result.similarity || 0,
      combinedScore: result.combinedScore || (result.bestMatch && result.bestMatch.combinedScore) || 0,
      classificationCorrect: top1Type(result) === (sample.expectedType || REJECT_LABEL),
      acceptCorrect: result.accepted === sample.mustAccept,
    };
  });

  var labels = uniqueLabels(samples, pairs);
  var acceptMatrix = buildConfusionMatrix(
    ['accept', 'reject'],
    pairs,
    function (p, side) {
      if (side === 'actual') return p.mustAccept ? 'accept' : 'reject';
      return p.predictedAccepted ? 'accept' : 'reject';
    }
  );

  var classMatrix = buildConfusionMatrix(labels, pairs, function (p, side) {
    return side === 'actual' ? p.actual : p.predictedTop1;
  });

  var perClass = perClassMetrics(classMatrix, labels.filter(function (l) { return l !== REJECT_LABEL; }));
  if (labels.indexOf(REJECT_LABEL) >= 0) {
    perClass[REJECT_LABEL] = perClassMetrics(classMatrix, [REJECT_LABEL])[REJECT_LABEL];
  }

  var classificationAccuracy = round(
    pairs.filter(function (p) { return p.classificationCorrect; }).length / pairs.length
  );
  var acceptAccuracy = round(
    pairs.filter(function (p) { return p.acceptCorrect; }).length / pairs.length
  );

  var positiveClassLabels = labels.filter(function (l) { return l !== REJECT_LABEL; });
  var macroPrecision = macroAverage(perClass, 'precision');
  var macroRecall = macroAverage(perClass, 'recall');
  var macroF1 = macroAverage(perClass, 'f1');

  var acceptPerClass = perClassMetrics(acceptMatrix, ['accept', 'reject']);

  return {
    mode: mode,
    sample_count: pairs.length,
    positive_samples: pairs.filter(function (p) { return p.mustAccept; }).length,
    negative_samples: pairs.filter(function (p) { return !p.mustAccept; }).length,
    classification_accuracy: classificationAccuracy,
    accept_reject_accuracy: acceptAccuracy,
    macro_precision: macroPrecision,
    macro_recall: macroRecall,
    macro_f1: macroF1,
    accept_precision: acceptPerClass.accept ? acceptPerClass.accept.precision : 0,
    accept_recall: acceptPerClass.accept ? acceptPerClass.accept.recall : 0,
    accept_f1: acceptPerClass.accept ? acceptPerClass.accept.f1 : 0,
    reject_precision: acceptPerClass.reject ? acceptPerClass.reject.precision : 0,
    reject_recall: acceptPerClass.reject ? acceptPerClass.reject.recall : 0,
    reject_f1: acceptPerClass.reject ? acceptPerClass.reject.f1 : 0,
    confusion_matrix_top1: classMatrix,
    confusion_matrix_labels: labels,
    accept_reject_matrix: acceptMatrix,
    per_class: perClass,
    predictions: pairs,
    positive_class_count: positiveClassLabels.length,
  };
}

function runTfidfEvaluation(samples) {
  ml.clearCorpusCache();
  ml.rebuildTrainingFromDisk();

  var fullCorpus = evaluateMode(samples, 'full_corpus');
  var leaveOneOut = evaluateMode(samples, 'leave_one_out');

  return {
    generated_at: new Date().toISOString(),
    algorithm: 'TF-IDF + cosine similarity',
    model_version: 'sifco-ml-v1',
    reference_documents: ml.REFERENCE_SPECS.length,
    thresholds: {
      accept_similarity: ml.ACCEPT_SIMILARITY,
      accept_marker_ratio: ml.ACCEPT_MARKER_RATIO,
      accept_min_similarity: ml.ACCEPT_MIN_SIMILARITY,
    },
    evaluation_modes: {
      full_corpus: {
        description: 'All 6 reference documents included in training corpus (operational mode)',
        metrics: {
          classification_accuracy: fullCorpus.classification_accuracy,
          accept_reject_accuracy: fullCorpus.accept_reject_accuracy,
          macro_precision: fullCorpus.macro_precision,
          macro_recall: fullCorpus.macro_recall,
          macro_f1: fullCorpus.macro_f1,
          accept_precision: fullCorpus.accept_precision,
          accept_recall: fullCorpus.accept_recall,
          accept_f1: fullCorpus.accept_f1,
          reject_precision: fullCorpus.reject_precision,
          reject_recall: fullCorpus.reject_recall,
          reject_f1: fullCorpus.reject_f1,
        },
        confusion_matrix_top1: fullCorpus.confusion_matrix_top1,
        accept_reject_matrix: fullCorpus.accept_reject_matrix,
        per_class: fullCorpus.per_class,
      },
      leave_one_out: {
        description: 'Each positive sample evaluated with its own reference excluded from corpus (honest generalization test)',
        metrics: {
          classification_accuracy: leaveOneOut.classification_accuracy,
          accept_reject_accuracy: leaveOneOut.accept_reject_accuracy,
          macro_precision: leaveOneOut.macro_precision,
          macro_recall: leaveOneOut.macro_recall,
          macro_f1: leaveOneOut.macro_f1,
        },
        confusion_matrix_top1: leaveOneOut.confusion_matrix_top1,
        per_class: leaveOneOut.per_class,
      },
    },
    predictions: fullCorpus.predictions,
  };
}

function main() {
  if (!fs.existsSync(TEST_CASES_PATH)) {
    console.error('Missing test cases:', TEST_CASES_PATH);
    process.exit(1);
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  var samples = buildSamples();

  console.log('\n=== TF-IDF + Cosine Similarity Evaluation ===\n');
  console.log('Samples:', samples.length, '(6 positive +', samples.length - 6, 'negative)\n');

  var report = runTfidfEvaluation(samples);
  var fullCorpus = report.evaluation_modes.full_corpus;
  fullCorpus.confusion_matrix_labels = Object.keys(fullCorpus.confusion_matrix_top1).sort();
  var leaveOneOutRaw = report.evaluation_modes.leave_one_out;
  leaveOneOutRaw.confusion_matrix_labels = Object.keys(leaveOneOutRaw.confusion_matrix_top1).sort();

  var outPath = path.join(RESULTS_DIR, 'tfidf_evaluation.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  function printMode(title, data, matrixLabels) {
    var m = data.metrics || data;
    console.log('--- ' + title + ' ---');
    console.log('Classification accuracy (top-1 type):', ((m.classification_accuracy || 0) * 100).toFixed(1) + '%');
    if (m.accept_reject_accuracy != null) {
      console.log('Accept/reject accuracy:              ', (m.accept_reject_accuracy * 100).toFixed(1) + '%');
    }
    console.log('Macro precision:                     ', m.macro_precision);
    console.log('Macro recall:                        ', m.macro_recall);
    console.log('Macro F1:                            ', m.macro_f1);
    console.log('\nConfusion matrix (top-1 predicted type):\n');
    console.log(formatMatrixTable(data.confusion_matrix_top1, matrixLabels));
    if (data.accept_reject_matrix) {
      console.log('\nAccept/reject matrix:\n');
      console.log(formatMatrixTable(data.accept_reject_matrix, ['accept', 'reject']));
    }
    console.log('');
  }

  printMode('Full corpus (operational)', fullCorpus, fullCorpus.confusion_matrix_labels);
  printMode('Leave-one-out (generalization)', leaveOneOutRaw, leaveOneOutRaw.confusion_matrix_labels);

  console.log('Per-class metrics (full corpus):');
  Object.keys(fullCorpus.per_class).forEach(function (label) {
    var m = fullCorpus.per_class[label];
    console.log(' ', label + ':', 'P=' + m.precision, 'R=' + m.recall, 'F1=' + m.f1);
  });

  console.log('\nResults saved to:', outPath);
  return report;
}

if (require.main === module) {
  main();
}

module.exports = { main: main, runTfidfEvaluation: runTfidfEvaluation, buildSamples: buildSamples, evaluateMode: evaluateMode };
