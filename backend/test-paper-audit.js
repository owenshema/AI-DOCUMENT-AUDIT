'use strict';
const fs = require('fs');
const path = require('path');
const { runPaperAudit, rebuildTraining } = require('./services/organizationTrainingService');

rebuildTraining();

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('OK  ', name);
  } catch (e) {
    failed++;
    console.log('FAIL', name, '-', e.message);
  }
}

var dir = path.join(__dirname, 'data', 'training');
var files = [
  ['01-packing-list-unique-hybrid.txt', 'packing_list'],
  ['02-shipping-agreement-john.txt', 'shipping_agreement'],
  ['03-hbl-unique-hybrid.txt', 'bill_of_lading'],
  ['04-freight-invoice-unique-hybrid.txt', 'freight_invoice'],
  ['05-trucking-invoice-ecmu5567458.txt', 'trucking_invoice'],
  ['06-sea-freight-john.txt', 'sea_freight_invoice'],
];

files.forEach(function (pair) {
  var file = pair[0];
  var expectedType = pair[1];
  var text = fs.readFileSync(path.join(dir, file), 'utf8');
  var r = runPaperAudit(text, { fileName: file });
  test(file + ' accepts as ' + expectedType, function () {
    if (!r.organization_match) throw new Error(r.organization_message);
    if (r.document_type !== expectedType) throw new Error('got ' + r.document_type + ' expected ' + expectedType);
    if (r.engine !== 'sifco-ml-trained') throw new Error('engine ' + r.engine);
    if (r.violations.length) throw new Error('should have no violations');
  });
});

test('shipping agreement with renamed file (content only)', function () {
  var text = fs.readFileSync(path.join(dir, '02-shipping-agreement-john.txt'), 'utf8');
  var names = ['scan001.pdf', 'document_final.pdf', 'untitled.pdf', 'invoice.pdf'];
  names.forEach(function (fn) {
    var r = runPaperAudit(text, { fileName: fn });
    if (!r.organization_match) throw new Error(fn + ': ' + r.organization_message);
  });
});

test('metadata-only (renamed file, no PDF body) is rejected with clear message', function () {
  var r = runPaperAudit('Title: my-random-name.pdf\nFile: my-random-name.pdf\nCategory: compliance', { fileName: 'my-random-name.pdf' });
  if (r.organization_match) throw new Error('should not accept metadata only');
  if (!/renaming|file name|content/i.test(r.organization_message)) throw new Error('expected rename hint');
});

test('foreign doc rejected', function () {
  var r = runPaperAudit('ACME CORP random business letter invoice 999');
  if (r.organization_match) throw new Error('should reject');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
