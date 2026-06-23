'use strict';
const fs = require('fs');
const path = require('path');
const nb = require('../services/sifcoNotebookAuditService');
const org = require('../services/organizationTrainingService');
const ship = require('../services/sifcoShipmentConsistencyService');

const DOCS = [
  ['02-shipping-agreement-john.txt', 'Doc 1 — Shipping Agreement', 87],
  ['06-sea-freight-john.txt', 'Doc 2 — Sea Freight Invoice', 72],
  ['01-packing-list-unique-hybrid.txt', 'Doc 3 — Packing List', 78],
  ['03-hbl-unique-hybrid.txt', 'Doc 4 — HBL', 82],
  ['05-trucking-invoice-ecmu5567458.txt', 'Doc 5 — Trucking Invoice', 75],
  ['04-freight-invoice-unique-hybrid.txt', 'Doc 6 — SIFCO Invoice', 68],
];

const dir = path.join(__dirname, '..', 'data', 'training');

console.log('=== Critical findings per document ===\n');
DOCS.forEach(function (row) {
  var file = row[0];
  var title = row[1];
  var expected = row[2];
  var text = fs.readFileSync(path.join(dir, file), 'utf8');
  var r = nb.auditText(text);
  console.log(title);
  console.log('  Score: ' + r.complianceScore + '/100 (expected ~' + expected + ')');
  console.log('  Status: ' + r.status);
  (r.issues || []).forEach(function (i) {
    console.log('  [' + i.severity + '] ' + i.check + ': ' + i.message);
  });
  console.log('');
});

console.log('=== Cross-document bundle ===\n');
var entries = DOCS.map(function (row) {
  var text = fs.readFileSync(path.join(dir, row[0]), 'utf8');
  return { documentId: row[0], text: text, auditResult: org.runPaperAudit(text, { fileName: row[0] }) };
});
var bundle = ship.auditShipmentBundle(entries);
console.log('Status:', bundle.status);
(bundle.issues || []).forEach(function (i) {
  console.log('[' + i.severity + '] ' + i.check + ': ' + i.message);
});
