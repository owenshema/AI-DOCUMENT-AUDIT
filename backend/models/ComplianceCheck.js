/**
 * ComplianceCheck Model
 * Document compliance verification results
 */

const ComplianceCheckSchema = {
  id: { type: String, unique: true, required: true },
  documentId: { type: String, required: true },
  policyId: { type: String, required: true },
  checkType: { type: String, enum: ['automatic', 'manual'], default: 'automatic' },
  status: { type: String, enum: ['passed', 'failed', 'warning', 'pending'], required: true },
  complianceScore: { type: Number, min: 0, max: 100, required: true },
  findings: [{
    ruleId: { type: String },
    ruleName: { type: String },
    status: { type: String, enum: ['compliant', 'non_compliant', 'exception'] },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    description: { type: String },
    evidence: { type: String },
    remediationGuidance: { type: String }
  }],
  violations: {
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 }
  },
  exceptions: [{
    ruleId: { type: String },
    reason: { type: String },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    expiryDate: { type: Date }
  }],
  remediationActions: [{
    actionId: { type: String },
    description: { type: String },
    assignedTo: { type: String },
    dueDate: { type: Date },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'overdue'] },
    completedAt: { type: Date }
  }],
  performedBy: { type: String },
  performedAt: { type: Date, default: Date.now },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  nextCheckDue: { type: Date },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

module.exports = ComplianceCheckSchema;
