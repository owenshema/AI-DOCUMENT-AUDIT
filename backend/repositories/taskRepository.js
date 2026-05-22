/**
 * Task Repository
 * Data access layer for Task model
 */

const db = require('../db/models');
const { Task, User } = db;
const { Op } = require('sequelize');

class TaskRepository {
  async create(taskData) {
    return await Task.create(taskData);
  }

  async findById(taskId) {
    return await Task.findByPk(taskId, {
      include: [{ model: User, as: 'assignee' }]
    });
  }

  async getAll(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const where = {};

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters.workflowId) where.workflowId = filters.workflowId;

    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [{ model: User, as: 'assignee', attributes: ['id', 'email', 'fullName'] }],
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, tasks: rows, page, limit };
  }

  async update(taskId, updates) {
    const task = await Task.findByPk(taskId);
    if (!task) return null;
    return await task.update(updates);
  }

  async delete(taskId) {
    return await Task.destroy({ where: { id: taskId } });
  }

  async getTasksByAssignee(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Task.findAndCountAll({
      where: { assignedTo: userId },
      include: [{ model: User, as: 'assignee' }],
      offset,
      limit,
      order: [['dueDate', 'ASC']]
    });

    return { total: count, tasks: rows, page, limit };
  }

  async getTasksByWorkflow(workflowId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Task.findAndCountAll({
      where: { workflowId },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, tasks: rows, page, limit };
  }

  async getOverdueTask() {
    return await Task.findAll({
      where: {
        status: { [Op.ne]: 'completed' },
        dueDate: { [Op.lt]: new Date() }
      }
    });
  }

  async getTasksByStatus(status, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Task.findAndCountAll({
      where: { status },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, tasks: rows, page, limit };
  }

  async getTasksByPriority(priority, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Task.findAndCountAll({
      where: { priority },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, tasks: rows, page, limit };
  }

  async getTasksOverview(userId) {
    const total = await Task.count({ where: { assignedTo: userId } });
    const pending = await Task.count({ where: { assignedTo: userId, status: 'pending' } });
    const inProgress = await Task.count({ where: { assignedTo: userId, status: 'in_progress' } });
    const completed = await Task.count({ where: { assignedTo: userId, status: 'completed' } });
    const overdue = await Task.count({
      where: {
        assignedTo: userId,
        status: { [Op.ne]: 'completed' },
        dueDate: { [Op.lt]: new Date() }
      }
    });

    return { total, pending, inProgress, completed, overdue };
  }

  async assignTask(taskId, newAssigneeId) {
    return await Task.update(
      { assignedTo: newAssigneeId },
      { where: { id: taskId } }
    );
  }

  async updateStatus(taskId, newStatus) {
    return await Task.update(
      { status: newStatus, updatedAt: new Date() },
      { where: { id: taskId } }
    );
  }

  async escalateTask(taskId, newPriority) {
    return await Task.update(
      { priority: newPriority, escalatedAt: new Date() },
      { where: { id: taskId } }
    );
  }
}

module.exports = new TaskRepository();
