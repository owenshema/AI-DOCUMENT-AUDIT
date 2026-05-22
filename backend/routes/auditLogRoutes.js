/**
 * Audit Log Routes
 */

const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');

router.get('/', auditLogController.getAuditLogs);
router.get('/activity', auditLogController.getDailyActivity);
router.get('/user/:userId', auditLogController.getUserActivityLog);
router.get('/document/:documentId/access', auditLogController.getAccessLogs);
router.get('/security/events', auditLogController.getSecurityEvents);
router.get('/compliance', auditLogController.getComplianceLog);
router.get('/export', auditLogController.exportAuditLog);
router.get('/anomalies', auditLogController.getAnomalies);

module.exports = router;
