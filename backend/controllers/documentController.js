/**
 * Document Controller
 * Handles document upload, retrieval, and management with real database
 */

const { v4: uuidv4 } = require('uuid');

const getAllDocuments = async (req, res) => {
  try {
    const { category, status, department, page = 1, limit = 10 } = req.query;
    const { Document, User } = req.app.locals.models;

    // Build where clause
    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (department) where.department = department;

    // Fetch with pagination
    const { count, rows } = await Document.findAndCountAll({
      where,
      include: [{ model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      documents: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch documents' });
  }
};

const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { Document, User } = req.app.locals.models;

    const document = await Document.findByPk(id, {
      include: [{ model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }]
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch document' });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const { title, description, category, department, classificationLevel, tags } = req.body;
    const { Document } = req.app.locals.models;
    const userId = req.user?.id || null;

    // Verify user exists before using as FK — fall back to null if not found
    let validUserId = null;
    if (userId) {
      const { User } = req.app.locals.models;
      const userExists = await User.findByPk(userId);
      validUserId = userExists ? userId : null;
    }

    if (!title || !category || !department) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, category, department' 
      });
    }

    // Create document record
    const document = await Document.create({
      id: uuidv4(),
      title,
      description,
      fileName: req.file?.filename || 'uploaded_file',
      filePath: req.file?.path || `/uploads/${req.file?.filename}`,
      fileSize: req.file?.size || 0,
      fileFormat: (req.file?.mimetype || 'PDF').split('/')[1].toUpperCase(),
      mimeType: req.file?.mimetype || 'application/pdf',
      category,
      department,
      classificationLevel: classificationLevel || 'internal',
      status: 'uploaded',
      uploadedBy: validUserId,
      uploadedAt: new Date(),
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      metadata: {
        originalName: req.file?.originalname || 'file',
        uploadedFrom: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      }
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
};

const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, status, tags, classificationLevel } = req.body;
    const { Document } = req.app.locals.models;

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update fields
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (status !== undefined) updates.status = status;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    if (classificationLevel !== undefined) updates.classificationLevel = classificationLevel;
    updates.lastModifiedAt = new Date();
    updates.lastModifiedBy = req.user?.id || 'system';

    await document.update(updates);

    res.json({
      message: 'Document updated successfully',
      document
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: error.message || 'Update failed' });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { Document } = req.app.locals.models;
    const permanent = req.query.permanent === 'true';

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (permanent) {
      // Hard delete
      await document.destroy({ force: true });
    } else {
      // Soft delete
      await document.destroy();
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: error.message || 'Deletion failed' });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { Document, AuditLog } = req.app.locals.models;

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Log access
    await AuditLog.create({
      userId: req.user?.id || 'system',
      action: 'document_download',
      resourceType: 'document',
      resourceId: id,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // In production, send file with res.download()
    res.json({
      message: 'Document ready for download',
      downloadUrl: `/api/documents/${id}/file`,
      fileName: document.fileName
    });
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: error.message || 'Download failed' });
  }
};

const shareDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientUsers, recipientEmails, accessLevel, expiryDate } = req.body;
    const { Document } = req.app.locals.models;

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Store sharing info in metadata (or create separate table in production)
    const currentSharing = document.metadata?.sharing || [];
    currentSharing.push({
      users: recipientUsers || [],
      emails: recipientEmails || [],
      accessLevel: accessLevel || 'view',
      expiryDate: expiryDate || null,
      sharedAt: new Date(),
      sharedBy: req.user?.id
    });

    await document.update({
      metadata: { ...document.metadata, sharing: currentSharing }
    });

    res.json({
      message: 'Document shared successfully',
      sharedWith: [...(recipientUsers || []), ...(recipientEmails || [])],
      accessLevel
    });
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({ error: error.message || 'Sharing failed' });
  }
};

const getAccessLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { AuditLog } = req.app.locals.models;

    const logs = await AuditLog.findAll({
      where: {
        resourceType: 'document',
        resourceId: id
      },
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    res.json({
      documentId: id,
      accessLogs: logs,
      total: logs.length
    });
  } catch (error) {
    console.error('Get access logs error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch logs' });
  }
};

const bulkUpload = async (req, res) => {
  try {
    const files = req.files || [];
    const { category, department } = req.body;
    const { Document } = req.app.locals.models;
    const userId = req.user?.id || 'system';

    if (!category || !department) {
      return res.status(400).json({ error: 'Category and department required' });
    }

    const uploadedDocs = [];
    const failedUploads = [];

    for (const file of files) {
      try {
        const doc = await Document.create({
          id: uuidv4(),
          title: file.originalname.replace(/\.[^/.]+$/, ''),
          fileName: file.filename,
          filePath: file.path,
          fileSize: file.size,
          fileFormat: file.originalname.split('.').pop().toUpperCase(),
          mimeType: file.mimetype,
          category,
          department,
          status: 'uploaded',
          uploadedBy: userId
        });
        uploadedDocs.push(doc);
      } catch (err) {
        failedUploads.push({ file: file.filename, error: err.message });
      }
    }

    res.json({
      message: `${uploadedDocs.length} of ${files.length} documents uploaded successfully`,
      uploadedCount: uploadedDocs.length,
      failedCount: failedUploads.length,
      documents: uploadedDocs,
      failures: failedUploads
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: error.message || 'Bulk upload failed' });
  }
};

module.exports = {
  getAllDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  shareDocument,
  getAccessLogs,
  bulkUpload
};
