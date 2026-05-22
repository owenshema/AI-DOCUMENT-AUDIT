const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const RetentionPolicy = sequelize.define('RetentionPolicy', {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    policyName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    policyType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    retentionPeriod: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Retention period in days'
    },
    retentionUnit: {
      type: DataTypes.STRING(100),
      defaultValue: 'years'
    },
    archivalAction: {
      type: DataTypes.STRING(100),
      defaultValue: 'archive'
    },
    archivalLocation: {
      type: DataTypes.STRING(255),
      comment: 'Location for archived documents'
    },
    applicableDocumentTypes: {
      type: DataTypes.ARRAY(DataTypes.STRING(100)),
      defaultValue: []
    },
    applicableDepartments: {
      type: DataTypes.ARRAY(DataTypes.STRING(100)),
      defaultValue: []
    },
    classificationLevels: {
      type: DataTypes.ARRAY(DataTypes.STRING(50)),
      defaultValue: []
    },
    regulatoryFrameworks: {
      type: DataTypes.ARRAY(DataTypes.STRING(50)),
      defaultValue: []
    },
    exceptions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Exceptions to retention policy'
    },
    status: {
      type: DataTypes.STRING(100),
      defaultValue: 'draft'
    },
    effectiveDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    expiryDate: {
      type: DataTypes.DATE
    },
    autoExecution: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    executedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastExecutedAt: {
      type: DataTypes.DATE
    },
    nextExecutionDue: {
      type: DataTypes.DATE
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    approvedBy: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    },
    approvedAt: {
      type: DataTypes.DATE
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'retention_policies',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['policy_type'] },
      { fields: ['status'] },
      { fields: ['created_by'] },
      { fields: ['effective_date'] }
    ]
  });

  return RetentionPolicy;
};
