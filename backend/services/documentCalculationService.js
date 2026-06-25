'use strict';
/**
 * Validates numeric calculations on SIFCO documents.
 * Flags standardized "Calculation Error" issues when totals/lines do not match.
 */

var criticalFindings = require('./sifcoCriticalFindingsService');

var CALC_CHECK = 'Calculation Error';

function calcIssue(message, severity) {
  return {
    severity: severity || 'HIGH',
    check: CALC_CHECK,
    message: message,
  };
}

function validatePackingListMath(text, fields) {
  var issues = [];
  if (!fields.packing_lines || !fields.packing_lines.length) return issues;

  var sumPackages = 0;
  var lineIssues = [];

  fields.packing_lines.forEach(function (line) {
    sumPackages += line.packages;
    if (line.qty !== line.packages) {
      lineIssues.push('Line ' + line.line + ' (' + line.description + '): QTY ' + line.qty + ' ≠ packages ' + line.packages);
    }
  });

  var statedTotal = fields.total;
  if (statedTotal == null) {
    var totalLine = (text || '').toUpperCase().match(/TOTAL\s+(\d+)/);
    if (totalLine) statedTotal = parseInt(totalLine[1], 10);
  }

  if (statedTotal != null && sumPackages !== statedTotal) {
    issues.push(calcIssue(
      'Package total mismatch: line items sum to ' + sumPackages + ' but document states TOTAL ' + statedTotal
    ));
  }

  if (lineIssues.length) {
    issues.push(calcIssue(
      'QTY/packages mismatch on rows: ' + lineIssues.slice(0, 4).join('; '),
      'MEDIUM'
    ));
  }

  return issues;
}

function validateInvoiceLineMath(fields) {
  var issues = [];
  (fields.invoice_lines || []).forEach(function (line, idx) {
    var expected = line.qty * line.rate;
    if (Math.abs(expected - line.total) > 0.01) {
      issues.push(calcIssue(
        'Invoice line ' + (idx + 1) + ': ' + line.qty + ' × ' + line.rate + ' = ' + expected.toFixed(2) + ', not ' + line.total
      ));
    }
  });
  return issues;
}

function validateFreightInvoiceTotals(text, fields, docType) {
  var issues = [];
  if (docType !== 'SHIPPING_AGREEMENT' && docType !== 'FREIGHT_INVOICE' && docType !== 'SIFCO_INVOICE') {
    return issues;
  }

  var amounts = [];
  (text || '').split('\n').forEach(function (line) {
    var match = line.match(/(\d[\d,\.]*)\s+(\d[\d,\.]*)\s*$/);
    if (match) {
      var rate = parseFloat(match[1].replace(/,/g, ''));
      var total = parseFloat(match[2].replace(/,/g, ''));
      if (rate > 0 && total > 0) amounts.push(total);
    }
  });

  if (amounts.length && fields.total != null) {
    var sum = amounts.reduce(function (a, b) { return a + b; }, 0);
    if (Math.abs(sum - fields.total) > 1) {
      issues.push(calcIssue(
        'Charge lines sum to USD ' + sum + ' but TOTAL shows USD ' + fields.total
      ));
    }
  }

  return issues;
}

function validateAgreementCharges(text, fields) {
  var issues = [];
  var charges = criticalFindings.extractAgreementCharges(text);
  if (charges.length >= 2 && fields.total != null) {
    var sum = charges.reduce(function (a, c) { return a + c.amount; }, 0);
    if (Math.abs(sum - fields.total) > 0.01) {
      issues.push(calcIssue(
        'Agreement charges sum to USD ' + sum + ' but TOTAL shows USD ' + fields.total
      ));
    }
  }
  return issues;
}

function validateSifcoInvoiceArithmetic(text, fields) {
  var issues = [];
  var lineTotals = criticalFindings.extractSifcoInvoiceLineTotals(text);
  var lineSum = lineTotals.reduce(function (a, b) { return a + b; }, 0);
  var writtenAmt = criticalFindings.parseWrittenUsdAmount(text);
  var numericFooter = (text || '').match(/ONLY\s+(\d[\d,\.]+)/i);
  var footerNum = numericFooter ? parseFloat(numericFooter[1].replace(/,/g, '')) : null;

  if (lineSum > 0 && writtenAmt != null && Math.abs(writtenAmt - lineSum) > 1) {
    issues.push(calcIssue(
      'Written amount USD ' + writtenAmt + ' does not match line items total USD ' + lineSum
    ));
  }
  if (lineSum > 0 && footerNum != null && Math.abs(lineSum - footerNum) > 1) {
    issues.push(calcIssue(
      'Line items total USD ' + lineSum + ' but footer/numeric total shows USD ' + footerNum
    ));
  }
  if (writtenAmt != null && footerNum != null && Math.abs(writtenAmt - footerNum) > 1 && lineSum <= 0) {
    issues.push(calcIssue(
      'Written amount USD ' + writtenAmt + ' does not match footer total USD ' + footerNum
    ));
  }

  return issues;
}

function validateTruckingInvoiceTotal(text, fields) {
  var issues = [];
  var m = (text || '').match(/(\d[\d,\.]+)\s+0%\s+0\.00\s+(\d[\d,\.]+)/);
  var extracted = m ? parseFloat(m[2].replace(/,/g, '')) : null;
  if (extracted != null && fields.total != null && Math.abs(extracted - fields.total) > 1) {
    issues.push(calcIssue(
      'Trucking line total USD ' + extracted + ' does not match document TOTAL USD ' + fields.total
    ));
  }
  return issues;
}

function documentHasCalculations(text, fields, docType) {
  if ((fields.packing_lines || []).length) return true;
  if ((fields.invoice_lines || []).length) return true;
  if (fields.total != null) return true;
  if (/TOTAL|USD|FREIGHT|CHARGES|QTY|×|\bx\b/i.test(text || '')) return true;
  return docType === 'PACKING_LIST' || docType === 'SHIPPING_AGREEMENT' ||
    docType === 'FREIGHT_INVOICE' || docType === 'SIFCO_INVOICE' || docType === 'TRUCKING_INVOICE';
}

/**
 * Run all applicable calculation checks for a document type.
 */
function validateDocumentCalculations(text, docType, fields) {
  fields = fields || {};
  if (!documentHasCalculations(text, fields, docType)) return [];

  var issues = [];

  if (docType === 'PACKING_LIST') {
    issues = issues.concat(validatePackingListMath(text, fields));
  }

  issues = issues.concat(validateInvoiceLineMath(fields));
  issues = issues.concat(validateFreightInvoiceTotals(text, fields, docType));

  if (docType === 'SHIPPING_AGREEMENT') {
    issues = issues.concat(validateAgreementCharges(text, fields));
  }

  if (docType === 'SIFCO_INVOICE' || docType === 'FREIGHT_INVOICE') {
    issues = issues.concat(validateSifcoInvoiceArithmetic(text, fields));
  }

  if (docType === 'TRUCKING_INVOICE') {
    issues = issues.concat(validateTruckingInvoiceTotal(text, fields));
  }

  return issues;
}

function isCalculationErrorIssue(issue) {
  if (!issue) return false;
  if (issue.check === CALC_CHECK) return true;
  return /calculation|arithmetic|total mismatch|sum to|does not match.*total|×|≠ packages/i.test(issue.message || '');
}

function calculationErrorsFromIssues(issues) {
  return (issues || [])
    .filter(isCalculationErrorIssue)
    .map(function (i) { return i.message; });
}

module.exports = {
  CALC_CHECK: CALC_CHECK,
  validateDocumentCalculations: validateDocumentCalculations,
  isCalculationErrorIssue: isCalculationErrorIssue,
  calculationErrorsFromIssues: calculationErrorsFromIssues,
  documentHasCalculations: documentHasCalculations,
};
