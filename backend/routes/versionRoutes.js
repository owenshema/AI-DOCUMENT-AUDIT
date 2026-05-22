/**
 * Version Control Routes - Module 9
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const versionController = require('../controllers/versionController');

router.get('/', versionController.getVersions);
router.post('/', versionController.createVersion);
router.get('/compare', versionController.compareVersions);
router.get('/:versionId', versionController.getVersionById);
router.post('/:versionId/restore', versionController.restoreVersion);

module.exports = router;
