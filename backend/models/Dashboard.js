/**
 * Dashboard Model
 * Dashboard metrics and summaries
 */

const DashboardSchema = {
  id: { type: String, unique: true, required: true },
  userId: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String },
  customLayout: {
    widgets: [{
      id: { type: String },
      type: { type: String },
      position: { type: Object },
      size: { type: Object },
      config: { type: Object }
    }]
  },
  summary: {
    totalDocuments: { type: Number, default: 0 },
    pendingAudits: { type: Number, default: 0 },
    completedAudits: { type: Number, default: 0 },
    complianceScore: { type: Number, default: 0 },
    criticalFindings: { type: Number, default: 0 },
    pendingTasks: { type: Number, default: 0 },
    overdueTasks: { type: Number, default: 0 }
  },
  recentActivities: [{
    activity: { type: String },
    timestamp: { type: Date },
    user: { type: String },
    details: { type: String }
  }],
  alerts: [{
    alertId: { type: String },
    type: { type: String, enum: ['warning', 'error', 'info', 'success'] },
    message: { type: String },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    createdAt: { type: Date },
    isRead: { type: Boolean, default: false }
  }],
  notifications: [{
    notificationId: { type: String },
    type: { type: String },
    message: { type: String },
    link: { type: String },
    createdAt: { type: Date },
    isRead: { type: Boolean, default: false }
  }],
  performanceMetrics: {
    auditCompletionRate: { type: Number },
    averageComplianceScore: { type: Number },
    criticalFindingsTrend: [{ date: { type: Date }, count: { type: Number } }],
    taskCompletionRate: { type: Number }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

module.exports = DashboardSchema;
