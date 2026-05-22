/**
 * Workflow DTOs
 * Request and response validation objects
 */

class CreateWorkflowDTO {
  constructor(name, description, steps, department) {
    this.name = name;
    this.description = description;
    this.steps = steps; // array of workflow steps
    this.department = department;
  }

  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim() === '') {
      errors.push('Workflow name required');
    }
    if (!this.description || this.description.trim() === '') {
      errors.push('Workflow description required');
    }
    if (!Array.isArray(this.steps) || this.steps.length === 0) {
      errors.push('At least one workflow step required');
    }
    if (!this.department || this.department.trim() === '') {
      errors.push('Department required');
    }
    
    return errors;
  }
}

class UpdateWorkflowDTO {
  constructor(workflowId, name, description, steps, status) {
    this.workflowId = workflowId;
    this.name = name;
    this.description = description;
    this.steps = steps;
    this.status = status; // 'draft', 'active', 'archived'
  }

  validate() {
    const errors = [];
    
    if (!this.workflowId) {
      errors.push('Workflow ID required');
    }
    if (this.status && !['draft', 'active', 'archived'].includes(this.status)) {
      errors.push('Invalid workflow status');
    }
    
    return errors;
  }
}

class StartWorkflowDTO {
  constructor(workflowId, documentId, initiatedBy) {
    this.workflowId = workflowId;
    this.documentId = documentId;
    this.initiatedBy = initiatedBy;
  }

  validate() {
    const errors = [];
    
    if (!this.workflowId) {
      errors.push('Workflow ID required');
    }
    if (!this.documentId) {
      errors.push('Document ID required');
    }
    if (!this.initiatedBy) {
      errors.push('Initiated by user ID required');
    }
    
    return errors;
  }
}

class CompleteTaskDTO {
  constructor(taskId, status, completionNotes) {
    this.taskId = taskId;
    this.status = status;
    this.completionNotes = completionNotes;
  }

  validate() {
    const errors = [];
    
    if (!this.taskId) {
      errors.push('Task ID required');
    }
    if (!this.status || !['completed', 'rejected'].includes(this.status)) {
      errors.push('Status must be completed or rejected');
    }
    if (!this.completionNotes || this.completionNotes.trim() === '') {
      errors.push('Completion notes required');
    }
    
    return errors;
  }
}

class ReassignTaskDTO {
  constructor(taskId, newAssignee, reason) {
    this.taskId = taskId;
    this.newAssignee = newAssignee;
    this.reason = reason;
  }

  validate() {
    const errors = [];
    
    if (!this.taskId) {
      errors.push('Task ID required');
    }
    if (!this.newAssignee) {
      errors.push('New assignee user ID required');
    }
    if (!this.reason || this.reason.trim() === '') {
      errors.push('Reassignment reason required');
    }
    
    return errors;
  }
}

class EscalateTaskDTO {
  constructor(taskId, escalationType, reason) {
    this.taskId = taskId;
    this.escalationType = escalationType; // 'priority', 'authority'
    this.reason = reason;
  }

  validate() {
    const errors = [];
    
    if (!this.taskId) {
      errors.push('Task ID required');
    }
    if (!['priority', 'authority'].includes(this.escalationType)) {
      errors.push('Escalation type must be priority or authority');
    }
    if (!this.reason || this.reason.trim() === '') {
      errors.push('Escalation reason required');
    }
    
    return errors;
  }
}

module.exports = {
  CreateWorkflowDTO,
  UpdateWorkflowDTO,
  StartWorkflowDTO,
  CompleteTaskDTO,
  ReassignTaskDTO,
  EscalateTaskDTO
};
