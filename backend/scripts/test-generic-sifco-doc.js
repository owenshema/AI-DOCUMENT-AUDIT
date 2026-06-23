'use strict';
var org = require('../services/organizationTrainingService');

var genericPl = [
  'PACKING LIST',
  'Consigne: ACME TRADING LTD Date: 20/05/2026',
  'TIN: 121348946',
  'KIGALI-RWANDA',
  'TOTAL',
  'S.NO UNIT QTY PACKAGES',
  '1 MOTOR PARTS PCS 10 10',
  '2 FILTERS PCS 5 5',
  'TOTAL 15',
  'METHOD OF LOADING: LCL',
  'WEIGHT: 800KGS',
  'CONTAINER NUMBER: MSKU1234567',
  'BILL OF LOADING: DXB1099887',
  'FINAL DESTINATION: KIGALI',
  'NAME OF VESSEL: MAERSK LINE',
  'VOYAGE NUMBER: V12345',
  'ETD: 25/05/2026',
  'SUPER INTERNATIONAL FREIGHT SERVICES LLC',
].join('\n');

var r = org.runPaperAudit(genericPl, {});
console.log('Generic packing list (new customer/shipment):');
console.log('  organization_match:', r.organization_match);
console.log('  trained_reference_match:', r.trained_reference_match);
console.log('  compliance_score:', r.compliance_score);
console.log('  document_type:', r.document_type);
console.log('  missing_fields:', r.missing_fields);

if (!r.trained_reference_match) {
  console.error('FAIL: new valid SIFCO packing list should pass validation');
  process.exit(1);
}
if (r.compliance_score < 70) {
  console.error('FAIL: expected compliance >= 70%, got ' + r.compliance_score);
  process.exit(1);
}
console.log('OK');
process.exit(0);
