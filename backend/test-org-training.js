'use strict';
const fs = require('fs');
const path = require('path');
const { runAudit } = require('./services/auditRules');
const { evaluateOrganizationDocument } = require('./services/organizationTrainingService');

const TRAINING_SAMPLES = [
  { name: 'packing_list', mustPass: true, text: `PACKING LIST
Consigne:UNIQUE HYBRID &EV SPARE PARTS 15/02/2026
KIGALI-RWANDA
CONTAINER NUMBER:TEMU6439085
BILL OF LOADING:DXB1020247
FINAL DESTINATION:KIGALI
NAME OF VESSEL:SEMARSNG
VOYAGE NUMBER:02SOGS1MA
METHOD OF LOADING:LCL
WEIGHT:1000KGS` },
  { name: 'shipping_agreement', mustPass: true, text: `SUPER INTERNATIONAL FREIGHT SERVICES LLC
TIN NUMBER: 121348946
RE: SHIPPING AGREEMENT BETWEEN SIFCO AND HATANGIMANA JOHN
SIFCO is a shipping company that operates in DUBAI, KIGALI
SEA FREIGHT (JEBEL ALI PORT TO MOMBASA PORT) 1500 1500
ROAD FREIGHT (MOMBASA TO KIGALI) 2960 2960
B/L FEE 75 75
LOCAL CHARGES 60 60
TOTAL 4595
SIFCO SIGNATURE CLIENT'S SIGNATURE` },
  { name: 'hbl', mustPass: true, text: `Bill of Lading No: DXB1020247
Shipper AL SHAMALI INTERNATIONAL FTREIGHT SERVICES LLC
Consignee UNIQUE HYBRID & EV SPARE PARTS KIGALI-RWANDA
SUPER INTERNATIONAL FREIGHT SERVICES COMPANY LTD TIN NO:121348946
Place of Receipt JEBEL ALI / UAE
Port of Discharge MOMBASA / KENYA
CONTAINER NO: TEMU6439085 SEAL: K1722114
SHIPPED ON BOARD
Vessel VOYAGE: CMA CGM SEMARANG/02SOGS1MA
For AL SHAMALI INTERNATIONAL FREIGHT SERVICES LLC
Authorised Signatory` },
  { name: 'foreign_doc', mustPass: false, text: `ACME CORPORATION INVOICE
123 Main Street New York
Invoice # ACME-99999
Total: $5000
Payment due upon receipt
Generic Logistics LLC` },
];

let passed = 0;
let failed = 0;

TRAINING_SAMPLES.forEach(function(sample) {
  const org = evaluateOrganizationDocument(sample.text);
  const audit = runAudit(sample.text);
  const ok = org.accepted === sample.mustPass && audit.organization_match === sample.mustPass;
  if (ok) {
    passed++;
    console.log('OK  ', sample.name, '- accepted:', org.accepted, 'category:', org.category);
  } else {
    failed++;
    console.log('FAIL', sample.name, '- expected accepted:', sample.mustPass, 'got:', org.accepted, org.message);
  }
});

console.log('\nResult:', passed, 'passed,', failed, 'failed');
process.exit(failed > 0 ? 1 : 0);
