/**
 * Audit Routes — with role-based access control
 * financial_report: admin, auditor only
 * daily_report:     all roles
 * compliance_audit: admin, auditor, document_manager
 * policy_report:    all roles
 */

const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

// Role check middleware
const requireRole = (...roles) => (req, res, next) => {
  const userRole = req.user?.role;
  if (!userRole || !roles.includes(userRole)) {
    return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
  }
  next();
};

const REPORT_ACCESS = {
  financial_report:  ['administrator', 'auditor'],
  compliance_audit:  ['administrator', 'auditor', 'document_manager'],
  security_audit:    ['administrator', 'auditor'],
  exception_report:  ['administrator', 'auditor'],
  document_review:   ['administrator', 'auditor', 'document_manager'],
  daily_report:      ['administrator', 'auditor', 'document_manager', 'viewer'],
  policy_report:     ['administrator', 'auditor', 'document_manager', 'viewer'],
};

// Dynamic access check based on reportType in body
const checkReportAccess = (req, res, next) => {
  const reportType = req.body?.reportType || 'daily_report';
  const allowed = REPORT_ACCESS[reportType] || REPORT_ACCESS.daily_report;
  const userRole = req.user?.role;
  if (!userRole || !allowed.includes(userRole)) {
    return res.status(403).json({
      error: `You do not have permission to generate a "${reportType.replace(/_/g, ' ')}". Required: ${allowed.join(', ')}.`
    });
  }
  next();
};

router.post('/reports', checkReportAccess, auditController.generateAuditReport);
router.get('/reports/:reportId', auditController.getAuditReport);
router.get('/reports', auditController.listAuditReports);
router.get('/reports/:reportId/export', auditController.exportAuditReport);
router.post('/reports/schedule', requireRole('administrator', 'auditor'), auditController.scheduleAuditReport);
router.post('/reports/:reportId/distribute', requireRole('administrator', 'auditor'), auditController.distributeAuditReport);
router.post('/reports/:reportId/archive', requireRole('administrator', 'auditor'), auditController.archiveAuditReport);

module.exports = router;
