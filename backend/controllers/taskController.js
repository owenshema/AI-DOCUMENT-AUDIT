/**
 * Task Controller
 * Handles task management with database
 */

const getTasks = async (req, res) => {
  try {
    const { status, priority, limit = 20, page = 1 } = req.query;
    const { Task, User } = req.app.locals.models;
    const userId = req.user?.id;

    const where = { assignedTo: userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'fullName', 'email'] }
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
    console.error('Get tasks error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tasks' });
  }
};

const createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, assignedTo, documentId, workflowId } = req.body;
    const { Task } = req.app.locals.models;
    const { v4: uuidv4 } = require('uuid');

    if (!title || !priority) {
      return res.status(400).json({ error: 'Title and priority are required' });
    }

    const task = await Task.create({
      title,
      description,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo || req.user?.id,
      assignedBy: req.user?.id,
      documentId: documentId || uuidv4(), // Use provided documentId or generate placeholder
      workflowId: workflowId || null,
      status: 'pending'
    });

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: error.message || 'Failed to create task' });
  }
};

const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;
    const { Task } = req.app.locals.models;

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.update(updates);
    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: error.message || 'Failed to update task' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { Task } = req.app.locals.models;

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.destroy();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete task' });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, notes } = req.body;
    const { Task, AuditLog } = req.app.locals.models;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const oldStatus = task.status;
    await task.update({ status, notes });

    // Log status change
    await AuditLog.create({
      userId: req.user?.id,
      action: 'TASK_STATUS_CHANGED',
      description: `Task status changed from ${oldStatus} to ${status}`,
      resourceType: 'Task',
      resourceId: taskId,
      status: 'success'
    });

    res.json({
      message: 'Task status updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: error.message || 'Failed to update status' });
  }
};

const getTasksByWorkflow = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    const { Task, Workflow } = req.app.locals.models;

    // Verify workflow exists
    const workflow = await Workflow.findByPk(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const { count, rows } = await Task.findAndCountAll({
      where: { workflowId },
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['dueDate', 'ASC']]
    });

    res.json({
      tasks: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      workflowId
    });
  } catch (error) {
    console.error('Get tasks by workflow error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch workflow tasks' });
  }
};

const assignTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { assignedTo } = req.body;
    const { Task, User } = req.app.locals.models;

    if (!assignedTo) {
      return res.status(400).json({ error: 'assignedTo is required' });
    }

    // Verify user exists
    const user = await User.findByPk(assignedTo);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.update({ assignedTo });
    res.json({
      message: 'Task assigned successfully',
      task
    });
  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({ error: error.message || 'Failed to assign task' });
  }
};

const getTasksOverview = async (req, res) => {
  try {
    const { Task } = req.app.locals.models;

    const pending = await Task.count({ where: { status: 'pending' } });
    const inProgress = await Task.count({ where: { status: 'in_progress' } });
    const completed = await Task.count({ where: { status: 'completed' } });
    const overdue = await Task.count({
      where: {
        status: { [require('sequelize').Op.ne]: 'completed' },
        dueDate: { [require('sequelize').Op.lt]: new Date() }
      }
    });

    res.json({
      overview: {
        pending,
        inProgress,
        completed,
        overdue,
        total: pending + inProgress + completed
      }
    });
  } catch (error) {
    console.error('Get tasks overview error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch overview' });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  getTasksByWorkflow,
  assignTask,
  getTasksOverview
};