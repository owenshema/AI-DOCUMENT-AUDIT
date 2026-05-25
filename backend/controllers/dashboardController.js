/**
 * Dashboard Controller
 * Handles dashboard data and summaries with real database
 */

const getDashboard = async (req, res) => {
  try {
    const { Document, Task, ComplianceCheck, AuditLog } = req.app.locals.models;
    const userId = req.user?.id || 'system';
    const role = req.user?.role || 'viewer';
    const Op = require('sequelize').Op;

    // Define role-based isolation filters
    const docWhere = {};
    const taskWhere = {};
    const logWhere = {};
    const checkWhere = {};

    if (role === 'viewer' || role === 'document_manager') {
      docWhere[Op.or] = [
        { uploadedBy: userId },
        req.app.locals.sequelize.literal(`"metadata"->>'sharing' LIKE '%${userId}%'`)
      ];
      logWhere.userId = userId;
    }

    if (role !== 'administrator') {
      taskWhere.assignedTo = userId;
    }

    if (role === 'viewer' || role === 'document_manager') {
      const allowedDocs = await Document.findAll({
        where: docWhere,
        attributes: ['id']
      });
      const allowedDocIds = allowedDocs.map(d => d.id);
      checkWhere.documentId = allowedDocIds;
    }

    // Fetch metrics
    const totalDocuments = await Document.count({ where: docWhere });
    const pendingTasks = await Task.count({ where: { ...taskWhere, status: 'pending' } });
    const completedTasks = await Task.count({ where: { ...taskWhere, status: 'completed' } });
    const overdueTasks = await Task.count({ 
      where: { 
        ...taskWhere,
        status: 'pending',
        dueDate: { [Op.lt]: new Date() }
      }
    });

    // Get recent audit logs
    const recentLogs = await AuditLog.findAll({
      where: logWhere,
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    // Calculate average compliance score - use proper column name (snake_case)
    let avgComplianceScore = 0;
    try {
      const complianceChecks = await ComplianceCheck.findAll({
        where: checkWhere,
        attributes: [
          [require('sequelize').fn('AVG', require('sequelize').col('compliance_score')), 'avgScore']
        ]
      });
      avgComplianceScore = Math.round(complianceChecks[0]?.dataValues?.avgScore || 0);
    } catch (error) {
      console.error('Error calculating compliance score:', error);
      avgComplianceScore = 0;
    }

    const dashboard = {
      summary: {
        totalDocuments,
        pendingTasks,
        completedTasks,
        overdueTasks,
        complianceScore: avgComplianceScore,
        recentActivityCount: recentLogs.length
      },
      recentActivities: recentLogs.map(log => ({
        action: log.action,
        userId: log.userId,
        timestamp: log.createdAt,
        description: log.description
      })),
      metrics: {
        taskCompletionRate: pendingTasks + completedTasks > 0 
          ? Math.round((completedTasks / (pendingTasks + completedTasks)) * 100)
          : 0,
        complianceScore: avgComplianceScore
      }
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard' });
  }
};

const getDashboardMetrics = async (req, res) => {
  try {
    const { ComplianceCheck, Document, Task, AuditReport } = req.app.locals.models;
    const userId = req.user?.id || 'system';
    const role = req.user?.role || 'viewer';
    const Op = require('sequelize').Op;

    // Define role-based isolation filters
    const docWhere = {};
    const taskWhere = {};
    const checkWhere = {};

    if (role === 'viewer' || role === 'document_manager') {
      docWhere[Op.or] = [
        { uploadedBy: userId },
        req.app.locals.sequelize.literal(`"metadata"->>'sharing' LIKE '%${userId}%'`)
      ];
    }

    if (role !== 'administrator') {
      taskWhere.assignedTo = userId;
    }

    if (role === 'viewer' || role === 'document_manager') {
      const allowedDocs = await Document.findAll({
        where: docWhere,
        attributes: ['id']
      });
      const allowedDocIds = allowedDocs.map(d => d.id);
      checkWhere.documentId = allowedDocIds;
    }

    // Audit metrics
    const totalComplianceChecks = await ComplianceCheck.count({ where: checkWhere });
    const passedChecks = await ComplianceCheck.count({ where: { ...checkWhere, status: 'passed' } });
    const failedChecks = await ComplianceCheck.count({ where: { ...checkWhere, status: 'failed' } });
    const pendingChecks = await ComplianceCheck.count({ where: { ...checkWhere, status: 'pending' } });

    // Document metrics
    const totalDocuments = await Document.count({ where: docWhere });
    const uploadedToday = await Document.count({
      where: {
        ...docWhere,
        createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    });

    // Task metrics
    const totalTasks = await Task.count({ where: taskWhere });
    const completedTasks = await Task.count({ where: { ...taskWhere, status: 'completed' } });
    const pendingTasks = await Task.count({ where: { ...taskWhere, status: 'pending' } });

    const metrics = {
      complianceMetrics: {
        totalChecks: totalComplianceChecks,
        passed: passedChecks,
        failed: failedChecks,
        pending: pendingChecks,
        passRate: totalComplianceChecks > 0 ? Math.round((passedChecks / totalComplianceChecks) * 100) : 0
      },
      documentMetrics: {
        total: totalDocuments,
        uploadedToday
      },
      taskMetrics: {
        total: totalTasks,
        pending: pendingTasks,
        completed: completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      }
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
        [require('sequelize').Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      }
    };
    if (!['administrator', 'auditor'].includes(req.user?.role)) {
      where.userId = req.user?.id;
    }

    // Get audit logs for the period
    const logs = await AuditLog.findAll({
      where,
      order: [['createdAt', 'ASC']]
    });

    // Group by date
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

    const data = Object.entries(trendData).map(([date, stats]) => ({
      date,
      ...stats
    }));

    res.json({
      data,
      period: `${days} days`,
      totalAudits: logs.length
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
    if (['viewer', 'document_manager'].includes(req.user?.role)) {
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

    const overview = {
      overallScore: allChecks.length > 0 
        ? Math.round(allChecks.reduce((sum, c) => sum + (c.complianceScore || 0), 0) / allChecks.length)
        : 0,
      statusDistribution: {
        passed: passedCount,
        failed: failedCount,
        warning: warningCount
      },
      totalChecksPerformed: allChecks.length
    };

    res.json(overview);
  } catch (error) {
    console.error('Get compliance overview error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch overview' });
  }
};

const getSystemHealth = (req, res) => {
  // Return basic system health (could connect to monitoring service)
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date(),
    version: '0.2.0'
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
      order: [['createdAt', 'DESC']]
    });

    res.json({
      notifications: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
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
  getNotifications
};
