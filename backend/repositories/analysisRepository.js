/**
 * Document Analysis Repository
 * Data access layer for DocumentAnalysis model
 */

const db = require('../db/models');
const { DocumentAnalysis } = db;
const { Op } = require('sequelize');

class AnalysisRepository {
  async create(analysisData) {
    return await DocumentAnalysis.create(analysisData);
  }

  async findById(analysisId) {
    return await DocumentAnalysis.findByPk(analysisId);
  }

  async getAnalysesByDocument(documentId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await DocumentAnalysis.findAndCountAll({
      where: { documentId },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, analyses: rows, page, limit };
  }

  async getLatestAnalysis(documentId) {
    return await DocumentAnalysis.findOne({
      where: { documentId },
      order: [['createdAt', 'DESC']]
    });
  }

  async getAnalysisStatus(documentId) {
    const latestAnalysis = await DocumentAnalysis.findOne({
      where: { documentId },
      order: [['createdAt', 'DESC']]
    });

    if (!latestAnalysis) {
      return { status: 'not_started' };
    }

    return {
      status: latestAnalysis.status,
      progress: latestAnalysis.progress,
      lastUpdated: latestAnalysis.updatedAt
    };
  }

  async getAnalysisStats(startDate, endDate) {
    const analyses = await DocumentAnalysis.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    if (analyses.length === 0) {
      return {
        totalAnalyses: 0,
        averageConfidence: 0,
        riskDistribution: {}
      };
    }

    const riskDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    let totalConfidence = 0;

    analyses.forEach(analysis => {
      totalConfidence += analysis.confidenceScore || 0;
      if (analysis.riskLevel) {
        riskDistribution[analysis.riskLevel]++;
      }
    });

    return {
      totalAnalyses: analyses.length,
      averageConfidence: totalConfidence / analyses.length,
      riskDistribution
    };
  }

  async getAnalysisTrend(startDate, endDate) {
    const analyses = await DocumentAnalysis.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['createdAt', 'ASC']]
    });

    const trend = {};

    analyses.forEach(analysis => {
      const date = analysis.createdAt.toISOString().split('T')[0];
      if (!trend[date]) {
        trend[date] = { count: 0, avgSentiment: 0, totalSentiment: 0 };
      }
      trend[date].count++;
      trend[date].totalSentiment += analysis.sentiment || 0;
      trend[date].avgSentiment = trend[date].totalSentiment / trend[date].count;
    });

    return trend;
  }

  async update(analysisId, updates) {
    const analysis = await DocumentAnalysis.findByPk(analysisId);
    if (!analysis) return null;
    return await analysis.update(updates);
  }

  async updateStatus(analysisId, status) {
    return await DocumentAnalysis.update(
      { status },
      { where: { id: analysisId } }
    );
  }

  async getByStatus(status, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await DocumentAnalysis.findAndCountAll({
      where: { status },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, analyses: rows, page, limit };
  }

  async getByRiskLevel(riskLevel, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await DocumentAnalysis.findAndCountAll({
      where: { riskLevel },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, analyses: rows, page, limit };
  }
}

module.exports = new AnalysisRepository();
