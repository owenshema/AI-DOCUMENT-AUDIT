const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    recipientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    notificationType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    channel: {
      type: DataTypes.STRING(100),
      defaultValue: 'in_app'
    },
    priority: {
      type: DataTypes.STRING(100),
      defaultValue: 'medium'
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    details: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    relatedEntityType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    relatedEntityId: {
      type: DataTypes.UUID
    },
    actionUrl: {
      type: DataTypes.STRING(1024),
      comment: 'URL to take action on the notification'
    },
    status: {
      type: DataTypes.STRING(100),
      defaultValue: 'unread'
    },
    readAt: {
      type: DataTypes.DATE
    },
    archivedAt: {
      type: DataTypes.DATE
    },
    sentAt: {
      type: DataTypes.DATE
    },
    deliveryStatus: {
      type: DataTypes.STRING(100),
      defaultValue: 'pending'
    },
    deliveryAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastDeliveryAttempt: {
      type: DataTypes.DATE
    },
    expiresAt: {
      type: DataTypes.DATE
    },
    attachments: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
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
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['recipient_id'] },
      { fields: ['status'] },
      { fields: ['notification_type'] },
      { fields: ['created_at'] },
      { fields: ['recipient_id', 'status'] }
    ]
  });

  return Notification;
};
