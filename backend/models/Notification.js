/**
 * Notification Model
 * System notifications and alerts
 */

const NotificationSchema = {
  id: { type: String, unique: true, required: true },
  recipientId: { type: String, required: true },
  notificationType: { 
    type: String, 
    enum: [
      'task_assigned', 'task_due', 'task_overdue',
      'document_uploaded', 'document_shared', 'document_expiring',
      'audit_completed', 'compliance_violation', 'policy_violation',
      'approval_needed', 'approval_completed',
      'system_alert', 'security_alert', 'anomaly_detected',
      'remediation_required', 'deadline_approaching',
      'workflow_advance', 'user_mention', 'comment_added'
    ],
    required: true 
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedResourceType: { type: String, enum: ['document', 'task', 'audit', 'policy', 'user', 'system'] },
  relatedResourceId: { type: String },
  actionUrl: { type: String },
  channels: [{ type: String, enum: ['in-app', 'email', 'sms', 'push'] }],
  status: { type: String, enum: ['unread', 'read', 'archived'], default: 'unread' },
  readAt: { type: Date },
  archivedAt: { type: Date },
  deliveryStatus: [{
    channel: { type: String },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    failureReason: { type: String }
  }],
  customData: { type: Object },
  createdAt: { type: Date, default: Date.now },
  expiryAt: { type: Date }
};

module.exports = NotificationSchema;
