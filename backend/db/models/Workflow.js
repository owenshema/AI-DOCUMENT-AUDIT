const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const Workflow = sequelize.define('Workflow', {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    workflowType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(100),
      defaultValue: 'draft'
    },
    version: {
      type: DataTypes.STRING(20),
      defaultValue: '1.0'
    },
    steps: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of workflow steps with conditions, approvers, etc'
    },
    department: {
      type: DataTypes.STRING(100)
    },
    applicableRoles: {
      type: DataTypes.ARRAY(DataTypes.STRING(100)),
      defaultValue: []
    },
    applicableDocumentTypes: {
      type: DataTypes.ARRAY(DataTypes.STRING(100)),
      defaultValue: []
    },
    escalationRules: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Rules for escalation if step not completed'
    },
    notificationRules: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Who gets notified at each step'
    },
    sla: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Service level agreements for each step'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    lastModifiedBy: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    },
    lastModifiedAt: {
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
    tableName: 'workflows',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['workflow_type'] },
      { fields: ['status'] },
      { fields: ['created_by'] }
    ]
  });

  return Workflow;
};
