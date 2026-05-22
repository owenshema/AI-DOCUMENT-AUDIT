const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const DocumentAnalysis = sequelize.define('DocumentAnalysis', {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'documents', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    analysisType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'compliance_audit'
    },
    status: {
      type: DataTypes.STRING(100),
      defaultValue: 'pending'
    },
    confidence: {
      type: DataTypes.DECIMAL(3, 2),
      comment: 'Confidence score 0-1'
    },
    results: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    entities: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Extracted entities with positions'
    },
    keywords: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Extracted keywords with scores'
    },
    summary: {
      type: DataTypes.TEXT
    },
    riskFactors: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    recommendations: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    performedBy: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    },
    processingTime: {
      type: DataTypes.INTEGER,
      comment: 'Time in milliseconds'
    },
    model: {
      type: DataTypes.STRING(100),
      comment: 'AI model used for analysis'
    },
    modelVersion: {
      type: DataTypes.STRING(50)
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    completedAt: {
      type: DataTypes.DATE
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'document_analyses',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['document_id'] },
      { fields: ['analysis_type'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  });

  return DocumentAnalysis;
};
