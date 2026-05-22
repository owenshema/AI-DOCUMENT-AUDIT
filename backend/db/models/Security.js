const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const Security = sequelize.define('Security', {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'documents', key: 'id' },
      onDelete: 'CASCADE'
    },
    classificationLevel: {
      type: DataTypes.STRING(100),
      defaultValue: 'internal'
    },
    accessControl: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'User and role-based access permissions'
    },
    encryptionStatus: {
      type: DataTypes.STRING(100),
      defaultValue: 'unencrypted'
    },
    encryptionAlgorithm: {
      type: DataTypes.STRING(50),
      comment: 'e.g., AES-256, RSA-2048'
    },
    encryptionKeyId: {
      type: DataTypes.STRING(255),
      comment: 'Reference to encryption key'
    },
    encryptedAt: {
      type: DataTypes.DATE
    },
    encryptedBy: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    },
    redactionRules: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Patterns and rules for automatic redaction'
    },
    hasRedactions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    redactedFields: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    redactionAppliedAt: {
      type: DataTypes.DATE
    },
    redactionAppliedBy: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    },
    watermarkRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    watermarkText: {
      type: DataTypes.STRING(255)
    },
    digitalSignature: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    signatureDetails: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Signature certificate, timestamp, etc'
    },
    downloadAllowed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    printAllowed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    copyAllowed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    externalSharingAllowed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    expirationDate: {
      type: DataTypes.DATE,
      comment: 'Document access expiration date'
    },
    passwordProtected: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    accessLog: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Log of access events'
    },
    securityIncidents: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of security incidents or violations'
    },
    riskAssessment: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Security risk assessment'
    },
    lastSecurityReviewAt: {
      type: DataTypes.DATE
    },
    lastSecurityReviewBy: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
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
    tableName: 'security_controls',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['document_id'] },
      { fields: ['classification_level'] },
      { fields: ['encryption_status'] }
    ]
  });

  return Security;
};
