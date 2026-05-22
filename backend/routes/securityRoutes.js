/**
 * Security Routes - Module 11
 */

const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { verifyRole } = require('../middleware/authMiddleware');

// Get security settings for a document
router.get('/documents/:documentId', securityController.getDocumentSecurity);

// Update classification level (admin/auditor only)
router.patch('/documents/:documentId/classification', verifyRole(['administrator', 'auditor']), securityController.updateClassification);

// Update access control matrix (admin only)
router.patch('/documents/:documentId/access-control', verifyRole(['administrator']), securityController.updateAccessControl);

// Configure watermark
router.patch('/documents/:documentId/watermark', verifyRole(['administrator', 'document_manager']), securityController.configureWatermark);

// Update download/print/copy permissions
router.patch('/documents/:documentId/permissions', verifyRole(['administrator']), securityController.updatePermissions);

// Set encryption
router.patch('/documents/:documentId/encryption', verifyRole(['administrator']), securityController.setEncryption);

// Get security audit trail for a document
router.get('/documents/:documentId/trail', securityController.getSecurityAuditTrail);

module.exports = router;
