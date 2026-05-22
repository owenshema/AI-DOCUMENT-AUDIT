'use strict';
/**
 * Audit Log Controller — Real database queries
 */
const { Op } = require('sequelize');

// ── GET /api/audit-logs ───────────────────────────────────────────────────────
const getAuditLogs = async (req, res) => {
  try {
    const { userId, action, resourceType, startDate, endDate, limit = 50, page = 1 } = req.query;
    const { AuditLog, User } = req.app.locals.models;

    const where = {};
    if (userId)       where.userId       = userId;
    if (action)       where.action       = { [Op.iLike]: `%${action}%` };
    if (resourceType) where.resourceType = resourceType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate)   { const e = new Date(endDate); e.setHours(23,59,59,999); where.createdAt[Op.lte] = e; }
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit:  Math.min(parseInt(limit), 200),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order:  [['createdAt', 'DESC']],
    });

    // Enrich with user info
    const userIds = [...new Set(rows.map(r => r.userId).filter(Boolean))];
    const users = userIds.length > 0
      ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'fullName', 'email', 'role'] })
      : [];
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    const logs = rows.map(r => ({
      id:           r.id,
      userId:       r.userId,
      userName:     r.userId && userMap[r.userId]
        ? userMap[r.userId].fullName || userMap[r.userId].email
        : 'System',
      userEmail:    userMap[r.userId]?.email || null,
      userRole:     r.userRole || userMap[r.userId]?.role || null,
      action:       r.action,
      resourceType: r.resourceType,
      resourceId:   r.resourceId,
      status:       r.status,
      description:  r.description,
      details:      r.details,
      ipAddress:    r.ipAddress,
      createdAt:    r.createdAt,
    }));

    res.json({ logs, total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) });
  } catch (err) {
    console.error('getAuditLogs error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
  }
};

// ── GET /api/audit-logs/activity — daily activity summary ────────────────────
const getDailyActivity = async (req, res) => {
  try {
    const { date, days = 7 } = req.query;
    const { AuditLog, User, Document, DocumentAnalysis, AuditReport } = req.app.locals.models;

    const since = date ? new Date(date) : new Date(Date.now() - parseInt(days) * 86400000);
    since.setHours(0, 0, 0, 0);
    const until = new Date(); until.setHours(23, 59, 59, 999);

    // All logs in range
    const logs = await AuditLog.findAll({
      where: { createdAt: { [Op.between]: [since, until] } },
      order: [['createdAt', 'DESC']],
    });

    // Documents uploaded in range
    const docs = await Document.findAll({
      where: { createdAt: { [Op.between]: [since, until] } },
      attributes: ['id', 'title', 'category', 'uploadedBy', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    // Analyses in range
    const analyses = await DocumentAnalysis.findAll({
      where: { completedAt: { [Op.between]: [since, until] } },
      attributes: ['id', 'documentId', 'performedBy', 'completedAt', 'riskFactors', 'results'],
      order: [['completedAt', 'DESC']],
    });

    // Reports generated in range
    const reports = await AuditReport.findAll({
      where: { createdAt: { [Op.between]: [since, until] } },
      attributes: ['id', 'title', 'reportType', 'createdBy', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    // Enrich with user names
    const allUserIds = [...new Set([
      ...logs.map(l => l.userId),
      ...docs.map(d => d.uploadedBy),
      ...analyses.map(a => a.performedBy),
      ...reports.map(r => r.createdBy),
    ].filter(Boolean))];

    const users = allUserIds.length > 0
      ? await User.findAll({ where: { id: allUserIds }, attributes: ['id', 'fullName', 'email', 'role'] })
      : [];
    const userMap = {};
    users.forEach(u => { userMap[u.id] = { name: u.fullName || u.email, email: u.email, role: u.role }; });

    const getName = id => id && userMap[id] ? userMap[id].name : 'System';

    // Build timeline
    const timeline = [
      ...docs.map(d => ({ type: 'upload', time: d.createdAt, user: getName(d.uploadedBy), detail: `Uploaded "${d.title}" (${d.category})`, icon: 'upload' })),
      ...analyses.map(a => ({ type: 'analysis', time: a.completedAt, user: getName(a.performedBy), detail: `AI audit run — risk: ${a.riskFactors?.level || a.results?.risk_level || 'low'}, score: ${a.results?.compliance_score ?? '—'}/100`, icon: 'bot' })),
      ...reports.map(r => ({ type: 'report', time: r.createdAt, user: getName(r.createdBy), detail: `Generated "${r.title}" (${(r.reportType || '').replace(/_/g, ' ')})`, icon: 'report' })),
      ...logs.filter(l => ['login', 'logout', 'delete_document', 'post_documents'].includes(l.action)).map(l => ({
        type: l.action, time: l.createdAt,
        user: getName(l.userId),
        detail: l.description || l.action.replace(/_/g, ' '),
        icon: l.action.includes('login') ? 'login' : l.action.includes('delete') ? 'delete' : 'action',
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 100);

    // Daily breakdown
    const byDay = {};
    timeline.forEach(item => {
      const day = new Date(item.time).toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { uploads: 0, analyses: 0, reports: 0, logins: 0 };
      if (item.type === 'upload')   byDay[day].uploads++;
      if (item.type === 'analysis') byDay[day].analyses++;
      if (item.type === 'report')   byDay[day].reports++;
      if (item.type === 'login')    byDay[day].logins++;
    });

    res.json({
      timeline,
      byDay,
      summary: {
        totalUploads:  docs.length,
        totalAnalyses: analyses.length,
        totalReports:  reports.length,
        totalActions:  logs.length,
        period:        { from: since.toISOString().split('T')[0], to: until.toISOString().split('T')[0] },
      },
    });
  } catch (err) {
    console.error('getDailyActivity error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch activity' });
  }
};

const getSecurityEvents = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const { AuditLog } = req.app.locals.models;
    const { count, rows } = await AuditLog.findAndCountAll({
      where: { action: { [Op.in]: ['login_failed', 'unauthorized_access', 'account_locked', 'password_reset'] } },
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    });
    res.json({ events: rows, total: count, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAnomalies = async (req, res) => {
  try {
    const { AuditLog } = req.app.locals.models;
    const rows = await AuditLog.findAll({
      where: { riskScore: { [Op.gte]: 50 } },
      order: [['createdAt', 'DESC']], limit: 20,
    });
    res.json({ anomalies: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const exportAuditLog = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { AuditLog } = req.app.locals.models;
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate)   { const e = new Date(endDate); e.setHours(23,59,59,999); where.createdAt[Op.lte] = e; }
    }
    const rows = await AuditLog.findAll({ where, order: [['createdAt', 'DESC']], limit: 1000 });
    const csv = ['id,userId,userRole,action,resourceType,status,description,ipAddress,createdAt',
      ...rows.map(r => `${r.id},${r.userId||''},${r.userRole||''},${r.action},${r.resourceType||''},${r.status||''},${(r.description||'').replace(/,/g,'')},${r.ipAddress||''},${r.createdAt}`)
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_log.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Keep legacy stubs for unused routes
const getUserActivityLog = (req, res) => res.json({ activityLog: [], total: 0 });
const getAccessLogs      = (req, res) => res.json({ accessLogs: [], total: 0 });
const getComplianceLog   = (req, res) => res.json({ complianceLogs: [], total: 0 });

module.exports = { getAuditLogs, getDailyActivity, getUserActivityLog, getAccessLogs, getSecurityEvents, getComplianceLog, exportAuditLog, getAnomalies };
