/**
 * Task DTOs
 * Request and response validation objects
 */

class CreateTaskDTO {
  constructor(title, description, documentId, workflowId, priority, dueDate, assignedTo) {
    this.title = title;
    this.description = description;
    this.documentId = documentId;
    this.workflowId = workflowId;
    this.priority = priority; // 'low', 'medium', 'high', 'critical'
    this.dueDate = dueDate;
    this.assignedTo = assignedTo;
  }

  validate() {
    const errors = [];
    
    if (!this.title || this.title.trim() === '') {
      errors.push('Task title required');
    }
    if (!this.priority || !['low', 'medium', 'high', 'critical'].includes(this.priority)) {
      errors.push('Valid priority level required');
    }
    if (this.dueDate && isNaN(Date.parse(this.dueDate))) {
      errors.push('Valid due date required');
    }
    
    return errors;
  }
}

class UpdateTaskDTO {
  constructor(taskId, title, description, priority, status, dueDate) {
    this.taskId = taskId;
    this.title = title;
    this.description = description;
    this.priority = priority;
    this.status = status; // 'pending', 'in_progress', 'completed', 'cancelled'
    this.dueDate = dueDate;
  }

  validate() {
    const errors = [];
    
    if (!this.taskId) {
      errors.push('Task ID required');
    }
    if (this.status && !['pending', 'in_progress', 'completed', 'cancelled'].includes(this.status)) {
      errors.push('Invalid task status');
    }
    if (this.priority && !['low', 'medium', 'high', 'critical'].includes(this.priority)) {
      errors.push('Invalid priority level');
    }
    
    return errors;
  }
}

class AssignTaskDTO {
  constructor(taskId, assignedTo, reassignReason = '') {
    this.taskId = taskId;
    this.assignedTo = assignedTo;
    this.reassignReason = reassignReason;
  }

  validate() {
    const errors = [];
    
    if (!this.taskId) {
      errors.push('Task ID required');
    }
    if (!this.assignedTo || this.assignedTo.trim() === '') {
      errors.push('Assigned to user ID required');
    }
    
    return errors;
  }
}

class EscalateTaskDTO {
  constructor(taskId, escalationLevel, reason) {
    this.taskId = taskId;
    this.escalationLevel = escalationLevel; // 1 = supervisor, 2 = manager, 3 = director
    this.reason = reason;
  }

  validate() {
    const errors = [];
    
    if (!this.taskId) {
      errors.push('Task ID required');
    }
    if (!this.escalationLevel || ![1, 2, 3].includes(this.escalationLevel)) {
      errors.push('Valid escalation level (1-3) required');
    }
    if (!this.reason || this.reason.trim() === '') {
      errors.push('Escalation reason required');
    }
    
    return errors;
  }
}

class UpdateTaskStatusDTO {
  constructor(taskId, status, completionNotes = '') {
    this.taskId = taskId;
    this.status = status;
    this.completionNotes = completionNotes;
  }

  validate() {
    const errors = [];
    
    if (!this.taskId) {
      errors.push('Task ID required');
    }
    if (!this.status || !['pending', 'in_progress', 'completed', 'cancelled'].includes(this.status)) {
      errors.push('Valid status required (pending, in_progress, completed, cancelled)');
    }
    
    return errors;
  }
}

class TaskResponseDTO {
  constructor(task) {
    this.id = task.id;
    this.title = task.title;
    this.description = task.description;
    this.status = task.status;
    this.priority = task.priority;
    this.assignedTo = task.assignedTo;
    this.dueDate = task.dueDate;
    this.createdAt = task.createdAt;
    this.updatedAt = task.updatedAt;
  }
}

module.exports = {
  CreateTaskDTO,
  UpdateTaskDTO,
  AssignTaskDTO,
  EscalateTaskDTO,
  UpdateTaskStatusDTO,
  TaskResponseDTO
};
