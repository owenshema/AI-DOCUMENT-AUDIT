/**
 * Workflow Controller
 * Handles workflow configuration and task management with database
 */

const createWorkflow = async (req, res) => {
  try {
    const { name, description, workflowType, steps, department } = req.body;
    const { Workflow } = req.app.locals.models;

    if (!name || !workflowType || !steps || steps.length === 0) {
      return res.status(400).json({ error: 'name, workflowType, and steps are required' });
    }

    const workflow = await Workflow.create({
      name,
      description,
      workflowType,
      steps: Array.isArray(steps) ? steps : [steps],
      department,
      status: 'active',
      createdBy: req.user?.id
    });

    res.status(201).json({
      message: 'Workflow created successfully',
      workflow
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ error: error.message || 'Failed to create workflow' });
  }
};

const getAllWorkflows = async (req, res) => {
  try {
    const { status, department, limit = 20, page = 1 } = req.query;
    const { Workflow } = req.app.locals.models;

    const where = {};
    if (status) where.status = status;
    if (department) where.department = department;

    const { count, rows } = await Workflow.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      workflows: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch workflows' });
  }
};

const getWorkflowById = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { Workflow } = req.app.locals.models;

    const workflow = await Workflow.findByPk(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch workflow' });
  }
};

const updateWorkflow = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const updateData = req.body;
    const { Workflow } = req.app.locals.models;

    const workflow = await Workflow.findByPk(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    await workflow.update(updateData);
    res.json({
      message: 'Workflow updated successfully',
      workflow
    });
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({ error: error.message || 'Failed to update workflow' });
  }
};

const startWorkflow = async (req, res) => {
  try {
    const { workflowId, documentId, triggerData = {} } = req.body;
    const { Workflow, Task, Document } = req.app.locals.models;

    const workflow = await Workflow.findByPk(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Create first task from workflow steps
    const firstStep = workflow.steps[0];
    if (firstStep) {
      await Task.create({
        title: `${workflow.name} - ${firstStep.name}`,
        description: `Workflow: ${workflow.name}, Step: ${firstStep.name}`,
        priority: 'high',
        category: 'workflow',
        workflowId,
        documentId,
        status: 'pending',
        createdBy: req.user?.id
      });
    }

    res.json({
      message: 'Workflow started successfully',
      workflowId,
      documentId,
      status: 'in_progress'
    });
  } catch (error) {
    console.error('Start workflow error:', error);
    res.status(500).json({ error: error.message || 'Failed to start workflow' });
  }
};

const getTaskQueue = async (req, res) => {
  try {
    const { status = 'pending', limit = 20, page = 1 } = req.query;
    const { Task, User, Workflow } = req.app.locals.models;
    const userId = req.user?.id;

    const where = { assignedTo: userId };
    if (status) where.status = status;

    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [
        { model: Workflow, as: 'workflow', attributes: ['name', 'workflowType'] },
        { model: User, as: 'assignee', attributes: ['fullName', 'email'] }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['dueDate', 'ASC']]
    });

    res.json({
      tasks: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get task queue error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch task queue' });
  }
};

const completeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { decision, comments, nextAssignee } = req.body;
    const { Task, Workflow, AuditLog } = req.app.locals.models;

    if (!decision) {
      return res.status(400).json({ error: 'decision (approved/rejected) is required' });
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.update({
      status: 'completed',
      decision,
      comments,
      completedAt: new Date()
    });

    // Log task completion
    await AuditLog.create({
      userId: req.user?.id,
      action: 'TASK_COMPLETED',
      description: `Task completed: ${task.title}. Decision: ${decision}`,
      resourceType: 'Task',
      resourceId: taskId,
      status: 'success'
    });

    res.json({
      message: 'Task completed successfully',
      task,
      decision
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete task' });
  }
};

const reassignTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { newAssignee, reason } = req.body;
    const { Task, User, AuditLog } = req.app.locals.models;

    if (!newAssignee) {
      return res.status(400).json({ error: 'newAssignee is required' });
    }

    // Verify user exists
    const user = await User.findByPk(newAssignee);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const oldAssignee = task.assignedTo;
    await task.update({ assignedTo: newAssignee });

    // Log reassignment
    await AuditLog.create({
      userId: req.user?.id,
      action: 'TASK_REASSIGNED',
      description: `Task reassigned from ${oldAssignee} to ${newAssignee}. Reason: ${reason}`,
      resourceType: 'Task',
      resourceId: taskId,
      status: 'success'
    });

    res.json({
      message: 'Task reassigned successfully',
      task,
      reassignedTo: newAssignee
    });
  } catch (error) {
    console.error('Reassign task error:', error);
    res.status(500).json({ error: error.message || 'Failed to reassign task' });
  }
};

const escalateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { escalatedTo, reason } = req.body;
    const { Task, User, AuditLog } = req.app.locals.models;

    if (!escalatedTo) {
      return res.status(400).json({ error: 'escalatedTo is required' });
    }

    // Verify user exists
    const user = await User.findByPk(escalatedTo);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.update({
      assignedTo: escalatedTo,
      priority: 'high',
      escalatedAt: new Date()
    });

    // Log escalation
    await AuditLog.create({
      userId: req.user?.id,
      action: 'TASK_ESCALATED',
      description: `Task escalated to ${escalatedTo}. Reason: ${reason}`,
      resourceType: 'Task',
      resourceId: taskId,
      status: 'success'
    });

    res.json({
      message: 'Task escalated successfully',
      task,
      escalatedTo
    });
  } catch (error) {
    console.error('Escalate task error:', error);
    res.status(500).json({ error: error.message || 'Failed to escalate task' });
  }
};

module.exports = {
  createWorkflow,
  getAllWorkflows,
  getWorkflowById,
  updateWorkflow,
  startWorkflow,
  getTaskQueue,
  completeTask,
  reassignTask,
  escalateTask
};
