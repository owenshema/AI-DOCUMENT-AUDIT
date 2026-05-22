/**
 * RetentionPolicy Model
 * Document retention and archival policies
 */

const RetentionPolicySchema = {
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  description: { type: String },
  policyType: { type: String, enum: ['operational', 'regulatory', 'custom'], default: 'operational' },
  status: { type: String, enum: ['draft', 'active', 'inactive'], default: 'draft' },
  documentTypes: [{ type: String }],
  categories: [{ type: String }],
  departments: [{ type: String }],
  retentionRules: [{
    ruleId: { type: String },
    name: { type: String },
    condition: { type: String },
    retentionPeriodDays: { type: Number },
    retentionPeriodYears: { type: Number },
    dispositionAction: { type: String, enum: ['delete', 'archive', 'review'] },
    legalHold: { type: Boolean, default: false }
  }],
  archivalSettings: {
    archiveAfterDays: { type: Number },
    archiveLocation: { type: String },
    compressionEnabled: { type: Boolean, default: true },
    encryptionEnabled: { type: Boolean, default: true },
    redundancyLevel: { type: String, enum: ['none', 'single', 'double', 'triple'] }
  },
  automationRules: [{
    ruleId: { type: String },
    trigger: { type: String, enum: ['date_based', 'event_based', 'manual'] },
    triggerCriteria: { type: String },
    action: { type: String, enum: ['archive', 'delete', 'notify'] },
    executeAfterDays: { type: Number }
  }],
  legalHoldRules: [{
    holdId: { type: String },
    reason: { type: String },
    initiatedBy: { type: String },
    initiatedAt: { type: Date },
    releaseDate: { type: Date }
  }],
  dispositionApprovals: {
    requiresApproval: { type: Boolean, default: true },
    approveByRoles: [{ type: String }],
    approveByUsers: [{ type: String }]
  },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now },
  effectiveDate: { type: Date },
  expiryDate: { type: Date }
};

module.exports = RetentionPolicySchema;
