/**
 * AuditLog Model
 * Comprehensive audit trail and logging
 */

const AuditLogSchema = {
  id: { type: String, unique: true, required: true },
  userId: { type: String, required: true },
  userRole: { type: String },
  action: { 
    type: String, 
    enum: [
      'login', 'logout', 'register', 'password_change', 'password_reset',
      'document_upload', 'document_download', 'document_view', 'document_delete', 'document_share',
      'document_modify', 'document_archive', 'document_restore',
      'audit_run', 'audit_report_generate', 'audit_report_export', 'audit_report_distribute',
      'policy_create', 'policy_modify', 'policy_delete', 'policy_approve',
      'compliance_check', 'violation_found', 'remediation_assign', 'remediation_complete',
      'workflow_create', 'workflow_execute', 'task_assign', 'task_complete', 'task_reassign',
      'user_create', 'user_modify', 'user_delete', 'user_role_change',
      'system_config_change', 'security_event', 'access_denial', 'anomaly_detected',
      'print', 'screenshot_blocked', 'unauthorized_access_attempt'
    ],
    required: true 
  },
  resource: {
    type: { type: String, enum: ['document', 'policy', 'workflow', 'user', 'audit_report', 'system'] },
    id: { type: String }
  },
  status: { type: String, enum: ['success', 'failure', 'partial'] },
  description: { type: String },
  details: {
    beforeValue: { type: Object },
    afterValue: { type: Object },
    changesSummary: { type: String }
  },
  sessionId: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  location: {
    country: { type: String },
    city: { type: String },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  device: {
    type: { type: String },
    os: { type: String },
    browser: { type: String }
  },
  performanceMetrics: {
    duration: { type: Number },
    resourcesAccessed: { type: Number }
  },
  riskScore: { type: Number, min: 0, max: 100 },
  anomalies: [{
    type: { type: String, enum: ['unusual_time', 'unusual_location', 'unusual_volume', 'unusual_pattern'] },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    description: { type: String }
  }],
  complianceRelevant: { type: Boolean, default: false },
  regulatoryFramework: { type: String },
  retentionExpiry: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true }
};

module.exports = AuditLogSchema;
