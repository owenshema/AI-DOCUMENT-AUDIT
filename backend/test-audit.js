const r = require('./services/auditRules');
console.log('exports:', Object.keys(r));
const res = r.runAudit('Invoice #INV-001\nVendor: ABC Ltd\nApproved by: John Smith\nDepartment: Finance\nTotal: $5000\nDate: 2026-05-20');
console.log('score:', res.compliance_score, '| risk:', res.risk_level, '| engine:', res.engine);
console.log('OK - runAudit works');
