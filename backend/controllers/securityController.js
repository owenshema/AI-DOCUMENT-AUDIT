/**
 * Security Controller - Module 11
 * Manages document-level security: classification, access control, encryption, watermarking
 */

const getDocumentSecurity = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { Document, Security } = req.app.locals.models;

    const document = await Document.findByPk(documentId);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    let security = await Security.findOne({ where: { documentId } });

    if (!security) {
      // Auto-create default security record
      security = await Security.create({
        documentId,
        classificationLevel: document.classificationLevel || 'internal'
      });
    }

    res.json(security);
  } catch (error) {
    console.error('Get document security error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch security settings' });
  }
};

const updateClassification = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { classificationLevel, reason } = req.body;
    const { Document, Security, AuditLog } = req.app.locals.models;

    const validLevels = ['public', 'internal', 'confidential', 'restricted', 'top_secret'];
    if (!validLevels.includes(classificationLevel)) {
      return res.status(400).json({ error: `Invalid classification level. Must be one of: ${validLevels.join(', ')}` });
    }

    const document = await Document.findByPk(documentId);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const [security] = await Security.findOrCreate({
      where: { documentId },
      defaults: { documentId, classificationLevel }
    });

    const previousLevel = security.classificationLevel;
    await security.update({ classificationLevel });
    await document.update({ classificationLevel });

    await AuditLog.create({
      userId: req.user.id,
      action: 'document_reclassified',
      resourceType: 'document',
      resourceId: documentId,
      status: 'success',
      description: `Classification changed from ${previousLevel} to ${classificationLevel}. Reason: ${reason || 'not provided'}`
    });

    res.json({ message: 'Classification updated', documentId, classificationLevel });
  } catch (error) {
    console.error('Update classification error:', error);
    res.status(500).json({ error: error.message || 'Failed to update classification' });
  }
};

const updateAccessControl = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { accessControl } = req.body;
    const { Security, AuditLog } = req.app.locals.models;

    if (!accessControl || typeof accessControl !== 'object') {
      return res.status(400).json({ error: 'accessControl object is required' });
    }

    const [security] = await Security.findOrCreate({
      where: { documentId },
      defaults: { documentId }
    });

    await security.update({ accessControl });

    await AuditLog.create({
      userId: req.user.id,
      action: 'access_control_updated',
      resourceType: 'document',
      resourceId: documentId,
      status: 'success',
      description: `Access control matrix updated for document`
    });

    res.json({ message: 'Access control updated', documentId, accessControl });
  } catch (error) {
    console.error('Update access control error:', error);
    res.status(500).json({ error: error.message || 'Failed to update access control' });
  }
};

const configureWatermark = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { watermarkRequired, watermarkText } = req.body;
    const { Security } = req.app.locals.models;

    const [security] = await Security.findOrCreate({
      where: { documentId },
      defaults: { documentId }
    });

    await security.update({ watermarkRequired: !!watermarkRequired, watermarkText });

    res.json({ message: 'Watermark configuration updated', documentId, watermarkRequired, watermarkText });
  } catch (error) {
    console.error('Configure watermark error:', error);
    res.status(500).json({ error: error.message || 'Failed to configure watermark' });
  }
};

const updatePermissions = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { downloadAllowed, printAllowed, copyAllowed, externalSharingAllowed } = req.body;
    const { Security, AuditLog } = req.app.locals.models;

    const [security] = await Security.findOrCreate({
      where: { documentId },
      defaults: { documentId }
    });

    const updates = {};
    if (downloadAllowed !== undefined) updates.downloadAllowed = downloadAllowed;
    if (printAllowed !== undefined) updates.printAllowed = printAllowed;
    if (copyAllowed !== undefined) updates.copyAllowed = copyAllowed;
    if (externalSharingAllowed !== undefined) updates.externalSharingAllowed = externalSharingAllowed;

    await security.update(updates);

    await AuditLog.create({
      userId: req.user.id,
      action: 'document_permissions_updated',
      resourceType: 'document',
      resourceId: documentId,
      status: 'success',
      description: `Document permissions updated`
    });

    res.json({ message: 'Permissions updated', documentId, ...updates });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ error: error.message || 'Failed to update permissions' });
  }
};

const setEncryption = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { encryptionStatus, encryptionAlgorithm } = req.body;
    const { Security, AuditLog } = req.app.locals.models;

    const validStatuses = ['unencrypted', 'encrypted', 'key_encrypted'];
    if (!validStatuses.includes(encryptionStatus)) {
      return res.status(400).json({ error: `Invalid encryptionStatus. Must be one of: ${validStatuses.join(', ')}` });
    }

    const [security] = await Security.findOrCreate({
      where: { documentId },
      defaults: { documentId }
    });

    await security.update({
      encryptionStatus,
      encryptionAlgorithm: encryptionAlgorithm || 'AES-256',
      encryptedAt: encryptionStatus !== 'unencrypted' ? new Date() : null,
      encryptedBy: encryptionStatus !== 'unencrypted' ? req.user.id : null
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'document_encryption_updated',
      resourceType: 'document',
      resourceId: documentId,
      status: 'success',
      description: `Encryption status set to: ${encryptionStatus}`
    });

    res.json({ message: 'Encryption settings updated', documentId, encryptionStatus });
  } catch (error) {
    console.error('Set encryption error:', error);
    res.status(500).json({ error: error.message || 'Failed to update encryption' });
  }
};

const getSecurityAuditTrail = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { AuditLog } = req.app.locals.models;

    const securityActions = [
      'document_reclassified', 'access_control_updated', 'document_permissions_updated',
      'document_encryption_updated', 'document_downloaded', 'document_shared'
    ];

    const logs = await AuditLog.findAll({
      where: {
        resourceId: documentId,
        action: { [require('sequelize').Op.in]: securityActions }
      },
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    res.json({ documentId, securityEvents: logs, total: logs.length });
  } catch (error) {
    console.error('Get security audit trail error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch security trail' });
  }
};

module.exports = {
  getDocumentSecurity,
  updateClassification,
  updateAccessControl,
  configureWatermark,
  updatePermissions,
  setEncryption,
  getSecurityAuditTrail
};
