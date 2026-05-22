/**
 * AuditReport Model
 * Comprehensive audit report generation and archival
 */

const AuditReportSchema = {
  id: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  reportType: { type: String, enum: ['summary', 'detailed', 'exception_only', 'custom'], required: true },
  status: { type: String, enum: ['draft', 'in_review', 'approved', 'published', 'archived'], default: 'draft' },
  scope: {
    documentIds: [{ type: String }],
    departments: [{ type: String }],
    dateRange: {
      startDate: { type: Date },
      endDate: { type: Date }
    },
    policyIds: [{ type: String }]
  },
  summary: {
    totalDocumentsAudited: { type: Number },
    compliancePassRate: { type: Number, min: 0, max: 100 },
    overallRiskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    keyFindings: [{ type: String }],
    executiveSummary: { type: String }
  },
  findings: [{
    findingId: { type: String },
    title: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    documentId: { type: String },
    description: { type: String },
    affectedArea: { type: String },
    rootCause: { type: String },
    remediation: { type: String },
    estimatedRemediationCost: { type: Number }
  }],
  complianceScorecard: {
    overallScore: { type: Number, min: 0, max: 100 },
    byDepartment: [{
      department: { type: String },
      score: { type: Number, min: 0, max: 100 }
    }],
    byPolicy: [{
      policyId: { type: String },
      policyName: { type: String },
      score: { type: Number, min: 0, max: 100 }
    }],
    byRiskLevel: {
      critical: { type: Number },
      high: { type: Number },
      medium: { type: Number },
      low: { type: Number }
    }
  },
  correctiveActions: [{
    actionId: { type: String },
    title: { type: String },
    description: { type: String },
    assignedTo: { type: String },
    dueDate: { type: Date },
    estimatedCost: { type: Number },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'overdue'] },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'] }
  }],
  generatedBy: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  publishedAt: { type: Date },
  distributionList: [{ 
    userId: { type: String },
    deliveryMethod: { type: String, enum: ['email', 'portal', 'both'] },
    sentAt: { type: Date }
  }],
  exportFormats: [{ type: String, enum: ['PDF', 'Excel', 'Word', 'JSON'] }],
  metadata: {
    language: { type: String },
    classification: { type: String },
    version: { type: String }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  archivedAt: { type: Date }
};

module.exports = AuditReportSchema;
