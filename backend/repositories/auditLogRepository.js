/**
 * Audit Log Repository
 * Data access layer for AuditLog model
 */

const db = require('../db/models');
const { AuditLog } = db;
const { Op } = require('sequelize');

class AuditLogRepository {
  async create(logData) {
    return await AuditLog.create(logData);
  }

  async findById(logId) {
    return await AuditLog.findByPk(logId);
  }

  async getAll(filters = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const where = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt[Op.gte] = filters.startDate;
      if (filters.endDate) where.createdAt[Op.lte] = filters.endDate;
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, logs: rows, page, limit };
  }

  async getUserActivity(userId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const { count, rows } = await AuditLog.findAndCountAll({
      where: { userId },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, activity: rows, page, limit };
  }

  async getAccessLogs(resourceId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const { count, rows } = await AuditLog.findAndCountAll({
      where: {
        resourceId,
        action: { [Op.in]: ['view', 'download', 'print'] }
      },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, accessLogs: rows, page, limit };
  }

  async getSecurityEvents(startDate, endDate, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const { count, rows } = await AuditLog.findAndCountAll({
      where: {
        action: { [Op.in]: ['unauthorized_access', 'failed_login', 'permission_denied'] },
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, events: rows, page, limit };
  }

  async getComplianceLog(startDate, endDate, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const { count, rows } = await AuditLog.findAndCountAll({
      where: {
        action: { [Op.in]: ['compliance_check', 'violation_detected', 'exception_requested'] },
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, logs: rows, page, limit };
  }

  async getActionHistory(resourceId, action) {
    return await AuditLog.findAll({
      where: {
        resourceId,
        action
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async getAuditsByDateRange(startDate, endDate, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const { count, rows } = await AuditLog.findAndCountAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, logs: rows, page, limit };
  }

  async detectAnomalies(userId, timeWindow = 3600000) {
    const cutoffTime = new Date(Date.now() - timeWindow);
    
    const recentActivity = await AuditLog.findAll({
      where: {
        userId,
        createdAt: { [Op.gte]: cutoffTime }
      }
    });

    // Simple anomaly detection: multiple failed logins
    const failedLogins = recentActivity.filter(log => log.action === 'failed_login');
    
    return {
      suspiciousActivity: failedLogins.length > 5,
      failedLoginAttempts: failedLogins.length,
      recentActivityCount: recentActivity.length
    };
  }

  async export(filters = {}) {
    const where = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt[Op.gte] = filters.startDate;
      if (filters.endDate) where.createdAt[Op.lte] = filters.endDate;
    }

    return await AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
  }
}

module.exports = new AuditLogRepository();
