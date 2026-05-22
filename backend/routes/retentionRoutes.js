/**
 * Retention & Archival Routes
 */

const express = require('express');
const router = express.Router();
const retentionController = require('../controllers/retentionController');

router.post('/policies', retentionController.createRetentionPolicy);
router.get('/policies', retentionController.getRetentionPolicies);
router.post('/archive', retentionController.archiveDocument);
router.get('/archived', retentionController.getArchivedDocuments);
router.post('/restore/:documentId', retentionController.restoreArchivedDocument);
router.post('/access/request', retentionController.requestArchiveAccess);
router.post('/legal-hold', retentionController.setLegalHold);
router.get('/expiring', retentionController.getExpiringDocuments);

module.exports = router;
