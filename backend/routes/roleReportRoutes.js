'use strict';

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const roleReportController = require('../controllers/roleReportController');

router.use(verifyToken);
router.get('/catalog', roleReportController.listCatalog);
router.get('/:reportId', roleReportController.getRoleReport);

module.exports = router;
