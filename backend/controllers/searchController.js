/**
 * Search Controller
 * Handles document search functionality with database
 */

const searchDocuments = async (req, res) => {
  try {
    const { query, filters = {}, limit = 20, page = 1 } = req.body;
    const { Document, AuditLog } = req.app.locals.models;
    const Op = require('sequelize').Op;
    const role = req.user?.role || 'viewer';
    const userId = req.user?.id;

    const term = (query || '').trim();
    if (!term && !filters.status && !filters.fileFormat && !filters.department && !filters.dateFrom && !filters.dateTo) {
      return res.status(400).json({ error: 'Enter a search term or apply at least one filter.' });
    }

    const where = {};

    if (term) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${term}%` } },
        { fileName: { [Op.iLike]: `%${term}%` } },
        { category: { [Op.iLike]: `%${term}%` } },
        { department: { [Op.iLike]: `%${term}%` } },
        { extractedText: { [Op.iLike]: `%${term}%` } },
      ];
    }

    if (filters.classificationLevel) where.classificationLevel = filters.classificationLevel;
    if (filters.fileFormat) where.fileFormat = filters.fileFormat.toLowerCase();
    if (filters.status) where.status = filters.status;
    if (filters.department) where.department = { [Op.iLike]: `%${filters.department}%` };
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt[Op.gte] = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = end;
      }
    }

    if (['viewer', 'document_manager'].includes(role) && userId) {
      where.uploadedBy = userId;
    }

    const { count, rows } = await Document.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: [['createdAt', 'DESC']],
    });

    if (term) {
      await AuditLog.create({
        userId: userId || 'system',
        action: 'SEARCH',
        description: `Searched documents with query: "${term}"`,
        resourceType: 'Document',
        status: 'success',
      });
    }

    res.json({
      results: rows.map(function (doc) {
        var meta = doc.metadata || {};
        return {
          id: doc.id,
          title: doc.title,
          fileName: doc.fileName,
          fileFormat: doc.fileFormat,
          category: doc.category,
          department: doc.department,
          status: doc.status,
          createdAt: doc.createdAt,
          complianceScore: meta.latestComplianceScore ?? null,
          overallAuditScore: meta.latestOverallAuditScore ?? null,
          auditStatus: meta.latestOverallAuditStatus ?? null,
        };
      }),
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      query: term,
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
    const { criteria = {}, limit = 20, page = 1 } = req.body;
    const { Document, AuditReport } = req.app.locals.models;
    const Op = require('sequelize').Op;
    const role = req.user?.role || 'viewer';
    const userId = req.user?.id;
    const searchReports = criteria.searchReports === true;

    if (searchReports) {
      const reportWhere = {};
      if (criteria.title) reportWhere.title = { [Op.iLike]: `%${criteria.title}%` };
      if (criteria.reportType) reportWhere.reportType = criteria.reportType;
      if (criteria.status) reportWhere.status = criteria.status;
      if (criteria.uploadedByRange) {
        reportWhere.createdAt = {
          [Op.gte]: new Date(criteria.uploadedByRange.from),
          [Op.lte]: new Date(criteria.uploadedByRange.to),
        };
      }
      if (['viewer', 'document_manager'].includes(role) && userId) {
        reportWhere.generatedBy = userId;
      }

      const { count, rows } = await AuditReport.findAndCountAll({
        where: reportWhere,
        limit: parseInt(limit, 10),
        offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        order: [['createdAt', 'DESC']],
      });

      return res.json({
        results: rows.map(function (r) {
          return {
            id: r.id,
            title: r.title,
            reportType: r.reportType,
            status: r.status,
            complianceScore: r.complianceScore,
            periodStart: r.periodStart,
            periodEnd: r.periodEnd,
            createdAt: r.createdAt,
            kind: 'report',
          };
        }),
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        kind: 'reports',
      });
    }

    const where = {};
    if (criteria.title) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${criteria.title}%` } },
        { fileName: { [Op.iLike]: `%${criteria.title}%` } },
        { extractedText: { [Op.iLike]: `%${criteria.title}%` } },
      ];
    }
    if (criteria.classification) where.classificationLevel = criteria.classification;
    if (criteria.department) where.department = { [Op.iLike]: `%${criteria.department}%` };
    if (criteria.status) where.status = criteria.status;
    if (criteria.uploadedByRange) {
      where.createdAt = {
        [Op.gte]: new Date(criteria.uploadedByRange.from),
        [Op.lte]: new Date(criteria.uploadedByRange.to),
      };
    }
    if (criteria.fileFormat) {
      where.fileFormat = Array.isArray(criteria.fileFormat)
        ? { [Op.in]: criteria.fileFormat.map(function (f) { return f.toLowerCase(); }) }
        : criteria.fileFormat.toLowerCase();
    }
    if (['viewer', 'document_manager'].includes(role) && userId) {
      where.uploadedBy = userId;
    }

    const { count, rows } = await Document.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      results: rows.map(function (doc) {
        var meta = doc.metadata || {};
        return {
          id: doc.id,
          title: doc.title,
          fileName: doc.fileName,
          fileFormat: doc.fileFormat,
          category: doc.category,
          department: doc.department,
          status: doc.status,
          createdAt: doc.createdAt,
          complianceScore: meta.latestComplianceScore ?? null,
          overallAuditScore: meta.latestOverallAuditScore ?? null,
          kind: 'document',
        };
      }),
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      kind: 'documents',
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
