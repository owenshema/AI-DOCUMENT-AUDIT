/**
 * Policy Model - Sequelize ORM
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Policy = sequelize.define('Policy', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    policyType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    version: {
      type: DataTypes.STRING(20),
      defaultValue: '1.0'
    },
    status: {
      type: DataTypes.STRING(100),
      defaultValue: 'draft'
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    applicableRoles: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    rules: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true
    },
    regulatoryFrameworks: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Array of regulatory frameworks: GDPR, HIPAA, SOX, ISO27001, ISO9001, CCPA, LGPD, Other'
    },
    applicableDocumentTypes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    exceptionRules: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true
    },
    effectiveDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    owner: {
      type: DataTypes.UUID,
      allowNull: false
    },
    lastReviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastReviewedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    nextReviewDue: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'policies',
    timestamps: true
  });

  return Policy;
};
