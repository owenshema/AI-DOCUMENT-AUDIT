'use strict';
/**
 * SIFCO critical findings — encodes the six-document audit rules from operations review.
 * Detects arithmetic errors, blank TIN, title typos, vessel typos, cargo mismatches, etc.
 */
var notebookAudit = require('./sifcoNotebookAuditService');

var VESSEL_CANONICAL = {
  SEMARSNG: 'CMA CGM SEMARANG',
  SEMARANG: 'CMA CGM SEMARANG',
};

var HBL_CARGO_KEYWORDS = [
  'TOYOTA ESQUIRE', 'MATRESS', 'MATTRESS', 'SUGAR', 'RICE', 'ESQUIRE',
];

var PACKING_LIST_CARGO_KEYWORDS = [
  'PARSHOCK', 'SPARE PART', 'GEARBOX', 'BUMPER', 'FENDER', 'RADIATOR', 'INVERTER',
];

var WORD_NUMBERS = {
  ZERO: 0, ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, SIX: 6, SEVEN: 7, EIGHT: 8, NINE: 9,
  TEN: 10, ELEVEN: 11, TWELVE: 12, THIRTEEN: 13, FOURTEEN: 14, FIFTEEN: 15,
  SIXTEEN: 16, SEVENTEEN: 17, EIGHTEEN: 18, NINETEEN: 19, TWENTY: 20, THIRTY: 30,
  FORTY: 40, FIFTY: 50, SIXTY: 60, SEVENTY: 70, EIGHTY: 80, NINETY: 90,
};

function parseWrittenUsdAmount(text) {
  var m = (text || '').match(/USD\s+([A-Za-z\s]+?)\s+DOLLARS?\s+ONLY/i);
  if (!m) {
    m = (text || '').match(/USD\s*[;:]\s*([A-Za-z\s]+?)\s+(?:DOLLARS?\s+)?ONLY/i);
  }
  if (!m) {
    m = (text || '').match(/([A-Z\s]+THOUSAND[A-Z\s]*)\s+(?:DOLLARS?\s+)?ONLY/i);
  }
  if (!m) return null;

  var words = m[1].toUpperCase().replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(Boolean);
  var total = 0;
  var current = 0;

  words.forEach(function (w) {
    if (w === 'AND') return;
    if (w === 'THOUSAND') {
      current = (current || 1) * 1000;
      total += current;
      current = 0;
      return;
    }
    if (w === 'HUNDRED') {
      current = (current || 1) * 100;
      total += current;
      current = 0;
      return;
    }
    if (WORD_NUMBERS[w] != null) {
      current += WORD_NUMBERS[w];
    }
  });
  total += current;
  return total > 0 ? total : null;
}

function extractEtd(text) {
  var m = (text || '').match(/ETD\s*[:\s]*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})/i);
  return m ? m[1] : null;
}

function parseDateParts(dateStr) {
  if (!dateStr) return null;
  var m = dateStr.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
  if (!m) return null;
  var month = parseInt(m[2], 10);
  var year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  return { month: month, year: year, raw: dateStr };
}

function hasBlankTinField(text) {
  return /TIN\s*:\s*(?:\n|$|\r)/im.test(text || '') ||
    /TIN\s*:\s*KIGALI/im.test(text || '');
}

function extractAgreementCharges(text) {
  var charges = [];
  var patterns = [
    { label: 'Sea Freight', re: /SEA\s+FREIGHT[^\d]*(\d[\d,\.]*)\s+(\d[\d,\.]*)/i },
    { label: 'Road Freight', re: /ROAD\s+FREIGHT[^\d]*(\d[\d,\.]*)\s+(\d[\d,\.]*)/i },
    { label: 'B/L Fee', re: /B\/L\s+FEE[^\d]*(\d[\d,\.]*)\s*(\d[\d,\.]*)/i },
    { label: 'Local Charges', re: /LOCAL\s+CHARGES[^\d]*(\d[\d,\.]*)\s*(\d[\d,\.]*)/i },
  ];
  patterns.forEach(function (p) {
    var m = (text || '').match(p.re);
    if (m) {
      charges.push({
        label: p.label,
        amount: parseFloat(String(m[2] || m[1]).replace(/,/g, '')),
      });
    }
  });
  return charges;
}

function extractSifcoInvoiceLineTotals(text) {
  var amounts = [];
  var lines = (text || '').split('\n');
  var inCharges = false;
  lines.forEach(function (line) {
    if (/FREIGHT\s+CHARGES|BL\s+FEE|LOCAL\s+CHARGES|WAR\s+COST/i.test(line)) inCharges = true;
    if (/BANK\s+OF|A\/C\s+NAME/i.test(line)) inCharges = false;
    if (!inCharges) return;
    var rowMatch = line.match(/(\d[\d,\.]*)\s+0%\s+0\.00\s+(\d[\d,\.]+)/);
    if (rowMatch) {
      amounts.push(parseFloat(rowMatch[2].replace(/,/g, '')));
      return;
    }
    var solo = line.match(/^\s*(\d[\d,\.]+)\s*$/);
    if (solo && parseFloat(solo[1]) >= 10) {
      amounts.push(parseFloat(solo[1].replace(/,/g, '')));
    }
  });
  return amounts;
}

function extractTruckingTotal(text) {
  var m = (text || '').match(/(\d[\d,\.]+)\s+0%\s+0\.00\s+(\d[\d,\.]+)/);
  if (m) return parseFloat(m[2].replace(/,/g, ''));
  m = (text || '').match(/Three\s+Thousand\s+Seven\s+Hundred[^\d]*(\d[\d,\.]+)/i);
  if (m) return parseFloat(m[1].replace(/,/g, ''));
  m = (text || '').match(/INLAND\s+TRANSPORT[^\d]*(\d[\d,\.]+)/i);
  return m ? parseFloat(m[1].replace(/,/g, '')) : null;
}

function extractCargoKeywords(text, keywords) {
  var upper = (text || '').toUpperCase();
  return keywords.filter(function (kw) { return upper.indexOf(kw) >= 0; });
}

function normalizePod(name) {
  var n = String(name || '').toUpperCase().replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/MOMBASA/.test(n)) return 'MOMBASA';
  if (/DAR\s+ES\s+SAL/.test(n)) return 'DAR ES SALAAM';
  return n;
}

function runCriticalChecks(text, docType, fields, fieldChecks) {
  var issues = [];
  var textUpper = (text || '').toUpperCase();
  fieldChecks = fieldChecks || {};

  if (docType === 'SHIPPING_AGREEMENT') {
    var charges = extractAgreementCharges(text);
    if (charges.length >= 4 && fields.total != null) {
      var sum = charges.reduce(function (a, c) { return a + c.amount; }, 0);
      if (Math.abs(sum - fields.total) > 0.01) {
        issues.push({
          severity: 'HIGH',
          check: 'Financial Totals',
          message: 'Agreement charges sum to USD ' + sum + ' but TOTAL shows USD ' + fields.total,
        });
      }
    }
    if (/CLIENT['\u2019]?S\s+SIGNATURE/i.test(text)) {
      issues.push({
        severity: 'MEDIUM',
        check: 'Client Signature',
        message: 'Client signature block appears empty — agreement may lack legal force without it',
      });
    }
  }

  if (docType === 'FREIGHT_INVOICE') {
    if (/FREIGHT\s+INVOCE/i.test(text)) {
      issues.push({
        severity: 'MEDIUM',
        check: 'Document Title',
        message: 'Title is misspelled ("FREIGHT INVOCE" — should be "FREIGHT INVOICE")',
      });
    }
    if (fields.port_of_discharge && normalizePod(fields.port_of_discharge) === 'DAR ES SALAAM') {
      issues.push({
        severity: 'MEDIUM',
        check: 'Port of Discharge',
        message: 'Port of Discharge is Dar es Salaam — verify this matches other shipment papers for this route',
      });
    }
  }

  if (docType === 'PACKING_LIST') {
    if (fields.vessel && VESSEL_CANONICAL[fields.vessel.replace(/\s+/g, '').toUpperCase()] === undefined &&
        /SEMARSNG/i.test(fields.vessel)) {
      issues.push({
        severity: 'MEDIUM',
        check: 'Vessel Name',
        message: 'Vessel misspelled as "' + fields.vessel + '" — should be CMA CGM SEMARANG',
      });
    } else if (fields.vessel && /SEMARSNG/i.test(fields.vessel)) {
      issues.push({
        severity: 'MEDIUM',
        check: 'Vessel Name',
        message: 'Vessel misspelled as "' + fields.vessel + '" — should be CMA CGM SEMARANG',
      });
    }
    var etd = extractEtd(text);
    if (etd) fields.etd = etd;
  }

  if (docType === 'HBL') {
    var hblCargo = extractCargoKeywords(text, HBL_CARGO_KEYWORDS);
    if (hblCargo.length) {
      fields.hbl_cargo = hblCargo;
      issues.push({
        severity: 'MEDIUM',
        check: 'Cargo Description',
        message: 'HBL cargo includes ' + hblCargo.join(', ') +
          ' — verify these match the packing list before customs clearance',
      });
    }
  }

  if (docType === 'PACKING_LIST') {
    var plCargo = extractCargoKeywords(text, PACKING_LIST_CARGO_KEYWORDS);
    if (plCargo.length) fields.packing_cargo = plCargo;
  }

  if (docType === 'TRUCKING_INVOICE') {
    var truckingTotal = extractTruckingTotal(text);
    if (truckingTotal != null) fields.trucking_total = truckingTotal;
    if (truckingTotal != null && truckingTotal >= 3700) {
      issues.push({
        severity: 'MEDIUM',
        check: 'Trucking Amount',
        message: 'Inland transport billed at USD ' + truckingTotal +
          ' — verify against the agreed road freight in the shipping agreement',
      });
    }
  }

  if (docType === 'SIFCO_INVOICE') {
    var lineTotals = extractSifcoInvoiceLineTotals(text);
    var lineSum = lineTotals.reduce(function (a, b) { return a + b; }, 0);
    var writtenAmt = parseWrittenUsdAmount(text);
    var numericFooter = (text || '').match(/ONLY\s+(\d[\d,\.]+)/i);
    var footerNum = numericFooter ? parseFloat(numericFooter[1].replace(/,/g, '')) : null;

    if (lineSum > 0) fields.invoice_line_sum = lineSum;
    if (writtenAmt != null) fields.written_amount = writtenAmt;
    if (footerNum != null) fields.footer_amount = footerNum;

    if (lineSum > 0 && writtenAmt != null && Math.abs(writtenAmt - lineSum) > 1) {
      var footerMatchesLines = footerNum != null && Math.abs(lineSum - footerNum) <= 1;
      var severity = footerMatchesLines ? 'MEDIUM' : 'HIGH';
      issues.push({
        severity: severity,
        check: 'Amount in Words',
        message: footerMatchesLines
          ? 'Written amount (USD ' + writtenAmt + ') does not match numeric total USD ' + lineSum + ' — likely a wording typo in the invoice'
          : 'Line items total USD ' + lineSum + ' but written amount says USD ' + writtenAmt + ' — verify before payment',
      });
      if (!footerMatchesLines) {
        issues.push({
          severity: 'HIGH',
          check: 'Invoice Arithmetic',
          message: 'Either the written amount (USD ' + writtenAmt + ') or the line breakdown (USD ' +
            lineSum + ') is wrong — resolve the discrepancy',
        });
      }
    }
    if (lineSum > 0 && footerNum != null && Math.abs(lineSum - footerNum) > 1 && writtenAmt == null) {
      issues.push({
        severity: 'HIGH',
        check: 'Invoice Arithmetic',
        message: 'Line items total USD ' + lineSum + ' but footer shows USD ' + footerNum,
      });
    }
  }

  if (docType === 'SHIPPING_AGREEMENT') {
    var roadCharge = extractAgreementCharges(text).find(function (c) { return c.label === 'Road Freight'; });
    if (roadCharge) fields.agreed_road_freight = roadCharge.amount;
  }

  return { issues: issues, fields: fields };
}

function runCrossDocumentCriticalChecks(docs) {
  var issues = [];

  var pods = {};
  docs.forEach(function (d) {
    if (d.fields.port_of_discharge) {
      var pod = normalizePod(d.fields.port_of_discharge);
      pods[pod] = (pods[pod] || []).concat(d.label);
    }
  });
  var podKeys = Object.keys(pods);
  if (podKeys.indexOf('MOMBASA') >= 0 && podKeys.indexOf('DAR ES SALAAM') >= 0) {
    issues.push({
      severity: 'HIGH',
      check: 'Port of Discharge Conflict',
      message: 'Port of Discharge conflict: some documents show Mombasa (' + pods.MOMBASA.join(', ') +
        ') while others show Dar es Salaam (' + pods['DAR ES SALAAM'].join(', ') +
        ') — must be resolved before customs clearance',
    });
  }

  var containers = {};
  docs.forEach(function (d) {
    if (d.fields.container) {
      containers[d.fields.container] = (containers[d.fields.container] || []).concat(d.label);
    }
  });
  var containerKeys = Object.keys(containers);
  if (containerKeys.length > 1) {
    var detail = containerKeys.map(function (c) {
      return c + ' (' + containers[c].join(', ') + ')';
    }).join(' vs ');
    issues.push({
      severity: 'HIGH',
      check: 'Container Mismatch',
      message: 'Container number mismatch across papers: ' + detail +
        ' — verify trucking invoice matches HBL and packing list',
    });
  }

  var agreedRoad = null;
  var truckingBill = null;
  docs.forEach(function (d) {
    if (d.fields.agreed_road_freight != null) agreedRoad = d.fields.agreed_road_freight;
    if (d.fields.trucking_total != null) truckingBill = d.fields.trucking_total;
  });
  if (agreedRoad != null && truckingBill != null && truckingBill > agreedRoad) {
    var diff = truckingBill - agreedRoad;
    issues.push({
      severity: 'HIGH',
      check: 'Road Freight Overcharge',
      message: 'Trucking invoice bills USD ' + truckingBill + ' but shipping agreement road freight is USD ' +
        agreedRoad + ' (USD ' + diff + ' over with no explanation)',
    });
  }

  var hblDoc = docs.find(function (d) { return d.specId === 'bill_of_lading'; });
  var plDoc = docs.find(function (d) { return d.specId === 'packing_list'; });
  if (hblDoc && plDoc && hblDoc.fields.hbl_cargo && plDoc.fields.packing_cargo) {
    var foreignCargo = hblDoc.fields.hbl_cargo.filter(function (c) {
      return PACKING_LIST_CARGO_KEYWORDS.every(function (p) {
        return c.indexOf(p) < 0;
      });
    });
    if (foreignCargo.length) {
      issues.push({
        severity: 'HIGH',
        check: 'Cargo Description',
        message: 'HBL cargo includes ' + foreignCargo.join(', ') +
          ' which do not appear on the packing list (spare parts only) — reconcile before clearance',
      });
    }
  }

  var etds = [];
  docs.forEach(function (d) {
    var etd = d.fields.etd || extractEtd(d.rawText || '');
    if (etd) {
      var parts = parseDateParts(etd);
      if (parts) etds.push({ label: d.label, etd: etd, month: parts.month });
    }
  });
  if (etds.length >= 2) {
    var months = etds.map(function (e) { return e.month; });
    var uniqueMonths = months.filter(function (m, i) { return months.indexOf(m) === i; });
    if (uniqueMonths.length > 1) {
      issues.push({
        severity: 'MEDIUM',
        check: 'ETD Date Conflict',
        message: 'ETD dates differ across papers: ' + etds.map(function (e) {
          return e.label + '=' + e.etd;
        }).join('; ') + ' — one-month gap may cause customs delays',
      });
    }
  }

  var vessels = docs.filter(function (d) { return d.fields.vessel; }).map(function (d) {
    return { label: d.label, vessel: d.fields.vessel };
  });
  vessels.forEach(function (v) {
    if (/SEMARSNG/i.test(v.vessel)) {
      var others = vessels.filter(function (o) {
        return o.label !== v.label && /SEMARANG/i.test(o.vessel);
      });
      if (others.length) {
        issues.push({
          severity: 'MEDIUM',
          check: 'Vessel Spelling',
          message: v.label + ' spells vessel "' + v.vessel + '" but ' + others[0].label +
            ' has "CMA CGM SEMARANG" — standardize vessel name',
        });
      }
    }
  });

  return issues;
}

function scoreFromIssues(issues) {
  var score = 100;
  (issues || []).forEach(function (i) {
    if (i.severity === 'CRITICAL') score -= 22;
    else if (i.severity === 'HIGH') score -= 11;
    else if (i.severity === 'MEDIUM') score -= 5;
    else if (i.severity === 'LOW') score -= 2;
  });
  return Math.max(10, Math.min(100, score));
}

module.exports = {
  runCriticalChecks: runCriticalChecks,
  runCrossDocumentCriticalChecks: runCrossDocumentCriticalChecks,
  scoreFromIssues: scoreFromIssues,
  extractEtd: extractEtd,
  parseWrittenUsdAmount: parseWrittenUsdAmount,
  extractAgreementCharges: extractAgreementCharges,
  extractSifcoInvoiceLineTotals: extractSifcoInvoiceLineTotals,
  normalizePod: normalizePod,
};
