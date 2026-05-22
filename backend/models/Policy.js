/**
 * Policy Model
 * Compliance and policy rules configuration
 */

const PolicySchema = {
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  description: { type: String },
  policyType: { 
    type: String, 
    enum: ['organizational', 'regulatory', 'departmental', 'project-specific'],
    required: true 
  },
  version: { type: String, default: '1.0' },
  status: { type: String, enum: ['draft', 'active', 'inactive', 'deprecated'], default: 'draft' },
  department: { type: String },
  applicableRoles: [{ type: String }],
  rules: [{
    id: { type: String },
    name: { type: String },
    description: { type: String },
    ruleType: { type: String, enum: ['mandatory', 'recommended', 'optional'] },
    condition: { type: String },
    action: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    remediationGuidance: { type: String },
    isActive: { type: Boolean, default: true }
  }],
  regulatoryFrameworks: [{ 
    type: String, 
    enum: ['GDPR', 'HIPAA', 'SOX', 'ISO27001', 'ISO9001', 'CCPA', 'LGPD', 'Other']
  }],
  applicableDocumentTypes: [{ type: String }],
  exceptionRules: [{
    documentType: { type: String },
    reason: { type: String },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    expiryDate: { type: Date }
  }],
  effectiveDate: { type: Date, required: true },
  expiryDate: { type: Date },
  owner: { type: String, required: true },
  lastReviewedAt: { type: Date },
  lastReviewedBy: { type: String },
  nextReviewDue: { type: Date },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now }
};

module.exports = PolicySchema;
