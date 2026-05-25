/**
 * Document Model - Sequelize ORM
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    fileFormat: {
      type: DataTypes.STRING(100),
      defaultValue: 'PDF',
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(100),
      defaultValue: 'draft'
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    project: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    classificationLevel: {
      type: DataTypes.STRING(100),
      defaultValue: 'internal'
    },
    retentionDays: {
      type: DataTypes.INTEGER,
      defaultValue: 365
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    uploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    lastModifiedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    lastModifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isDuplicate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    duplicateOf: {
      type: DataTypes.UUID,
      allowNull: true
    },
    ocrProcessed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    extractedText: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    archiveReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    legalHoldActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    legalHoldReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    legalHoldEndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'documents',
    paranoid: true
  });

  return Document;
};
