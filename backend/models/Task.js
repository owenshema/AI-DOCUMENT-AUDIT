/**
 * Task Model
 * Workflow task management and tracking
 */

const TaskSchema = {
  id: { type: String, unique: true, required: true },
  documentId: { type: String, required: true },
  workflowId: { type: String },
  stepId: { type: String },
  title: { type: String, required: true },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'rejected', 'escalated', 'overdue'],
    default: 'pending'
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  assignedTo: { type: String, required: true },
  assignedBy: { type: String },
  assignedAt: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  completedAt: { type: Date },
  completedBy: { type: String },
  delegatedTo: { type: String },
  delegatedAt: { type: Date },
  comments: [{
    userId: { type: String },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  approvalDecision: { type: String, enum: ['approved', 'rejected', 'pending', 'needs_revision'] },
  rejectionReason: { type: String },
  revisionRequests: [{
    requestedBy: { type: String },
    requestedAt: { type: Date },
    description: { type: String },
    status: { type: String, enum: ['pending', 'completed'] }
  }],
  escalations: [{
    escalatedBy: { type: String },
    escalatedAt: { type: Date },
    reason: { type: String },
    escalatedTo: { type: String },
    status: { type: String, enum: ['pending', 'resolved'] }
  }],
  notifications: [{
    type: { type: String, enum: ['creation', 'deadline_approaching', 'overdue', 'reassignment', 'completion'] },
    sentTo: { type: String },
    sentAt: { type: Date }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

module.exports = TaskSchema;
