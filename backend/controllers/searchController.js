/**
 * Search Controller
 * Handles document search functionality with database
 */

const searchDocuments = async (req, res) => {
  try {
    const { query, filters, limit = 20, page = 1 } = req.body;
    const { Document, AuditLog } = req.app.locals.models;

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const where = {
      [require('sequelize').Op.or]: [
        { title: { [require('sequelize').Op.iLike]: `%${query}%` } },
        { fileName: { [require('sequelize').Op.iLike]: `%${query}%` } },
        { tags: { [require('sequelize').Op.contains]: [query] } },
        { extractedText: { [require('sequelize').Op.iLike]: `%${query}%` } }
      ]
    };

    // Apply filters
    if (filters) {
      if (filters.classificationLevel) {
        where.classificationLevel = filters.classificationLevel;
      }
      if (filters.fileFormat) {
        where.fileFormat = filters.fileFormat;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          where.createdAt[require('sequelize').Op.gte] = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          where.createdAt[require('sequelize').Op.lte] = new Date(filters.dateTo);
        }
      }
    }

    const { count, rows } = await Document.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    // Track search in audit log
    await AuditLog.create({
      userId: req.user?.id || 'system',
      action: 'SEARCH',
      description: `Searched documents with query: "${query}"`,
      resourceType: 'Document',
      status: 'success'
    });

    res.json({
      results: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      query
    });
  } catch (error) {
    console.error('Search documents error:', error);
    res.status(500).json({ error: error.message || 'Search failed' });
  }
};

const saveSearch = async (req, res) => {
  try {
    const { name, query, filters } = req.body;
    const { Search } = req.app.locals.models;

    if (!name || !query) {
      return res.status(400).json({ error: 'Name and query are required' });
    }

    const search = await Search.create({
      searchName: name,
      query,
      keywords: query.split(/\s+/).filter(Boolean),
      filters: filters || {},
      userId: req.user?.id || 'system',
      isSaved: true,
      isPublic: req.body.isPublic || false
    });

    res.status(201).json({
      message: 'Search saved successfully',
      search
    });
  } catch (error) {
    console.error('Save search error:', error);
    res.status(500).json({ error: error.message || 'Failed to save search' });
  }
};

const getSavedSearches = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const { Search } = req.app.locals.models;
    const userId = req.user?.id || 'system';

    const { count, rows } = await Search.findAndCountAll({
      where: {
        [require('sequelize').Op.or]: [
          { userId },
          { isPublic: true }
        ]
      },
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      searches: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get saved searches error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch searches' });
  }
};

const getSearchHistory = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const { AuditLog } = req.app.locals.models;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const history = await AuditLog.findAll({
      where: {
        userId,
        action: 'SEARCH'
      },
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      history: history.map(item => ({
        query: item.description?.split('"')[1],
        timestamp: item.createdAt
      }))
    });
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch history' });
  }
};

const advancedSearch = async (req, res) => {
  try {
    const { criteria, limit = 20, page = 1 } = req.body;
    const { Document } = req.app.locals.models;
    const Op = require('sequelize').Op;

    const where = {};

    // Build complex query conditions
    if (criteria.title) {
      where.title = { [Op.iLike]: `%${criteria.title}%` };
    }
    if (criteria.classification) {
      where.classificationLevel = criteria.classification;
    }
    if (criteria.uploadedByRange) {
      where.createdAt = {
        [Op.gte]: new Date(criteria.uploadedByRange.from),
        [Op.lte]: new Date(criteria.uploadedByRange.to)
      };
    }
    if (criteria.fileFormat) {
      where.fileFormat = Array.isArray(criteria.fileFormat) 
        ? { [Op.in]: criteria.fileFormat }
        : criteria.fileFormat;
    }
    if (criteria.tags && criteria.tags.length > 0) {
      where.tags = { [Op.overlap]: criteria.tags };
    }

    const { count, rows } = await Document.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      results: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ error: error.message || 'Advanced search failed' });
  }
};

module.exports = {
  searchDocuments,
  advancedSearch,
  saveSearch,
  getSavedSearches,
  getSearchHistory
};
