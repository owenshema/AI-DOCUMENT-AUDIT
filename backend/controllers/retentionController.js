/**
 * Retention & Archival Controller
 * Handles document retention policies and archival with database
 */

const createRetentionPolicy = async (req, res) => {
  try {
    const { name, description, policyType, documentTypes, retentionDays, automationRules } = req.body;
    const { RetentionPolicy } = req.app.locals.models;

    if (!name || !documentTypes || !retentionDays) {
      return res.status(400).json({ error: 'name, documentTypes, and retentionDays are required' });
    }

    const policy = await RetentionPolicy.create({
      policyName: name,
      name,
      description,
      policyType: policyType || 'operational',
      applicableDocumentTypes: Array.isArray(documentTypes) ? documentTypes : [documentTypes],
      documentTypes: Array.isArray(documentTypes) ? documentTypes : [documentTypes],
      retentionPeriod: parseInt(retentionDays),
      effectiveDate: new Date(),
      retentionDays: parseInt(retentionDays),
      automationRules: automationRules || {},
      status: 'active',
      createdBy: req.user?.id
    });

    res.status(201).json({
      message: 'Retention policy created successfully',
      policy
    });
  } catch (error) {
    console.error('Create retention policy error:', error);
    res.status(500).json({ error: error.message || 'Failed to create policy' });
  }
};

const getRetentionPolicies = async (req, res) => {
  try {
    const { status = 'active', limit = 20, page = 1 } = req.query;
    const { RetentionPolicy } = req.app.locals.models;

    const where = {};
    if (status) where.status = status;

    const { count, rows } = await RetentionPolicy.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      policies: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get retention policies error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch policies' });
  }
};

const archiveDocument = async (req, res) => {
  try {
    const { documentIds, reason = 'retention_policy' } = req.body;
    const { Document, AuditLog } = req.app.locals.models;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'documentIds array is required' });
    }

    const results = [];

    for (const docId of documentIds) {
      try {
        const document = await Document.findByPk(docId);
        if (document) {
          await document.update({
            status: 'archived',
            archivedAt: new Date(),
            archiveReason: reason
          });

          // Log archival
          await AuditLog.create({
            userId: req.user?.id,
            action: 'DOCUMENT_ARCHIVED',
            description: `Document archived: ${document.fileName}`,
            resourceType: 'Document',
            resourceId: docId,
            status: 'success'
          });

          results.push({ documentId: docId, status: 'success' });
        }
      } catch (error) {
        results.push({ documentId: docId, status: 'error', error: error.message });
      }
    }

    res.json({
      message: 'Document archival completed',
      results,
      archivedCount: results.filter(r => r.status === 'success').length
    });
  } catch (error) {
    console.error('Archive document error:', error);
    res.status(500).json({ error: error.message || 'Failed to archive documents' });
  }
};

const getArchivedDocuments = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const { Document } = req.app.locals.models;

    const { count, rows } = await Document.findAndCountAll({
      where: { status: 'archived' },
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['archivedAt', 'DESC']]
    });

    res.json({
      documents: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get archived documents error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch archived documents' });
  }
};

const restoreArchivedDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { reason } = req.body;
    const { Document, AuditLog } = req.app.locals.models;

    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.status !== 'archived') {
      return res.status(400).json({ error: 'Document is not archived' });
    }

    await document.update({
      status: 'approved',
      archivedAt: null,
      archiveReason: null
    });

    // Log restoration
    await AuditLog.create({
      userId: req.user?.id,
      action: 'DOCUMENT_RESTORED',
      description: `Document restored: ${document.fileName}. Reason: ${reason}`,
      resourceType: 'Document',
      resourceId: documentId,
      status: 'success'
    });

    res.json({
      message: 'Document restored successfully',
      document
    });
  } catch (error) {
    console.error('Restore archived document error:', error);
    res.status(500).json({ error: error.message || 'Failed to restore document' });
  }
};

const requestArchiveAccess = async (req, res) => {
  try {
    const { documentId, reason, duration } = req.body;
    const { Document, Task } = req.app.locals.models;

    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Create access request task
    const accessTask = await Task.create({
      title: `Archive Access Request: ${document.fileName}`,
      description: `Reason: ${reason}. Duration requested: ${duration} hours`,
      priority: 'high',
      category: 'archive_access',
      status: 'pending',
      assignedTo: req.user?.id,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    res.json({
      message: 'Archive access request submitted',
      requestId: accessTask.id,
      status: 'pending_approval'
    });
  } catch (error) {
    console.error('Request archive access error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit access request' });
  }
};

const setLegalHold = async (req, res) => {
  try {
    const { documentIds, reason, holdEndDate } = req.body;
    const { Document, AuditLog } = req.app.locals.models;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'documentIds array is required' });
    }

    const results = [];

    for (const docId of documentIds) {
      try {
        const document = await Document.findByPk(docId);
        if (document) {
          await document.update({
            legalHoldActive: true,
            legalHoldReason: reason,
            legalHoldEndDate: holdEndDate ? new Date(holdEndDate) : null
          });

          // Log legal hold
          await AuditLog.create({
            userId: req.user?.id,
            action: 'LEGAL_HOLD_SET',
            description: `Legal hold placed on document: ${document.fileName}`,
            resourceType: 'Document',
            resourceId: docId,
            status: 'success'
          });

          results.push({ documentId: docId, status: 'success' });
        }
      } catch (error) {
        results.push({ documentId: docId, status: 'error', error: error.message });
      }
    }

    res.json({
      message: 'Legal holds applied successfully',
      results,
      holdCount: results.filter(r => r.status === 'success').length
    });
  } catch (error) {
    console.error('Set legal hold error:', error);
    res.status(500).json({ error: error.message || 'Failed to set legal hold' });
  }
};

const getExpiringDocuments = async (req, res) => {
  try {
    const { daysUntilExpiry = 30, limit = 20, page = 1 } = req.query;
    const { Document, RetentionPolicy } = req.app.locals.models;
    const Op = require('sequelize').Op;

    const expiryDate = new Date(Date.now() + parseInt(daysUntilExpiry) * 24 * 60 * 60 * 1000);

    const { count, rows } = await Document.findAndCountAll({
      where: {
        status: { [Op.ne]: 'archived' },
        createdAt: {
          [Op.lte]: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // older than 1 year
        }
      },
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'ASC']]
    });

    const documents = rows.map(doc => ({
      ...doc.dataValues,
      expiryDate: new Date(doc.createdAt.getTime() + 365 * 24 * 60 * 60 * 1000),
      daysUntilExpiry: Math.max(0, daysUntilExpiry - 365)
    }));

    res.json({
      documents,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      daysUntilExpiry: parseInt(daysUntilExpiry)
    });
  } catch (error) {
    console.error('Get expiring documents error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch expiring documents' });
  }
};

module.exports = {
  createRetentionPolicy,
  getRetentionPolicies,
  archiveDocument,
  getArchivedDocuments,
  restoreArchivedDocument,
  requestArchiveAccess,
  setLegalHold,
  getExpiringDocuments
};
