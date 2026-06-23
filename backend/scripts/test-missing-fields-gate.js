'use strict';
var fs = require('fs');
var path = require('path');
var org = require('../services/organizationTrainingService');

var base = fs.readFileSync(path.join(__dirname, '..', 'data', 'training', '02-shipping-agreement-john.txt'), 'utf8');

function audit(label, text) {
  var r = org.runPaperAudit(text, {});
  console.log('\n' + label);
  console.log('  organization_match:', r.organization_match);
  console.log('  compliance_score:', r.compliance_score);
  console.log('  missing_fields:', r.missing_fields);
  console.log('  violations:', (r.violations || []).slice(0, 4).map(function (v) { return v.summary; }));
  return r;
}

var full = audit('Full shipping agreement', base);
if (!full.organization_match) {
  console.error('FAIL: full reference should still pass');
  process.exit(1);
}
if (full.compliance_score < 90) {
  console.error('FAIL: full reference should score >= 90%, got ' + full.compliance_score);
  process.exit(1);
}

var stripped = base
  .replace(/TIN NUMBER: 121348946/gi, '')
  .replace(/BILL OF LOADING: DXB1022332/gi, '')
  .replace(/NAME OF VESSEL: CMA CGM SEMARANG/gi, '')
  .replace(/VOYAGE NUMBER: 02SOGS1MA/gi, '')
  .replace(/ETD:18\/03\/2026/gi, '');

var tampered = audit('Tampered — key fields removed', stripped);
if (!tampered.organization_match) {
  console.error('FAIL: tampered document should be recognized as valid SIFCO type');
  process.exit(1);
}
if (tampered.compliance_score > 78 || tampered.compliance_score < 70) {
  console.error('FAIL: expected compliance 70–78%, got ' + tampered.compliance_score);
  process.exit(1);
}
if (tampered.risk_level !== 'medium' && tampered.risk_level !== 'high') {
  console.error('FAIL: expected medium/high risk, got ' + tampered.risk_level);
  process.exit(1);
}
if (!tampered.missing_fields || !tampered.missing_fields.length) {
  console.error('FAIL: missing_fields should be populated');
  process.exit(1);
}

console.log('\nOK — valid SIFCO type with 70–78% score and missing fields shown');
process.exit(0);
