/**
 * Version Control Controller
 * Handles document version history, comparison, and restoration
 */

const getVersions = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { Document, DocumentVersion, User } = req.app.locals.models;

    const document = await Document.findByPk(documentId);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const versions = await DocumentVersion.findAll({
      where: { documentId },
      include: [{ model: User, as: 'editor', attributes: ['id', 'fullName', 'email'] }],
      order: [['versionNumber', 'DESC']]
    });

    res.json({ documentId, versions, total: versions.length });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch versions' });
  }
};

const getVersionById = async (req, res) => {
  try {
    const { documentId, versionId } = req.params;
    const { DocumentVersion, User } = req.app.locals.models;

    const version = await DocumentVersion.findOne({
      where: { id: versionId, documentId },
      include: [{ model: User, as: 'editor', attributes: ['id', 'fullName', 'email'] }]
    });

    if (!version) return res.status(404).json({ error: 'Version not found' });

    res.json(version);
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch version' });
  }
};

const createVersion = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { changeReason, changeType = 'edit' } = req.body;
    const { Document, DocumentVersion, AuditLog } = req.app.locals.models;

    const document = await Document.findByPk(documentId);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    // Get latest version number
    const latestVersion = await DocumentVersion.findOne({
      where: { documentId },
      order: [['versionNumber', 'DESC']]
    });

    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    const version = await DocumentVersion.create({
      documentId,
      versionNumber: nextVersionNumber,
      fileName: req.file?.filename || document.fileName,
      filePath: req.file?.path || document.filePath,
      fileSize: req.file?.size || document.fileSize,
      fileFormat: document.fileFormat,
      changedBy: req.user.id,
      changeReason,
      changeType,
      isActive: true
    });

    // Deactivate previous active version
    if (latestVersion) {
      await latestVersion.update({ isActive: false });
    }

    // Update document's lastModified
    await document.update({
      lastModifiedBy: req.user.id,
      lastModifiedAt: new Date()
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'document_version_created',
      resourceType: 'document',
      resourceId: documentId,
      status: 'success',
      description: `Version ${nextVersionNumber} created for document: ${document.title}`
    });

    res.status(201).json({ message: 'Version created successfully', version });
  } catch (error) {
    console.error('Create version error:', error);
    res.status(500).json({ error: error.message || 'Failed to create version' });
  }
};

const restoreVersion = async (req, res) => {
  try {
    const { documentId, versionId } = req.params;
    const { reason } = req.body;
    const { Document, DocumentVersion, AuditLog } = req.app.locals.models;

    const version = await DocumentVersion.findOne({ where: { id: versionId, documentId } });
    if (!version) return res.status(404).json({ error: 'Version not found' });

    const document = await Document.findByPk(documentId);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    // Deactivate current active version
    await DocumentVersion.update({ isActive: false }, { where: { documentId, isActive: true } });

    // Get next version number for the restore snapshot
    const latestVersion = await DocumentVersion.findOne({
      where: { documentId },
      order: [['versionNumber', 'DESC']]
    });

    // Create a new version entry representing the restore
    const restoredVersion = await DocumentVersion.create({
      documentId,
      versionNumber: latestVersion.versionNumber + 1,
      fileName: version.fileName,
      filePath: version.filePath,
      fileSize: version.fileSize,
      fileFormat: version.fileFormat,
      changedBy: req.user.id,
      changeReason: reason || `Restored from version ${version.versionNumber}`,
      changeType: 'restore',
      isActive: true
    });

    // Update document to reflect restored file
    await document.update({
      fileName: version.fileName,
      filePath: version.filePath,
      fileSize: version.fileSize,
      lastModifiedBy: req.user.id,
      lastModifiedAt: new Date()
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'document_version_restored',
      resourceType: 'document',
      resourceId: documentId,
      status: 'success',
      description: `Document restored to version ${version.versionNumber}`
    });

    res.json({
      message: `Document restored to version ${version.versionNumber}`,
      restoredVersion
    });
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ error: error.message || 'Failed to restore version' });
  }
};

const compareVersions = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { versionA, versionB } = req.query;
    const { DocumentVersion } = req.app.locals.models;

    if (!versionA || !versionB) {
      return res.status(400).json({ error: 'versionA and versionB query params are required' });
    }

    const [verA, verB] = await Promise.all([
      DocumentVersion.findOne({ where: { documentId, versionNumber: parseInt(versionA) } }),
      DocumentVersion.findOne({ where: { documentId, versionNumber: parseInt(versionB) } })
    ]);

    if (!verA || !verB) return res.status(404).json({ error: 'One or both versions not found' });

    res.json({
      documentId,
      comparison: {
        versionA: {
          versionNumber: verA.versionNumber,
          fileName: verA.fileName,
          fileSize: verA.fileSize,
          changedBy: verA.changedBy,
          changeType: verA.changeType,
          changeReason: verA.changeReason,
          createdAt: verA.createdAt
        },
        versionB: {
          versionNumber: verB.versionNumber,
          fileName: verB.fileName,
          fileSize: verB.fileSize,
          changedBy: verB.changedBy,
          changeType: verB.changeType,
          changeReason: verB.changeReason,
          createdAt: verB.createdAt
        },
        differences: {
          fileNameChanged: verA.fileName !== verB.fileName,
          fileSizeChanged: verA.fileSize !== verB.fileSize,
          sizeDelta: verB.fileSize - verA.fileSize
        }
      }
    });
  } catch (error) {
    console.error('Compare versions error:', error);
    res.status(500).json({ error: error.message || 'Failed to compare versions' });
  }
};

module.exports = { getVersions, getVersionById, createVersion, restoreVersion, compareVersions };
