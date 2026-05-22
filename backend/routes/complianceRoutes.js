/**
 * Compliance Routes
 */

const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceController');

router.get('/policies', complianceController.getAllPolicies);
router.post('/policies', complianceController.createPolicy);
router.put('/policies/:policyId', complianceController.updatePolicy);
router.post('/check', complianceController.checkDocumentCompliance);
router.get('/reports', complianceController.getComplianceReports);
router.get('/violations/:violationId', complianceController.getViolationDetails);
router.post('/exceptions/request', complianceController.requestException);
router.post('/check/bulk', complianceController.bulkComplianceCheck);

module.exports = router;
