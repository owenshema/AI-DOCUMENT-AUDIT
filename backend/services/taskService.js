/**
 * Task Service
 * Business logic for task management
 */

const taskRepository = require('../repositories/taskRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const { CreateTaskDTO, UpdateTaskDTO, AssignTaskDTO } = require('../dto');

class TaskService {
  async createTask(createDTO) {
    // Validate DTO
    const errors = createDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    const task = await taskRepository.create({
      title: createDTO.title,
      description: createDTO.description,
      documentId: createDTO.documentId,
      workflowId: createDTO.workflowId,
      priority: createDTO.priority,
      status: 'pending',
      dueDate: createDTO.dueDate,
      assignedTo: createDTO.assignedTo
    });

    // Log task creation
    await auditLogRepository.create({
      userId: createDTO.assignedTo,
      action: 'task_created',
      resourceType: 'task',
      resourceId: task.id,
      description: `Task created: ${createDTO.title}`
    });

    return task;
  }

  async updateTask(updateDTO) {
    // Validate DTO
    const errors = updateDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    const task = await taskRepository.findById(updateDTO.taskId);
    if (!task) throw new Error('Task not found');

    const updates = {};
    if (updateDTO.title) updates.title = updateDTO.title;
    if (updateDTO.description) updates.description = updateDTO.description;
    if (updateDTO.priority) updates.priority = updateDTO.priority;
    if (updateDTO.dueDate) updates.dueDate = updateDTO.dueDate;

    const updated = await taskRepository.update(updateDTO.taskId, updates);

    // Log update
    await auditLogRepository.create({
      action: 'task_updated',
      resourceType: 'task',
      resourceId: updateDTO.taskId,
      description: `Task updated: ${updateDTO.title}`
    });

    return updated;
  }

  async updateTaskStatus(taskId, newStatus, completionNotes = '') {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');

    await taskRepository.updateStatus(taskId, newStatus);

    // Log status change
    await auditLogRepository.create({
      action: 'task_status_updated',
      resourceType: 'task',
      resourceId: taskId,
      description: `Task status changed to ${newStatus}: ${completionNotes}`
    });

    return { success: true, taskId, newStatus };
  }

  async assignTask(taskId, newAssigneeId, reason = '') {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');

    const oldAssignee = task.assignedTo;
    await taskRepository.assignTask(taskId, newAssigneeId);

    // Log reassignment
    await auditLogRepository.create({
      action: 'task_reassigned',
      resourceType: 'task',
      resourceId: taskId,
      description: `Task reassigned from ${oldAssignee} to ${newAssigneeId}: ${reason}`
    });

    return { success: true, taskId, newAssigneeId };
  }

  async escalateTask(taskId, escalationLevel) {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');

    // Map escalation level to priority
    const priorityMap = { 1: 'high', 2: 'critical', 3: 'critical' };
    const newPriority = priorityMap[escalationLevel] || 'high';

    await taskRepository.escalateTask(taskId, newPriority);

    // Log escalation
    await auditLogRepository.create({
      action: 'task_escalated',
      resourceType: 'task',
      resourceId: taskId,
      description: `Task escalated to level ${escalationLevel} (priority: ${newPriority})`
    });

    return { success: true, taskId, newPriority };
  }

  async getTasks(filters = {}, page = 1, limit = 10) {
    return await taskRepository.getAll(filters, page, limit);
  }

  async getTasksByAssignee(userId, page = 1, limit = 10) {
    return await taskRepository.getTasksByAssignee(userId, page, limit);
  }

  async getTasksByWorkflow(workflowId, page = 1, limit = 10) {
    return await taskRepository.getTasksByWorkflow(workflowId, page, limit);
  }

  async getTasksOverview(userId) {
    return await taskRepository.getTasksOverview(userId);
  }

  async deleteTask(taskId) {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');

    await taskRepository.delete(taskId);

    // Log deletion
    await auditLogRepository.create({
      action: 'task_deleted',
      resourceType: 'task',
      resourceId: taskId,
      description: `Task deleted: ${task.title}`
    });

    return { success: true, taskId };
  }

  async getOverdueTasks() {
    return await taskRepository.getOverdueTask();
  }
}

module.exports = new TaskService();
