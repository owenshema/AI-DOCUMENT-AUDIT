/**
 * Compliance Repository
 * Data access layer for Policy and ComplianceCheck models
 */

const db = require('../db/models');
const { Policy, ComplianceCheck } = db;

class ComplianceRepository {
  // Policy methods
  async createPolicy(policyData) {
    return await Policy.create(policyData);
  }

  async getPolicyById(policyId) {
    return await Policy.findByPk(policyId);
  }

  async getAllPolicies(filters = {}) {
    const where = {};
    if (filters.framework) where.framework = filters.framework;
    if (filters.status) where.status = filters.status;
    if (filters.department) where.department = filters.department;

    return await Policy.findAll({ where });
  }

  async updatePolicy(policyId, updates) {
    const policy = await Policy.findByPk(policyId);
    if (!policy) return null;
    return await policy.update(updates);
  }

  async deletePolicy(policyId) {
    return await Policy.destroy({ where: { id: policyId } });
  }

  async getPoliciesByFramework(framework) {
    return await Policy.findAll({ where: { framework } });
  }

  async getPoliciesByDepartment(department) {
    return await Policy.findAll({ where: { department } });
  }

  // ComplianceCheck methods
  async createComplianceCheck(checkData) {
    return await ComplianceCheck.create(checkData);
  }

  async getComplianceCheckById(checkId) {
    return await ComplianceCheck.findByPk(checkId);
  }

  async getComplianceChecksByDocument(documentId) {
    return await ComplianceCheck.findAll({
      where: { documentId },
      order: [['createdAt', 'DESC']]
    });
  }

  async getComplianceChecksByPolicy(policyId) {
    return await ComplianceCheck.findAll({
      where: { policyId }
    });
  }

  async updateComplianceCheck(checkId, updates) {
    const check = await ComplianceCheck.findByPk(checkId);
    if (!check) return null;
    return await check.update(updates);
  }

  async getComplianceReport(documentId) {
    const checks = await ComplianceCheck.findAll({
      where: { documentId },
      include: [{ model: Policy, as: 'policy' }]
    });

    if (checks.length === 0) return null;

    const totalScore = checks.reduce((sum, check) => sum + check.complianceScore, 0);
    const avgScore = totalScore / checks.length;

    return {
      documentId,
      complianceScore: avgScore,
      checks,
      status: avgScore >= 80 ? 'compliant' : avgScore >= 60 ? 'partial' : 'non-compliant'
    };
  }

  async getAllComplianceChecks(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const where = {};

    if (filters.status) where.status = filters.status;
    if (filters.documentId) where.documentId = filters.documentId;

    const { count, rows } = await ComplianceCheck.findAndCountAll({
      where,
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, checks: rows, page, limit };
  }

  async getViolationsByDocument(documentId) {
    const checks = await ComplianceCheck.findAll({
      where: { documentId, status: 'violation' }
    });
    return checks;
  }

  async getAverageComplianceScore(departmentId) {
    const checks = await ComplianceCheck.findAll({
      attributes: ['complianceScore'],
      where: { departmentId }
    });

    if (checks.length === 0) return 0;

    const total = checks.reduce((sum, check) => sum + check.complianceScore, 0);
    return total / checks.length;
  }
}

module.exports = new ComplianceRepository();
