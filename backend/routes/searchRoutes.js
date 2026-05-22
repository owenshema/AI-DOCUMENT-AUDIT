/**
 * Search Routes
 */

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Search documents
router.post('/documents', searchController.searchDocuments);

// Advanced search
router.post('/advanced', searchController.advancedSearch);

// Save search
router.post('/saved', searchController.saveSearch);

// Get saved searches
router.get('/saved', searchController.getSavedSearches);

// Get search history
router.get('/history', searchController.getSearchHistory);

module.exports = router;
