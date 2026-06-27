/**
 * Dashboard Controller
 * Handles dashboard data and summaries with real database
 */

const { documentWhereForUser, isOwnerRole } = require('../utils/ownerScope');
const { normalizeRole } = require('../utils/roles');
const {
  countAuditedDocuments,
  countPendingAuditDocuments,
  countAuditorCompletedAudits,
  documentHasAuditorReview,
  documentNeedsAudit,
} = require('../utils/documentAudit');

async function buildRoleAuditMetrics(models, userId, role) {
  const { Document, DocumentAnalysis } = models;
  const roleNorm = normalizeRole(role);
  const docWhere = documentWhereForUser({ id: userId, role });

  if (roleNorm === 'client') {
    const completed = await countAuditedDocuments(Document, docWhere);
    const pending = await countPendingAuditDocuments(Document, docWhere);
    return { completed, pending, scope: 'personal' };
  }

  if (roleNorm === 'auditor') {
    const completed = await countAuditorCompletedAudits(DocumentAnalysis, userId);
    const pending = await countPendingAuditDocuments(Document, {});
    return { completed, pending, scope: 'organization' };
  }

  if (roleNorm === 'administrator' || roleNorm === 'document_manager') {
    const completed = await countAuditedDocuments(Document, {});
    const pending = await countPendingAuditDocuments(Document, {});
    return { completed, pending, scope: 'organization' };
  }

  return { completed: 0, pending: 0, scope: 'organization' };
}

async function scopedAnalysisWhere(models, userId, role) {
  const { Document } = models;
  const roleNorm = normalizeRole(role);
  if (roleNorm !== 'client') {
    return { status: 'completed' };
  }

  const ownedDocs = await Document.findAll({
    where: documentWhereForUser({ id: userId, role }),
    attributes: ['id'],
  });
  const docIds = ownedDocs.map(d => d.id);
  return {
    status: 'completed',
    documentId: docIds.length ? docIds : { [require('sequelize').Op.in]: [] },
  };
}

const getDashboard = async (req, res) => {
  try {
    const { Document, ComplianceCheck, AuditLog } = req.app.locals.models;
    const userId = req.user?.id || 'system';
    const role = req.user?.role || 'client';
    const Op = require('sequelize').Op;

    const docWhere = documentWhereForUser({ id: userId, role });
    const logWhere = {};
    const checkWhere = {};
    const roleNorm = normalizeRole(role);

    if (roleNorm === 'client') {
      logWhere.userId = userId;
      const allowedDocs = await Document.findAll({ where: docWhere, attributes: ['id'] });
      const allowedDocIds = allowedDocs.map(d => d.id);
      if (allowedDocIds.length) {
        checkWhere.documentId = allowedDocIds;
      } else {
        checkWhere.documentId = { [Op.in]: [] };
      }
    }

    const totalDocuments = await Document.count({ where: docWhere });
    const auditMetrics = await buildRoleAuditMetrics(req.app.locals.models, userId, role);

    const recentLogs = await AuditLog.findAll({
      where: roleNorm === 'client' ? logWhere : {},
      limit: 10,
      order: [['createdAt', 'DESC']],
    });

    let avgComplianceScore = 0;
    try {
      const complianceChecks = await ComplianceCheck.findAll({
        where: checkWhere,
        attributes: [
          [require('sequelize').fn('AVG', require('sequelize').col('compliance_score')), 'avgScore'],
        ],
      });
      avgComplianceScore = Math.round(complianceChecks[0]?.dataValues?.avgScore || 0);
    } catch (error) {
      console.error('Error calculating compliance score:', error);
    }

    const dashboard = {
      scope: auditMetrics.scope,
      summary: {
        totalDocuments,
        pendingTasks: auditMetrics.pending,
        completedTasks: auditMetrics.completed,
        overdueTasks: 0,
        complianceScore: avgComplianceScore,
        recentActivityCount: recentLogs.length,
      },
      recentActivities: recentLogs.map(log => ({
        action: log.action,
        userId: log.userId,
        timestamp: log.createdAt,
        description: log.description,
      })),
      metrics: {
        taskCompletionRate: auditMetrics.completed + auditMetrics.pending > 0
          ? Math.round((auditMetrics.completed / (auditMetrics.completed + auditMetrics.pending)) * 100)
          : 0,
        complianceScore: avgComplianceScore,
      },
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard' });
  }
};

const getDashboardMetrics = async (req, res) => {
  try {
    const { ComplianceCheck, Document, DocumentAnalysis } = req.app.locals.models;
    const userId = req.user?.id || 'system';
    const role = req.user?.role || 'client';
    const Op = require('sequelize').Op;

    const docWhere = documentWhereForUser({ id: userId, role });
    const roleNorm = normalizeRole(role);
    const checkWhere = {};
    const analysisWhere = await scopedAnalysisWhere(req.app.locals.models, userId, role);

    if (roleNorm === 'client') {
      const allowedDocs = await Document.findAll({ where: docWhere, attributes: ['id'] });
      const allowedDocIds = allowedDocs.map(d => d.id);
      checkWhere.documentId = allowedDocIds.length ? allowedDocIds : { [Op.in]: [] };
    }

    const totalComplianceChecks = await ComplianceCheck.count({ where: checkWhere });
    const passedChecks = await ComplianceCheck.count({ where: { ...checkWhere, status: 'passed' } });
    const failedChecks = await ComplianceCheck.count({ where: { ...checkWhere, status: 'failed' } });
    const pendingChecks = await ComplianceCheck.count({ where: { ...checkWhere, status: 'pending' } });

    let passRate = totalComplianceChecks > 0
      ? Math.round((passedChecks / totalComplianceChecks) * 100)
      : 0;

    if (totalComplianceChecks === 0) {
      const analyses = await DocumentAnalysis.findAll({
        where: analysisWhere,
        attributes: ['results', 'riskFactors'],
      });
      if (analyses.length > 0) {
        const passedAnalyses = analyses.filter(a => {
          const score = a.results?.compliance_score;
          if (score != null) return score >= 70;
          const risk = a.riskFactors?.level || a.results?.risk_level;
          return risk === 'low';
        }).length;
        passRate = Math.round((passedAnalyses / analyses.length) * 100);
      }
    }

    const totalDocuments = await Document.count({ where: docWhere });
    const uploadedToday = await Document.count({
      where: {
        ...docWhere,
        createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    });

    const statusRows = await Document.findAll({
      where: docWhere,
      attributes: ['status', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
      group: ['status'],
      raw: true,
    });
    const statusBreakdown = {};
    statusRows.forEach((row) => {
      statusBreakdown[row.status] = parseInt(row.count, 10) || 0;
    });

    const auditMetrics = await buildRoleAuditMetrics(req.app.locals.models, userId, role);
    const completedTasks = auditMetrics.completed;
    const pendingTasks = auditMetrics.pending;
    const effectiveTotalTasks = completedTasks + pendingTasks;

    const completedAnalyses = await DocumentAnalysis.count({ where: analysisWhere });
    const { averageOverallScore } = require('../services/auditScoreService');
    const analysisRows = await DocumentAnalysis.findAll({
      where: analysisWhere,
      attributes: ['results', 'riskFactors'],
    });

    const metrics = {
      scope: auditMetrics.scope,
      role: roleNorm,
      complianceMetrics: {
        totalChecks: totalComplianceChecks,
        passed: passedChecks,
        failed: failedChecks,
        pending: pendingChecks,
        passRate,
      },
      documentMetrics: {
        total: totalDocuments,
        uploadedToday,
        statusBreakdown,
        audited: completedTasks,
        needsAudit: pendingTasks,
      },
      taskMetrics: {
        total: effectiveTotalTasks,
        pending: pendingTasks,
        completed: completedTasks,
        completionRate: effectiveTotalTasks > 0
          ? Math.round((completedTasks / effectiveTotalTasks) * 100)
          : 0,
      },
      aiMetrics: {
        totalAnalyzed: completedAnalyses,
        averageOverallAuditScore: averageOverallScore(analysisRows),
        riskDistribution: {
          high: analysisRows.filter(a => (a.riskFactors?.level || a.results?.risk_level) === 'high').length,
          medium: analysisRows.filter(a => (a.riskFactors?.level || a.results?.risk_level) === 'medium').length,
          low: analysisRows.filter(a => (a.riskFactors?.level || a.results?.risk_level || 'low') === 'low').length,
        },
      },
    };

    res.json(metrics);
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch metrics' });
  }
};

const getAuditTrend = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const { AuditLog } = req.app.locals.models;
    const where = {
      createdAt: {
        [require('sequelize').Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
    };
    if (!['administrator', 'auditor', 'document_manager'].includes(normalizeRole(req.user?.role))) {
      where.userId = req.user?.id;
    }

    const logs = await AuditLog.findAll({
      where,
      order: [['createdAt', 'ASC']],
    });

    const trendData = {};
    logs.forEach(log => {
      const date = log.createdAt.toISOString().split('T')[0];
      if (!trendData[date]) {
        trendData[date] = { audits: 0, success: 0, failed: 0 };
      }
      trendData[date].audits++;
      if (log.status === 'success') trendData[date].success++;
      else trendData[date].failed++;
    });

    res.json({
      data: Object.entries(trendData).map(([date, stats]) => ({ date, ...stats })),
      period: `${days} days`,
      totalAudits: logs.length,
    });
  } catch (error) {
    console.error('Get audit trend error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch trend' });
  }
};

const getComplianceOverview = async (req, res) => {
  try {
    const { ComplianceCheck, Document } = req.app.locals.models;
    const options = {};
    if (normalizeRole(req.user?.role) === 'client') {
      options.include = [{
        model: Document,
        attributes: [],
        required: true,
        where: { uploadedBy: req.user.id },
      }];
    }

    const allChecks = await ComplianceCheck.findAll(options);
    const passedCount = allChecks.filter(c => c.status === 'passed').length;
    const failedCount = allChecks.filter(c => c.status === 'failed').length;
    const warningCount = allChecks.filter(c => c.status === 'warning').length;

    res.json({
      overallScore: allChecks.length > 0
        ? Math.round(allChecks.reduce((sum, c) => sum + (c.complianceScore || 0), 0) / allChecks.length)
        : 0,
      statusDistribution: {
        passed: passedCount,
        failed: failedCount,
        warning: warningCount,
      },
      totalChecksPerformed: allChecks.length,
    });
  } catch (error) {
    console.error('Get compliance overview error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch overview' });
  }
};

const getSystemHealth = (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date(),
    version: '0.2.0',
  });
};

const getNotifications = async (req, res) => {
  try {
    const { unreadOnly = false, limit = 20, page = 1 } = req.query;
    const { Notification } = req.app.locals.models;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const where = { recipientId: userId };
    if (unreadOnly === 'true') {
      where.status = 'unread';
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      notifications: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
  }
};

module.exports = {
  getDashboard,
  getDashboardMetrics,
  getAuditTrend,
  getComplianceOverview,
  getSystemHealth,
  getNotifications,
  documentHasAuditorReview,
  documentNeedsAudit,
};
