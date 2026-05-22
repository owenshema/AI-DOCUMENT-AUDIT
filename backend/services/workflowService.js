/**
 * Workflow Service
 * Business logic for workflow management
 */

const workflowRepository = require('../repositories/workflowRepository');
const taskRepository = require('../repositories/taskRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const { CreateWorkflowDTO, StartWorkflowDTO } = require('../dto');

class WorkflowService {
  async createWorkflow(createDTO) {
    // Validate DTO
    const errors = createDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    const workflow = await workflowRepository.create({
      name: createDTO.name,
      description: createDTO.description,
      steps: createDTO.steps,
      department: createDTO.department,
      status: 'draft'
    });

    // Log workflow creation
    await auditLogRepository.create({
      action: 'workflow_created',
      resourceType: 'workflow',
      resourceId: workflow.id,
      description: `Workflow created: ${createDTO.name}`
    });

    return workflow;
  }

  async updateWorkflow(workflowId, updates) {
    const workflow = await workflowRepository.findById(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    const updated = await workflowRepository.update(workflowId, updates);

    // Log update
    await auditLogRepository.create({
      action: 'workflow_updated',
      resourceType: 'workflow',
      resourceId: workflowId,
      description: `Workflow updated: ${workflow.name}`
    });

    return updated;
  }

  async startWorkflow(startDTO) {
    // Validate DTO
    const errors = startDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    const workflow = await workflowRepository.findById(startDTO.workflowId);
    if (!workflow) throw new Error('Workflow not found');

    // Create tasks for each step
    const tasks = [];
    if (workflow.steps && Array.isArray(workflow.steps)) {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const task = await taskRepository.create({
          title: `${workflow.name} - Step ${i + 1}: ${step.name}`,
          description: step.description,
          documentId: startDTO.documentId,
          workflowId: startDTO.workflowId,
          priority: 'medium',
          status: i === 0 ? 'pending' : 'waiting',
          assignedTo: step.assignedTo,
          order: i
        });
        tasks.push(task);
      }
    }

    // Increment execution count
    await workflowRepository.incrementExecutionCount(startDTO.workflowId);

    // Log workflow start
    await auditLogRepository.create({
      userId: startDTO.initiatedBy,
      action: 'workflow_started',
      resourceType: 'workflow',
      resourceId: startDTO.workflowId,
      description: `Workflow started: ${workflow.name} with ${tasks.length} tasks`
    });

    return {
      workflowId: startDTO.workflowId,
      documentId: startDTO.documentId,
      tasks,
      status: 'in_progress'
    };
  }

  async getTaskQueue(workflowId, page = 1, limit = 10) {
    return await taskRepository.getTasksByWorkflow(workflowId, page, limit);
  }

  async completeTask(taskId, completionNotes) {
    await taskRepository.updateStatus(taskId, 'completed');

    // Log completion
    await auditLogRepository.create({
      action: 'workflow_task_completed',
      resourceType: 'task',
      resourceId: taskId,
      description: `Workflow task completed: ${completionNotes}`
    });

    return { success: true, taskId };
  }

  async reassignTask(taskId, newAssigneeId, reason) {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');

    await taskRepository.assignTask(taskId, newAssigneeId);

    // Log reassignment
    await auditLogRepository.create({
      action: 'workflow_task_reassigned',
      resourceType: 'task',
      resourceId: taskId,
      description: `Workflow task reassigned: ${reason}`
    });

    return { success: true, taskId, newAssigneeId };
  }

  async escalateTask(taskId, escalationType, reason) {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');

    if (escalationType === 'priority') {
      const priorityMap = { low: 'medium', medium: 'high', high: 'critical' };
      const newPriority = priorityMap[task.priority] || 'critical';
      await taskRepository.escalateTask(taskId, newPriority);
    }

    // Log escalation
    await auditLogRepository.create({
      action: 'workflow_task_escalated',
      resourceType: 'task',
      resourceId: taskId,
      description: `Workflow task escalated (${escalationType}): ${reason}`
    });

    return { success: true, taskId };
  }

  async getAllWorkflows(filters = {}, page = 1, limit = 10) {
    return await workflowRepository.findAll(filters, page, limit);
  }

  async getWorkflowById(workflowId) {
    return await workflowRepository.findById(workflowId);
  }

  async deleteWorkflow(workflowId) {
    const workflow = await workflowRepository.findById(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    await workflowRepository.delete(workflowId);

    // Log deletion
    await auditLogRepository.create({
      action: 'workflow_deleted',
      resourceType: 'workflow',
      resourceId: workflowId,
      description: `Workflow deleted: ${workflow.name}`
    });

    return { success: true, workflowId };
  }
}

module.exports = new WorkflowService();
