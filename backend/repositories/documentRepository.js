/**
 * Document Repository
 * Data access layer for Document model
 */

const db = require('../db/models');
const { Document, DocumentVersion, AuditLog } = db;
const { Op } = require('sequelize');

class DocumentRepository {
  async findById(documentId) {
    return await Document.findByPk(documentId);
  }

  async findAll(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const where = {};

    if (filters.classification) where.classificationLevel = filters.classification;
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.department) where.department = filters.department;

    const { count, rows } = await Document.findAndCountAll({
      where,
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    return { total: count, documents: rows, page, limit };
  }

  async create(documentData) {
    return await Document.create(documentData);
  }

  async update(documentId, updates) {
    const document = await Document.findByPk(documentId);
    if (!document) return null;
    return await document.update(updates);
  }

  async delete(documentId, softDelete = true) {
    if (softDelete) {
      return await Document.update(
        { deletedAt: new Date() },
        { where: { id: documentId } }
      );
    }
    return await Document.destroy({ where: { id: documentId } });
  }

  async findByTitle(title) {
    return await Document.findAll({
      where: {
        title: {
          [Op.iLike]: `%${title}%`
        }
      }
    });
  }

  async findByFileHash(fileHash) {
    return await Document.findOne({ where: { fileHash } });
  }

  async getDocumentWithVersions(documentId) {
    return await Document.findByPk(documentId, {
      include: [{ model: DocumentVersion, as: 'versions' }]
    });
  }

  async getAccessLogs(documentId) {
    return await AuditLog.findAll({
      where: { resourceId: documentId },
      order: [['createdAt', 'DESC']]
    });
  }

  async updateStatus(documentId, status) {
    return await Document.update(
      { status },
      { where: { id: documentId } }
    );
  }

  async shareDocument(documentId, sharedWithIds, permission) {
    const document = await Document.findByPk(documentId);
    if (!document) return null;
    
    const sharingMetadata = document.sharingMetadata || {};
    sharedWithIds.forEach(userId => {
      sharingMetadata[userId] = {
        permission,
        sharedAt: new Date()
      };
    });
    
    return await document.update({ sharingMetadata });
  }

  async searchByFullText(query, filters = {}) {
    const where = {
      [Op.or]: [
        { title: { [Op.iLike]: `%${query}%` } },
        { fileName: { [Op.iLike]: `%${query}%` } },
        { extractedText: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (filters.classification) {
      where.classificationLevel = filters.classification;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    return await Document.findAll({ where });
  }

  async getExpiringDocuments(daysThreshold = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysThreshold);

    return await Document.findAll({
      where: {
        expirationDate: {
          [Op.between]: [new Date(), futureDate]
        }
      }
    });
  }

  async getByCategoryAndDepartment(category, department) {
    return await Document.findAll({
      where: {
        category,
        department
      }
    });
  }
}

module.exports = new DocumentRepository();
