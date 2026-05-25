/**
 * Document Controller
 * Handles document upload, retrieval, and management with real database
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const getStoredFilePath = (document) => {
  const storedPath = document.filePath;
  const originalName = document.metadata?.originalName;
  const storedName = document.metadata?.storedFileName || document.fileName;
  const candidates = [];

  if (storedPath) {
    candidates.push(path.isAbsolute(storedPath) ? storedPath : path.resolve(process.cwd(), storedPath));
    candidates.push(path.resolve(__dirname, '..', storedPath));
    candidates.push(path.resolve(__dirname, '..', '..', storedPath));
  }

  const uploadDirs = [
    path.resolve(__dirname, '..', 'uploads'),
    path.resolve(__dirname, '..', '..', 'uploads'),
    path.resolve(process.cwd(), 'uploads')
  ];

  if (storedName) {
    for (const uploadDir of uploadDirs) {
      candidates.push(path.resolve(uploadDir, storedName));
    }
  }

  if (originalName) {
    for (const uploadDir of uploadDirs) {
      candidates.push(path.resolve(uploadDir, originalName));
    }
  }

  const directHit = candidates.find(candidate => fs.existsSync(candidate));
  if (directHit) return directHit;

  const fileName = document.fileName || originalName || storedName || '';
  const extension = path.extname(fileName).toLowerCase();
  const size = Number(document.fileSize || 0);

  for (const uploadDir of uploadDirs) {
    if (!fs.existsSync(uploadDir)) continue;

    const matches = fs.readdirSync(uploadDir)
      .map(name => path.resolve(uploadDir, name))
      .filter(candidate => {
        const stat = fs.statSync(candidate);
        const sameExt = !extension || path.extname(candidate).toLowerCase() === extension;
        const sameSize = !size || stat.size === size;
        return stat.isFile() && sameExt && sameSize;
      })
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    if (matches.length > 0) {
      return matches[0];
    }
  }

  return null;
};

const userCanAccessDocument = (document, userId, role) => {
  // Admins and auditors see everything; owners only see their own documents.
  if (role === 'administrator' || role === 'auditor') return true;
  // Viewers and document managers only see their own documents
  if (document.uploadedBy === userId) return true;
  const sharing = document.metadata?.sharing || [];
  return JSON.stringify(sharing).includes(userId);
};

const DOCUMENT_STATUSES = ['uploaded', 'in_review', 'in_progress', 'submitted', 'reviewed', 'changes_requested', 'approved', 'rejected'];

const notifyDocumentOwner = async (models, document, status, reason, actorId) => {
  const { Notification, User } = models;
  const [owner, auditor] = await Promise.all([
    document.uploadedBy ? User.findByPk(document.uploadedBy, { attributes: ['id', 'email', 'fullName'] }) : null,
    actorId ? User.findByPk(actorId, { attributes: ['id', 'email', 'fullName'] }) : null,
  ]);
  const recipients = [owner, auditor]
    .filter(Boolean)
    .filter((user, index, all) => all.findIndex(u => u.id === user.id) === index);

  const message = reason
    ? `Document "${document.title}" is now ${status.replace(/_/g, ' ')}. Reason: ${reason}`
    : `Document "${document.title}" is now ${status.replace(/_/g, ' ')}.`;

  // In-app notification
  try {
    await Promise.all(recipients.map(user => Notification.create({
      recipientId: user.id,
      notificationType: 'document_status_update',
      priority: status === 'rejected' || status === 'changes_requested' ? 'high' : 'medium',
      subject: `Document ${status.replace(/_/g, ' ')}`,
      message,
      details: {
        status,
        reason: reason || null,
        updatedBy: actorId,
        recipientRole: user.id === auditor?.id ? 'auditor' : 'document_owner',
      },
      relatedEntityType: 'document',
      relatedEntityId: document.id,
      actionUrl: `/documents?documentId=${document.id}`,
      status: 'unread',
      sentAt: new Date(),
      deliveryStatus: 'sent',
    })));
  } catch(e) { console.warn('Notification create failed:', e.message); }

  // Email notification to document owner and auditor
  try {
    const emailService = require('../services/emailService');
    if (owner?.email) {
      await emailService.sendAuditComplete(
        owner.email,
        owner.fullName || owner.email,
        document.title,
        auditor?.fullName || auditor?.email || 'Auditor',
        status,
        reason || null,
        process.env.PORTAL_URL || 'http://localhost:3000/documents'
      );
    }
    if (auditor?.email && auditor.id !== owner?.id) {
      await emailService.sendEmail({
        to: auditor.email,
        subject: `Audit status sent: "${document.title}" - ${status.replace(/_/g, ' ')}`,
        html: `
          <p>Hi <strong>${auditor.fullName || auditor.email}</strong>,</p>
          <p>Your workflow update for <strong>"${document.title}"</strong> has been sent to the document owner.</p>
          <p>Status: <strong>${status.replace(/_/g, ' ')}</strong></p>
          ${reason ? `<p>Reason: ${reason}</p>` : ''}
        `,
        text: `Hi ${auditor.fullName || auditor.email},\n\nYour workflow update for "${document.title}" has been sent to the document owner.\nStatus: ${status.replace(/_/g, ' ')}\n${reason ? `Reason: ${reason}` : ''}`,
      });
    }
  } catch(e) { console.warn('Audit email notification failed:', e.message); }
};

const extractPreviewText = async (filePath, mimeType) => {
  const ext = path.extname(filePath).toLowerCase();
  const header = fs.readFileSync(filePath).subarray(0, 8).toString('hex');

  if (ext === '.txt' || ext === '.csv' || ext === '.md') {
    return fs.readFileSync(filePath, 'utf8');
  }

  if (ext === '.docx' || (mimeType && mimeType.includes('wordprocessingml'))) {
    if (!header.startsWith('504b')) {
      throw new Error('This file is named DOCX but is not a valid Word document.');
    }
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  }

  if (ext === '.pdf' || (mimeType && mimeType.includes('pdf'))) {
    const { extractPdfText } = require('../services/pdfTextService');
    const text = await extractPdfText(fs.readFileSync(filePath));
    return text || '';
  }

  return '';
};

const getAllDocuments = async (req, res) => {
  try {
    const { category, status, department, page = 1, limit = 10 } = req.query;
    const { Document, User } = req.app.locals.models;
    const userId = req.user?.id;
    const role = req.user?.role || 'viewer';
    const Op = require('sequelize').Op;

    // Build where clause
    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (department) where.department = department;

    // Apply role-based data ownership filters
    if (role === 'viewer' || role === 'document_manager') {
      where[Op.or] = [
        { uploadedBy: userId },
        req.app.locals.sequelize.literal(`"metadata"->>'sharing' LIKE '%${userId}%'`)
      ];
    }

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
    const userId = req.user?.id;
    const role = req.user?.role || 'viewer';

    const document = await Document.findByPk(id, {
      include: [{ model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }]
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!userCanAccessDocument(document, userId, role)) {
      return res.status(403).json({ error: 'Access denied to this document' });
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

    const resolvedPath = req.file?.path ? path.resolve(req.file.path) : '';
    let extractedText = null;
    if (resolvedPath) {
      try {
        const { extractTextFromFile } = require('../services/pdfTextService');
        extractedText = await extractTextFromFile(resolvedPath, req.file.mimetype);
      } catch (extractErr) {
        console.warn('Upload text extraction failed:', extractErr.message);
      }
    }

    // Create document record (extract PDF body on upload — audit does not use file name)
    const document = await Document.create({
      id: uuidv4(),
      title,
      description,
      fileName: req.file?.originalname || req.file?.filename || 'uploaded_file',
      filePath: resolvedPath,
      fileSize: req.file?.size || 0,
      fileFormat: req.file?.originalname ? path.extname(req.file.originalname).replace('.', '').toUpperCase() : 'FILE',
      mimeType: req.file?.mimetype || 'application/pdf',
      category,
      department,
      classificationLevel: classificationLevel || 'internal',
      status: 'in_review',
      uploadedBy: validUserId,
      uploadedAt: new Date(),
      extractedText: extractedText ? extractedText.slice(0, 10000) : null,
      ocrProcessed: Boolean(extractedText),
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      metadata: {
        originalName: req.file?.originalname || 'file',
        storedFileName: req.file?.filename || null,
        uploadedFrom: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        textExtractedOnUpload: Boolean(extractedText),
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
    const role = req.user?.role || 'viewer';
    const userId = req.user?.id;

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (!userCanAccessDocument(document, userId, role)) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }

    // Update fields
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (status !== undefined) {
      if (role !== 'auditor') {
        return res.status(403).json({ error: 'Only auditors can update audit status.' });
      }
      if (!DOCUMENT_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Use one of: ${DOCUMENT_STATUSES.join(', ')}` });
      }
      updates.status = status;
    }
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
    const role = req.user?.role || 'viewer';
    const userId = req.user?.id;

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!userCanAccessDocument(document, userId, role)) {
      return res.status(403).json({ error: 'You do not have permission to delete this document' });
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

const reuploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { Document, AuditLog } = req.app.locals.models;
    const role = req.user?.role || 'viewer';
    const userId = req.user?.id;

    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (!userCanAccessDocument(document, userId, role)) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }
    if (!['rejected', 'changes_requested'].includes(document.status)) {
      return res.status(400).json({ error: 'Re-upload is only available for rejected documents or change requests.' });
    }
    if (!req.file) return res.status(400).json({ error: 'Replacement file is required' });

    const priorUploads = Array.isArray(document.metadata?.reuploads) ? document.metadata.reuploads : [];
    const newPath = path.resolve(req.file.path);
    let reExtracted = null;
    try {
      const { extractTextFromFile } = require('../services/pdfTextService');
      reExtracted = await extractTextFromFile(newPath, req.file.mimetype);
    } catch (e) {
      console.warn('Re-upload extraction failed:', e.message);
    }

    await document.update({
      fileName: req.file.originalname || req.file.filename,
      filePath: newPath,
      fileSize: req.file.size,
      fileFormat: path.extname(req.file.originalname || '').replace('.', '').toUpperCase() || document.fileFormat,
      mimeType: req.file.mimetype || document.mimeType,
      status: 'in_review',
      ocrProcessed: Boolean(reExtracted),
      extractedText: reExtracted ? reExtracted.slice(0, 10000) : null,
      metadata: {
        ...(document.metadata || {}),
        statusReason: null,
        latestAuditDecision: null,
        latestAuditSummary: null,
        latestComplianceScore: null,
        latestAiGeneratedPercentage: null,
        reuploads: [
          ...priorUploads,
          {
            fileName: req.file.originalname,
            storedFileName: req.file.filename,
            uploadedBy: userId,
            uploadedAt: new Date(),
          },
        ],
      },
      lastModifiedBy: userId,
      lastModifiedAt: new Date(),
    });

    await AuditLog.create({
      userId,
      action: 'document_reuploaded',
      description: `Document "${document.title}" was re-uploaded for review`,
      resourceType: 'document',
      resourceId: id,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ message: 'Document re-uploaded and sent back for review', document });
  } catch (error) {
    console.error('Re-upload document error:', error);
    res.status(500).json({ error: error.message || 'Re-upload failed' });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { Document, AuditLog } = req.app.locals.models;
    const userId = req.user?.id;
    const role = req.user?.role || 'viewer';

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!userCanAccessDocument(document, userId, role)) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }

    const filePath = getStoredFilePath(document);
    if (!filePath) {
      return res.status(404).json({ error: 'Physical file not found on disk' });
    }

    // Log access
    await AuditLog.create({
      userId: userId || 'system',
      action: 'document_download',
      resourceType: 'document',
      resourceId: id,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    const safeName = (document.fileName || 'document').replace(/"/g, '');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Download document error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Download failed' });
    }
  }
};

const updateDocumentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason = '', reportId = null } = req.body;
    const { Document, AuditLog } = req.app.locals.models;
    const role = req.user?.role || 'viewer';

    if (role !== 'auditor') {
      return res.status(403).json({ error: 'Only auditors can update document progress.' });
    }

    if (!DOCUMENT_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Use one of: ${DOCUMENT_STATUSES.join(', ')}` });
    }

    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const statusHistory = Array.isArray(document.metadata?.statusHistory)
      ? document.metadata.statusHistory
      : [];
    const metadata = {
      ...(document.metadata || {}),
      statusReason: reason || null,
      latestAuditReportId: reportId,
      latestAuditDecision: {
        status,
        reason: reason || null,
        updatedBy: req.user.id,
        updatedAt: new Date(),
      },
      statusHistory: [
        ...statusHistory,
        { status, reason: reason || null, reportId, changedBy: req.user.id, changedAt: new Date() }
      ],
    };

    await document.update({
      status,
      metadata,
      lastModifiedBy: req.user.id,
      lastModifiedAt: new Date(),
    });

    await notifyDocumentOwner(req.app.locals.models, document, status, reason, req.user.id);

    await AuditLog.create({
      userId: req.user.id,
      action: 'document_status_update',
      description: `Document "${document.title}" status changed to ${status}${reason ? `: ${reason}` : ''}`,
      resourceType: 'document',
      resourceId: id,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ message: 'Document status updated', document });
  } catch (error) {
    console.error('Update document status error:', error);
    res.status(500).json({ error: error.message || 'Status update failed' });
  }
};

const previewDocumentText = async (req, res) => {
  try {
    const { id } = req.params;
    const { Document } = req.app.locals.models;
    const userId = req.user?.id;
    const role = req.user?.role || 'viewer';

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!userCanAccessDocument(document, userId, role)) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }

    const filePath = getStoredFilePath(document);
    if (!filePath) {
      return res.status(404).json({
        error: 'Physical file not found on disk',
        details: {
          fileName: document.fileName,
          filePath: document.filePath,
          storedFileName: document.metadata?.storedFileName || null
        }
      });
    }

    const text = await extractPreviewText(filePath, document.mimeType);
    if (!text.trim()) {
      return res.status(415).json({ error: 'Text preview is not available for this file type' });
    }

    if (!document.extractedText) {
      await document.update({ extractedText: text.slice(0, 10000), ocrProcessed: true });
    }

    res.json({
      documentId: id,
      fileName: document.fileName,
      text: text.slice(0, 200000)
    });
  } catch (error) {
    console.error('Preview document error:', error);
    res.status(500).json({ error: error.message || 'Preview failed' });
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
    if (!userCanAccessDocument(document, req.user?.id, req.user?.role || 'viewer')) {
      return res.status(403).json({ error: 'Access denied to this document' });
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
    const { AuditLog, Document } = req.app.locals.models;
    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (!userCanAccessDocument(document, req.user?.id, req.user?.role || 'viewer')) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }

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
          fileName: file.originalname,
          filePath: path.resolve(file.path),
          fileSize: file.size,
          fileFormat: file.originalname.split('.').pop().toUpperCase(),
          mimeType: file.mimetype,
          category,
          department,
          status: 'in_review',
          uploadedBy: userId,
          metadata: {
            originalName: file.originalname,
            storedFileName: file.filename
          }
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
  reuploadDocument,
  updateDocumentStatus,
  deleteDocument,
  downloadDocument,
  previewDocumentText,
  shareDocument,
  getAccessLogs,
  bulkUpload
};
