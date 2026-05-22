/**
 * Workflow Repository
 * Data access layer for Workflow model
 */

const db = require('../db/models');
const { Workflow } = db;
const { Op } = require('sequelize');

class WorkflowRepository {
  async create(workflowData) {
    return await Workflow.create(workflowData);
  }

  async findById(workflowId) {
    return await Workflow.findByPk(workflowId);
  }

  async findAll(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const where = {};

    if (filters.status) where.status = filters.status;
    if (filters.department) where.department = filters.department;

    const { count, rows } = await Workflow.findAndCountAll({
      where,
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, workflows: rows, page, limit };
  }

  async update(workflowId, updates) {
    const workflow = await Workflow.findByPk(workflowId);
    if (!workflow) return null;
    return await workflow.update(updates);
  }

  async delete(workflowId) {
    return await Workflow.destroy({ where: { id: workflowId } });
  }

  async getByStatus(status, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Workflow.findAndCountAll({
      where: { status },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, workflows: rows, page, limit };
  }

  async getByDepartment(department, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Workflow.findAndCountAll({
      where: { department },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, workflows: rows, page, limit };
  }

  async updateStatus(workflowId, status) {
    return await Workflow.update(
      { status },
      { where: { id: workflowId } }
    );
  }

  async addStep(workflowId, step) {
    const workflow = await Workflow.findByPk(workflowId);
    if (!workflow) return null;

    const steps = workflow.steps || [];
    steps.push({
      ...step,
      id: `step_${Date.now()}`,
      createdAt: new Date()
    });

    return await workflow.update({ steps });
  }

  async removeStep(workflowId, stepId) {
    const workflow = await Workflow.findByPk(workflowId);
    if (!workflow) return null;

    const steps = (workflow.steps || []).filter(s => s.id !== stepId);
    return await workflow.update({ steps });
  }

  async getActiveWorkflows() {
    return await Workflow.findAll({
      where: { status: 'active' },
      order: [['createdAt', 'DESC']]
    });
  }

  async getWorkflowsForDocument(documentId) {
    return await Workflow.findAll({
      where: {
        associatedDocuments: {
          [Op.contains]: [documentId]
        }
      }
    });
  }

  async incrementExecutionCount(workflowId) {
    const workflow = await Workflow.findByPk(workflowId);
    if (!workflow) return null;

    return await workflow.update({
      executionCount: (workflow.executionCount || 0) + 1
    });
  }
}

module.exports = new WorkflowRepository();
