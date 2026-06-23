'use strict';
var fs = require('fs');
var path = require('path');
var ai = require('../services/aiService');
var pdf = require('../services/pdfTextService');

var files = [
  '01-packing-list-unique-hybrid',
  '02-shipping-agreement-john',
  '03-hbl-unique-hybrid',
  '04-freight-invoice-unique-hybrid',
  '05-trucking-invoice-ecmu5567458',
  '06-sea-freight-john',
];

async function main() {
  var failed = 0;
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var txt = fs.readFileSync(path.join(__dirname, '..', 'data', 'training', f + '.txt'), 'utf8');
    var full = await ai.auditDocument(txt, [], {});
    var pdfPath = path.join(__dirname, '..', 'data', 'training', 'reference', f + '.pdf');
    var pdfText = await pdf.extractTextFromFile(pdfPath, 'application/pdf');
    var pdfAudit = await ai.auditDocument(pdfText || '', [], { filePath: pdfPath });
    var tampered = txt
      .replace(/TIN[^\n]*/gi, '')
      .replace(/CONTAINER[^\n]*/gi, '')
      .replace(/DXB\d+/gi, '')
      .replace(/BILL OF LADING[^\n]*/gi, '')
      .replace(/BL NUMBER[^\n]*/gi, '');
    var tam = await ai.auditDocument(tampered, [], {});

    console.log(f);
    console.log('  full txt', full.compliance_score, full.overall_audit_score, full.document_type);
    console.log('  full pdf', pdfAudit.compliance_score, pdfAudit.overall_audit_score);
    console.log('  tampered', tam.compliance_score, tam.overall_audit_score, tam.missing_fields);

    if (full.compliance_score < 88) {
      console.error('  FAIL: full txt should be >= 88%, got ' + full.compliance_score);
      failed++;
    }
    if (pdfAudit.compliance_score < 88) {
      console.error('  FAIL: full pdf should be >= 88%, got ' + pdfAudit.compliance_score);
      failed++;
    }
    if (tam.compliance_score >= full.compliance_score) {
      console.error('  FAIL: tampered should score lower than full');
      failed++;
    }
    if (tam.compliance_score > 82) {
      console.error('  FAIL: tampered should be <= 82%, got ' + tam.compliance_score);
      failed++;
    }
  }
  if (failed) {
    console.error('\n' + failed + ' check(s) failed');
    process.exit(1);
  }
  console.log('\nOK — complete docs score high, tampered docs score lower');
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
