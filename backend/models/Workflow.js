/**
 * Workflow Model
 * Document review and approval workflow management
 */

const WorkflowSchema = {
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  description: { type: String },
  workflowType: { type: String, enum: ['review', 'approval', 'release', 'custom'], required: true },
  status: { type: String, enum: ['draft', 'active', 'inactive'], default: 'draft' },
  department: { type: String },
  steps: [{
    stepId: { type: String },
    stepNumber: { type: Number },
    name: { type: String },
    description: { type: String },
    actionType: { type: String, enum: ['review', 'approve', 'reject', 'reassign', 'escalate'] },
    assignedRoles: [{ type: String }],
    assignedUsers: [{ type: String }],
    requiredApprovals: { type: Number, default: 1 },
    timeoutDays: { type: Number },
    autoEscalate: { type: Boolean, default: false },
    escalationPath: [{ type: String }],
    comments: { type: String },
    isConditional: { type: Boolean, default: false },
    conditions: [{
      parameter: { type: String },
      operator: { type: String },
      value: { type: String },
      nextStep: { type: String }
    }]
  }],
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

module.exports = WorkflowSchema;
