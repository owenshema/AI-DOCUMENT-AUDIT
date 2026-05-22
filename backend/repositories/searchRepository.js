/**
 * Search Repository
 * Data access layer for Search model
 */

const db = require('../db/models');
const { Search, Document } = db;
const { Op } = require('sequelize');

class SearchRepository {
  async saveSearch(searchData) {
    return await Search.create(searchData);
  }

  async getSavedSearches(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Search.findAndCountAll({
      where: { userId },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, searches: rows, page, limit };
  }

  async getSavedSearchById(searchId) {
    return await Search.findByPk(searchId);
  }

  async updateSavedSearch(searchId, updates) {
    const search = await Search.findByPk(searchId);
    if (!search) return null;
    return await search.update(updates);
  }

  async deleteSavedSearch(searchId) {
    return await Search.destroy({ where: { id: searchId } });
  }

  async searchDocuments(query, filters = {}) {
    const where = {
      [Op.or]: [
        { title: { [Op.iLike]: `%${query}%` } },
        { fileName: { [Op.iLike]: `%${query}%` } },
        { extractedText: { [Op.iLike]: `%${query}%` } },
        { tags: { [Op.contains]: [query] } }
      ]
    };

    if (filters.classification) {
      where.classificationLevel = filters.classification;
    }
    if (filters.fileFormat) {
      where.fileFormat = filters.fileFormat;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.department) {
      where.department = filters.department;
    }

    const documents = await Document.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    return documents;
  }

  async advancedSearch(criteria) {
    const where = {};

    if (criteria.title) {
      where.title = { [Op.iLike]: `%${criteria.title}%` };
    }
    if (criteria.content) {
      where.extractedText = { [Op.iLike]: `%${criteria.content}%` };
    }
    if (criteria.classification) {
      where.classificationLevel = criteria.classification;
    }
    if (criteria.dateFrom && criteria.dateTo) {
      where.createdAt = {
        [Op.between]: [criteria.dateFrom, criteria.dateTo]
      };
    }
    if (criteria.department) {
      where.department = criteria.department;
    }
    if (criteria.tags && Array.isArray(criteria.tags)) {
      where.tags = { [Op.contains]: criteria.tags };
    }

    return await Document.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: criteria.limit || 50
    });
  }

  async getSearchHistory(userId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Search.findAndCountAll({
      where: { userId },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, history: rows, page, limit };
  }

  async getPopularSearches(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const searches = await Search.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      attributes: ['query', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
      group: ['query'],
      order: [[db.sequelize.literal('count'), 'DESC']],
      limit: 10,
      subQuery: false
    });

    return searches;
  }

  async getRecentSearches(userId, limit = 5) {
    return await Search.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }
}

module.exports = new SearchRepository();
