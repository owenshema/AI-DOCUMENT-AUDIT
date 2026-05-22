/**
 * Dashboard Routes
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/', dashboardController.getDashboard);
router.get('/metrics', dashboardController.getDashboardMetrics);
router.get('/audit-trend', dashboardController.getAuditTrend);
router.get('/compliance-overview', dashboardController.getComplianceOverview);
router.get('/system-health', dashboardController.getSystemHealth);
router.get('/notifications', dashboardController.getNotifications);

module.exports = router;
