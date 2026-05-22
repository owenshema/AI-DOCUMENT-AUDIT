/**
 * Analysis Routes — Lightweight AI (OpenAI + rule-based fallback)
 */

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/analysisController');

// Raw text analysis (no document upload needed — paste text directly)
router.post('/text',  ctrl.analyzeText);
router.post('/parse', ctrl.parseDocumentText);

// Document-based analysis
router.post('/:documentId/analyze',   ctrl.analyzeDocument);
router.get('/:documentId/insights',   ctrl.getDocumentInsights);
router.get('/:documentId/status',     ctrl.getAnalysisStatus);

// Bulk & stats
router.post('/bulk/analyze',   ctrl.bulkAnalyze);
router.get('/trend/history',   ctrl.getAnalysisTrend);
router.get('/stats/overview',  ctrl.getAnalysisStats);

module.exports = router;
