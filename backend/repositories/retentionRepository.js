/**
 * Retention Repository
 * Data access layer for RetentionPolicy model
 */

const db = require('../db/models');
const { RetentionPolicy, Document } = db;
const { Op } = require('sequelize');

class RetentionRepository {
  async createPolicy(policyData) {
    return await RetentionPolicy.create(policyData);
  }

  async getPolicyById(policyId) {
    return await RetentionPolicy.findByPk(policyId);
  }

  async getAllPolicies(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const where = {};

    if (filters.status) where.status = filters.status;
    if (filters.department) where.department = filters.department;

    const { count, rows } = await RetentionPolicy.findAndCountAll({
      where,
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, policies: rows, page, limit };
  }

  async updatePolicy(policyId, updates) {
    const policy = await RetentionPolicy.findByPk(policyId);
    if (!policy) return null;
    return await policy.update(updates);
  }

  async deletePolicy(policyId) {
    return await RetentionPolicy.destroy({ where: { id: policyId } });
  }

  async archiveDocument(documentId, reason) {
    return await Document.update(
      {
        status: 'archived',
        archivedAt: new Date(),
        archiveReason: reason
      },
      { where: { id: documentId } }
    );
  }

  async getArchivedDocuments(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Document.findAndCountAll({
      where: { status: 'archived' },
      offset,
      limit,
      order: [['archivedAt', 'DESC']]
    });

    return { total: count, documents: rows, page, limit };
  }

  async restoreArchivedDocument(documentId) {
    return await Document.update(
      {
        status: 'approved',
        archivedAt: null,
        archiveReason: null
      },
      { where: { id: documentId } }
    );
  }

  async setLegalHold(documentId, reason, expiryDate) {
    return await Document.update(
      {
        legalHoldActive: true,
        legalHoldReason: reason,
        legalHoldEndDate: expiryDate
      },
      { where: { id: documentId } }
    );
  }

  async removeLegalHold(documentId) {
    return await Document.update(
      {
        legalHoldActive: false,
        legalHoldReason: null,
        legalHoldEndDate: null
      },
      { where: { id: documentId } }
    );
  }

  async getDocumentsOnLegalHold(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Document.findAndCountAll({
      where: { legalHoldActive: true },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, documents: rows, page, limit };
  }

  async getExpiringDocuments(daysThreshold = 30, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysThreshold);

    const { count, rows } = await Document.findAndCountAll({
      where: {
        expirationDate: {
          [Op.between]: [new Date(), futureDate]
        }
      },
      offset,
      limit,
      order: [['expirationDate', 'ASC']]
    });

    return { total: count, documents: rows, page, limit };
  }

  async getPoliciesByDepartment(department) {
    return await RetentionPolicy.findAll({
      where: { department }
    });
  }

  async getApplicablePolicies(department, category) {
    return await RetentionPolicy.findAll({
      where: {
        [Op.or]: [
          { department },
          { department: 'all' }
        ]
      }
    });
  }
}

module.exports = new RetentionRepository();
