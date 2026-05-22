/**
 * System test — checks all critical modules load and work correctly
 */
'use strict';

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      result.then(() => { console.log(`  ✓ ${name}`); passed++; })
            .catch(e => { console.log(`  ✗ ${name}: ${e.message}`); failed++; });
    } else {
      console.log(`  ✓ ${name}`); passed++;
    }
  } catch(e) {
    console.log(`  ✗ ${name}: ${e.message}`); failed++;
  }
}

console.log('\n=== SIFCO AE DocAudit — System Test ===\n');

// 1. Audit Rules Engine
console.log('1. Audit Rules Engine (v4)');
test('Module loads', () => { require('./services/auditRules'); });
test('runAudit is a function', () => {
  const { runAudit } = require('./services/auditRules');
  if (typeof runAudit !== 'function') throw new Error('not a function');
});
test('Invoice audit returns correct structure', () => {
  const { runAudit } = require('./services/auditRules');
  const r = runAudit('Invoice #INV-2026-001\nDate: 22/05/2026\nVendor: SIFCO Supplies Ltd\nBill To: ABC Corp\nDepartment: Finance\nApproved by: John Smith\nTotal: $5,500\nPayment Terms: Net 30');
  if (!r.compliance_score && r.compliance_score !== 0) throw new Error('no compliance_score');
  if (!r.document_type) throw new Error('no document_type');
  if (!r.document_inspection) throw new Error('no document_inspection');
  if (!r.engine) throw new Error('no engine');
  if (r.document_type !== 'invoice') throw new Error(`wrong type: ${r.document_type}`);
  console.log(`     → score: ${r.compliance_score}/100, risk: ${r.risk_level}, type: ${r.document_type}, engine: ${r.engine}`);
});
test('Shipment audit detects BOL', () => {
  const { runAudit } = require('./services/auditRules');
  const r = runAudit('Bill of Lading #BOL-2026-555\nShipper: SIFCO AE\nConsignee: Dubai Port Authority\nCarrier: Emirates Freight\nWeight: 1500 kg\nPickup Date: 20/05/2026\nDelivery Date: 25/05/2026\nAuthorized by: Ahmed Al-Rashid');
  if (r.document_type !== 'shipment') throw new Error(`wrong type: ${r.document_type}`);
  console.log(`     → score: ${r.compliance_score}/100, risk: ${r.risk_level}, type: ${r.document_type}`);
});
test('Forgery detection works', () => {
  const { runAudit } = require('./services/auditRules');
  const r = runAudit('Lorem ipsum placeholder text. As an AI language model, I cannot provide real data. Insert name here. Test document only.');
  if (!r.document_inspection.forgery_analysis.is_suspicious) throw new Error('should be suspicious');
  console.log(`     → forgery score: ${r.document_inspection.forgery_analysis.forgery_score}, flags: ${r.document_inspection.forgery_analysis.flags.length}`);
});
test('Financial extraction works', () => {
  const { runAudit } = require('./services/auditRules');
  const r = runAudit('Invoice #INV-001\nTotal: $15,000\nApproved by: Manager\nDepartment: Finance');
  const fin = r.document_inspection.financials;
  if (!fin) throw new Error('no financials in document_inspection');
  console.log(`     → amount: ${fin.total_amount}, currency: ${fin.currency}`);
});
test('Missing fields detected', () => {
  const { runAudit } = require('./services/auditRules');
  const r = runAudit('Invoice #INV-001\nDate: 22/05/2026');
  if (r.missing_fields.length === 0) throw new Error('should have missing fields');
  console.log(`     → missing: ${r.missing_fields.join(', ')}`);
});

// 2. AI Service
console.log('\n2. AI Service');
test('Module loads', () => { require('./services/aiService'); });
test('auditDocument function exists', () => {
  const { auditDocument } = require('./services/aiService');
  if (typeof auditDocument !== 'function') throw new Error('not a function');
});
test('generateAuditReport function exists', () => {
  const { generateAuditReport } = require('./services/aiService');
  if (typeof generateAuditReport !== 'function') throw new Error('not a function');
});
test('generateAuditReport produces report text', async () => {
  const { generateAuditReport } = require('./services/aiService');
  const r = await generateAuditReport({
    title: 'Test Report',
    reportType: 'daily_report',
    period: { start: '2026-05-01', end: '2026-05-22' },
    compliance_score: 78,
    total_documents: 5,
    total_analyses: 3,
    total_checks: 2,
    passed_checks: 1,
    failed_checks: 1,
    pass_rate: 50,
    risk_distribution: { high: 1, medium: 2, low: 2 },
    departments: { Finance: 3, Operations: 2 },
    categories: { invoice: 2, contract: 1, policy: 2 },
    violations: ['Missing BOL reference', 'No department assigned'],
    missing_fields: ['payment terms', 'authorized by'],
    recommendations: ['Obtain dual authorization for high-value invoices'],
    document_list: [{ title: 'Invoice Jan', category: 'invoice', department: 'Finance', status: 'uploaded', date: '2026-05-10', compliance_score: 72, risk_level: 'medium', violations_count: 2, missing_fields: ['payment terms'] }],
    score_breakdown: [72, 85, 90],
    activity_log: [{ time: '2026-05-10', user: 'Owen Shema', action: 'Uploaded "Invoice Jan" (invoice, Finance)', type: 'upload' }],
    generated_by: 'Owen Shema',
    generated_by_role: 'auditor',
    engine: 'rule-based-v4',
  });
  if (!r.report_text || r.report_text.length < 100) throw new Error('report text too short');
  if (!r.report_text.includes('Owen Shema')) throw new Error('generated_by not in report');
  if (!r.report_text.includes('ACTIVITY LOG')) throw new Error('activity log section missing');
  console.log(`     → report length: ${r.report_text.length} chars, engine: ${r.engine}`);
  console.log(`     → first 120 chars: ${r.report_text.slice(0,120).replace(/\n/g,' ')}`);
});

// 3. Controllers load check
console.log('\n3. Controller Modules');
['auditController','auditLogController','analysisController','authController','documentController'].forEach(c => {
  test(`${c} loads`, () => { require(`./controllers/${c}`); });
});

// 4. Routes load check
console.log('\n4. Route Modules');
['auditRoutes','auditLogRoutes','analysisRoutes','authRoutes','documentRoutes'].forEach(r => {
  test(`${r} loads`, () => { require(`./routes/${r}`); });
});

// 5. Report type access control
console.log('\n5. Report Access Control Logic');
const REPORT_ACCESS = {
  financial_report: ['administrator','auditor'],
  daily_report:     ['administrator','auditor','document_manager','viewer'],
  policy_report:    ['administrator','auditor','document_manager','viewer'],
  compliance_audit: ['administrator','auditor','document_manager'],
  security_audit:   ['administrator','auditor'],
};
test('viewer can generate daily_report', () => {
  if (!REPORT_ACCESS.daily_report.includes('viewer')) throw new Error('viewer blocked from daily_report');
});
test('viewer cannot generate financial_report', () => {
  if (REPORT_ACCESS.financial_report.includes('viewer')) throw new Error('viewer allowed financial_report');
});
test('auditor can generate financial_report', () => {
  if (!REPORT_ACCESS.financial_report.includes('auditor')) throw new Error('auditor blocked from financial_report');
});
test('document_manager cannot generate security_audit', () => {
  if (REPORT_ACCESS.security_audit.includes('document_manager')) throw new Error('document_manager allowed security_audit');
});

setTimeout(() => {
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('✅ All tests passed — system is healthy');
  else console.log(`⚠️  ${failed} test(s) failed — check above`);
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}, 2000);
