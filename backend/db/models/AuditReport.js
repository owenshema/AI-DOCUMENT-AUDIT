const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const AuditReport = sequelize.define('AuditReport', {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    reportType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.STRING(100),
      defaultValue: 'draft'
    },
    periodStart: {
      type: DataTypes.DATE,
      allowNull: false
    },
    periodEnd: {
      type: DataTypes.DATE,
      allowNull: false
    },
    scope: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Scope of the report (departments, document types, etc)'
    },
    findings: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of findings with severity'
    },
    summary: {
      type: DataTypes.TEXT
    },
    executiveSummary: {
      type: DataTypes.TEXT,
      field: 'executive_summary',
    },
    riskSummary: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Risk summary (critical, high, medium, low counts)'
    },
    recommendations: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    metrics: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Key metrics and statistics'
    },
    statistics: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Detailed statistics'
    },
    sampledDocuments: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of sampled document IDs for verification'
    },
    complianceScore: {
      type: DataTypes.DECIMAL(5, 2),
      comment: 'Overall compliance score 0-100'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    reviewedBy: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    },
    reviewedAt: {
      type: DataTypes.DATE
    },
    approvedBy: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    },
    approvedAt: {
      type: DataTypes.DATE
    },
    publishedAt: {
      type: DataTypes.DATE
    },
    externalReferences: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Links to audit logs, compliance checks, etc'
    },
    attachments: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of attachment objects with file references'
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
    tableName: 'audit_reports',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['report_type'] },
      { fields: ['status'] },
      { fields: ['created_by'] },
      { fields: ['period_start', 'period_end'] }
    ]
  });

  return AuditReport;
};
