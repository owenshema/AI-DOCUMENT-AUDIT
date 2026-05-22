/**
 * AuditLog Model - Sequelize ORM
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      index: true
    },
    userRole: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      index: true
    },
    resourceType: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    device: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    performanceMetrics: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    riskScore: {
      type: DataTypes.INTEGER,
      validate: { min: 0, max: 100 }
    },
    anomalies: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true
    },
    complianceRelevant: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    regulatoryFramework: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    retentionExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      index: true
    }
  }, {
    tableName: 'audit_logs',
    timestamps: false
  });

  return AuditLog;
};
