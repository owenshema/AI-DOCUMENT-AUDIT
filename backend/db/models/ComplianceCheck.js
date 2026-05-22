/**
 * ComplianceCheck Model - Sequelize ORM
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ComplianceCheck = sequelize.define('ComplianceCheck', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    policyId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    checkType: {
      type: DataTypes.STRING(100),
      defaultValue: 'automatic'
    },
    status: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    complianceScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0, max: 100 }
    },
    findings: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true
    },
    violations: {
      type: DataTypes.JSONB,
      defaultValue: { critical: 0, high: 0, medium: 0, low: 0 }
    },
    exceptions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true
    },
    remediationActions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true
    },
    performedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    performedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextCheckDue: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'compliance_checks',
    timestamps: true
  });

  return ComplianceCheck;
};
