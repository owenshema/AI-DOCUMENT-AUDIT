const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const DocumentVersion = sequelize.define('DocumentVersion', {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      columnName: 'document_id',
      references: { model: 'documents', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    versionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING(1024),
      allowNull: false
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    fileFormat: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    changedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    changeReason: {
      type: DataTypes.TEXT
    },
    changeType: {
      type: DataTypes.STRING(100),
      defaultValue: 'upload'
    },
    changeDetails: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    extractedText: {
      type: DataTypes.TEXT
    },
    ocrPerformed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    checksum: {
      type: DataTypes.STRING(255)
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'document_versions',
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ['document_id'] },
      { fields: ['version_number'] },
      { fields: ['changed_by'] }
    ]
  });

  return DocumentVersion;
};
