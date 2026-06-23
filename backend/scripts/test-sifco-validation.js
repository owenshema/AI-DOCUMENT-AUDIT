'use strict';
const fs = require('fs');
const path = require('path');
const nb = require('../services/sifcoNotebookAuditService');
const org = require('../services/organizationTrainingService');
const ship = require('../services/sifcoShipmentConsistencyService');

const dir = path.join(__dirname, '..', 'data', 'training');
const files = fs.readdirSync(dir).filter(function (f) { return f.endsWith('.txt') && /^\d{2}-/.test(f); });

console.log('=== Per-document field checks ===');
files.forEach(function (f) {
  var text = fs.readFileSync(path.join(dir, f), 'utf8');
  var r = nb.auditText(text);
  console.log('\n' + f + ':', r.docTypeName, r.status, '(' + (r.issues || []).length + ' issues)');
  (r.issues || []).slice(0, 6).forEach(function (i) {
    console.log('  [' + i.severity + ']', i.check + ':', i.message);
  });
  if (r.fields) {
    var f2 = r.fields;
    console.log('  Fields: BL=' + (f2.bl_numbers || []).join(',') + ' container=' + f2.container +
      ' TIN=' + (f2.tin_numbers || []).join(',') + ' invoice=' + f2.invoice_no);
    console.log('  Ports: POL=' + f2.port_of_loading + ' POD=' + f2.port_of_discharge + ' DEST=' + f2.final_destination);
    if (f2.packing_lines && f2.packing_lines.length) {
      console.log('  Packing lines:', f2.packing_lines.length, 'sum packages:', f2.packing_lines.reduce(function (a, l) { return a + l.packages; }, 0));
    }
  }
});

console.log('\n=== Cross-document bundle (all 6) ===');
var entries = files.map(function (f) {
  var text = fs.readFileSync(path.join(dir, f), 'utf8');
  var audit = org.runPaperAudit(text, { fileName: f });
  return { documentId: f, text: text, auditResult: audit };
});
var bundle = ship.auditShipmentBundle(entries);
console.log(JSON.stringify(bundle, null, 2));
