/**
 * Document Controller
 * Handles document upload, retrieval, and management with real database
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { documentWhereForUser, userOwnsDocument } = require('../utils/ownerScope');
const {
  AUDIT_PENDING_STATUSES,
  AUDIT_DONE_STATUSES,
  documentHasAuditorReview,
  documentNeedsAudit,
} = require('../utils/documentAudit');

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

const userCanAccessDocument = (document, userId, role) => userOwnsDocument(document, userId, role);

const parseBool = (value) => value === true || value === 'true' || value === '1';

const DOCUMENT_STATUSES = ['uploaded', 'in_review', 'in_progress', 'submitted', 'reviewed', 'changes_requested', 'approved', 'rejected'];

const enrichDocumentManagement = (document) => {
  const meta = document.metadata || {};
  const plain = document.toJSON ? document.toJSON() : document;
  return {
    ...plain,
    auditState: documentNeedsAudit(plain) ? 'needs_audit' : documentHasAuditorReview(plain) ? 'audited' : 'pending',
    neverAudited: !documentHasAuditorReview(plain),
    isUrgent: Boolean(meta.isUrgent),
    arrivalPort: meta.arrivalPort || null,
    lastAuditRequestAt: meta.lastAuditRequestAt || null,
  };
};

/**
 * Notify every active auditor that a freshly uploaded/re-uploaded document needs an audit.
 * Each auditor gets an in-app notification (and email) tagged so it can be cleared once audited.
 */
const notifyAuditorsNeedAudit = async (models, document, actorId, options = {}) => {
  const { Notification, User } = models;
  const {
    urgent = false,
    port = null,
    note = null,
    requestedByName = null,
  } = options;

  try {
    const [auditors, uploader, requester] = await Promise.all([
      User.findAll({
        where: { role: 'auditor', isActive: true, approvalStatus: 'approved' },
        attributes: ['id', 'email', 'fullName'],
      }),
      actorId ? User.findByPk(actorId, { attributes: ['id', 'fullName', 'email'] }) : null,
      requestedByName ? null : (actorId ? User.findByPk(actorId, { attributes: ['fullName', 'email'] }) : null),
    ]);
    if (!auditors.length) return { notified: 0 };

    const uploaderName = uploader?.fullName || uploader?.email || 'A user';
    const managerName = requestedByName || requester?.fullName || uploaderName;
    const meta = document.metadata || {};
    const isUrgent = urgent || meta.isUrgent;
    const arrivalPort = port || meta.arrivalPort || null;

    let message = `Document "${document.title}" has not been audited yet. Please complete the audit.`;
    if (isUrgent) message = `URGENT: Document "${document.title}" needs audit immediately.`;
    if (arrivalPort) message += ` Document arrived at port ${arrivalPort}.`;
    if (note) message += ` ${note}`;
    message += ` Requested by ${managerName}.`;

    const priority = isUrgent ? 'critical' : 'high';
    const subject = isUrgent
      ? `URGENT audit required: "${document.title}"`
      : `Document needs audit: "${document.title}"`;

    await Promise.all(auditors.map(auditor => Notification.create({
      recipientId: auditor.id,
      notificationType: 'document_needs_audit',
      priority,
      subject,
      message,
      details: {
        documentId: document.id,
        documentTitle: document.title,
        uploadedBy: document.uploadedBy || actorId || null,
        uploaderName,
        requestedBy: actorId || null,
        requestedByName: managerName,
        urgent: isUrgent,
        arrivalPort,
        note: note || null,
      },
      relatedEntityType: 'document',
      relatedEntityId: document.id,
      actionUrl: `/ai-analysis?documentId=${document.id}`,
      status: 'unread',
      sentAt: new Date(),
      deliveryStatus: 'sent',
    })));

    try {
      const emailService = require('../services/emailService');
      const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000/ai-analysis';
      await Promise.all(auditors.filter(a => a.email).map(auditor => emailService.sendEmail({
        to: auditor.email,
        subject,
        html: `<p>Hi <strong>${auditor.fullName || auditor.email}</strong>,</p><p>${message}</p><p><a href="${portalUrl}">Open the audit portal</a></p>`,
        text: `${message}\nOpen the audit portal: ${portalUrl}`,
      }).catch(() => {})));
    } catch (e) { console.warn('Auditor email notification failed:', e.message); }

    return { notified: auditors.length };
  } catch (e) {
    console.warn('Notify auditors (needs audit) failed:', e.message);
    return { notified: 0, error: e.message };
  }
};

/**
 * Clear the "needs audit" notifications for a document once it has been audited,
 * so it disappears from every auditor's needs-audit queue.
 */
const resolveNeedsAuditNotifications = async (models, documentId) => {
  const { Notification } = models;
  try {
    await Notification.update(
      { status: 'archived', archivedAt: new Date() },
      {
        where: {
          notificationType: 'document_needs_audit',
          relatedEntityId: documentId,
          status: ['unread', 'read'],
        },
      }
    );
  } catch (e) {
    console.warn('Resolve needs-audit notifications failed:', e.message);
  }
};

const notifyDocumentOwner = async (models, document, status, reason, actorId) => {
  const { Notification, User } = models;
  const [owner, auditor] = await Promise.all([
    document.uploadedBy ? User.findByPk(document.uploadedBy, { attributes: ['id', 'email', 'fullName'] }) : null,
    actorId ? User.findByPk(actorId, { attributes: ['id', 'email', 'fullName'] }) : null,
  ]);
  const recipients = [owner, auditor]
    .filter(Boolean)
    .filter((user, index, all) => all.findIndex(u => u.id === user.id) === index);

  const message =
    `Document "${document.title}" has been updated. Log in to the portal to view the status and full analysis.`;

  // In-app notification
  try {
    await Promise.all(recipients.map(user => Notification.create({
      recipientId: user.id,
      notificationType: 'document_status_update',
      priority: status === 'rejected' || status === 'changes_requested' ? 'high' : 'medium',
      subject: `Document updated: ${document.title}`,
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
        subject: `Document updated: "${document.title}"`,
        html: `
          <p>Hi <strong>${auditor.fullName || auditor.email}</strong>,</p>
          <p>Your update for <strong>"${document.title}"</strong> has been sent to the document owner.</p>
          <p>Log in to the portal to view the status and full analysis.</p>
        `,
        text: `Hi ${auditor.fullName || auditor.email},\n\nYour update for "${document.title}" has been sent to the document owner.\n\nLog in to the portal to view the status and full analysis.`,
      });
    }
  } catch(e) { console.warn('Audit email notification failed:', e.message); }
};

const extractPreviewText = async (filePath, mimeType) => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.docx' || (mimeType && mimeType.includes('wordprocessingml'))) {
    const header = fs.readFileSync(filePath).subarray(0, 8).toString('hex');
    if (!header.startsWith('504b')) {
      throw new Error('This file is named DOCX but is not a valid Word document.');
    }
  }

  const { extractTextFromFile } = require('../services/pdfTextService');
  const text = await extractTextFromFile(filePath, mimeType);
  return text || '';
};

const getAllDocuments = async (req, res) => {
  try {
    const { category, status, department, auditState, page = 1, limit = 10 } = req.query;
    const { Document, User } = req.app.locals.models;
    const userId = req.user?.id;
    const role = req.user?.role || 'client';
    const Op = require('sequelize').Op;

    // Build where clause
    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (department) where.department = department;

    const staffAuditFilter = auditState && ['auditor', 'administrator', 'document_manager'].includes(role)
      ? auditState
      : null;

    Object.assign(where, documentWhereForUser({ id: userId, role }));

    const allRows = await Document.findAll({
      where,
      include: [{ model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }],
      order: [['createdAt', 'DESC']],
    });

    let filteredRows = allRows;
    if (staffAuditFilter === 'needs_audit') {
      filteredRows = allRows.filter(doc => documentNeedsAudit(doc.toJSON ? doc.toJSON() : doc));
    } else if (staffAuditFilter === 'audited') {
      filteredRows = allRows.filter(doc => documentHasAuditorReview(doc.toJSON ? doc.toJSON() : doc));
    }

    const count = filteredRows.length;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const rows = filteredRows.slice(offset, offset + parseInt(limit, 10));

    res.json({
      documents: rows.map(enrichDocumentManagement),
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(count / parseInt(limit, 10)),
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
    const role = req.user?.role || 'client';

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
    const { title, description, category, department, classificationLevel, tags, isUrgent } = req.body;
    const { Document } = req.app.locals.models;
    const userId = req.user?.id || null;

    // Verify user exists before using as FK — fall back to null if not found
    let validUserId = null;
    if (userId) {
      const { User } = req.app.locals.models;
      const userExists = await User.findByPk(userId);
      validUserId = userExists ? userId : null;
    }

    if (!title || !category) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, category' 
      });
    }

    const resolvedDepartment = department || 'General';

    if (!req.file) {
      return res.status(400).json({ error: 'No file received. Select a PDF, DOCX, or other supported file and try again.' });
    }

    const resolvedPath = req.file.path ? path.resolve(req.file.path) : '';

    // Create document record immediately — text extraction runs during AI analysis
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
      department: resolvedDepartment,
      classificationLevel: classificationLevel || 'internal',
      status: 'in_review',
      uploadedBy: validUserId,
      uploadedAt: new Date(),
      extractedText: null,
      ocrProcessed: false,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      metadata: {
        originalName: req.file.originalname,
        storedFileName: req.file.filename,
        uploadedFrom: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        textExtractedOnUpload: false,
        isUrgent: parseBool(isUrgent),
      }
    });

    // Optional background preview extraction — does not block the upload response
    if (resolvedPath) {
      const { extractTextFromFile } = require('../services/pdfTextService');
      extractTextFromFile(resolvedPath, req.file.mimetype)
        .then((extractedText) => {
          if (!extractedText) return;
          return Document.update(
            {
              extractedText: extractedText.slice(0, 10000),
              ocrProcessed: true,
              metadata: {
                ...(document.metadata || {}),
                textExtractedOnUpload: true,
              },
            },
            { where: { id: document.id } }
          );
        })
        .catch((extractErr) => {
          console.warn('Background upload text extraction failed:', extractErr.message);
        });
    }

    // Alert every auditor that this new document needs an audit.
    notifyAuditorsNeedAudit(req.app.locals.models, document, req.user?.id, {
      urgent: parseBool(isUrgent),
    }).catch(() => {});

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
    const { title, description, category, status, tags, classificationLevel, isUrgent, arrivalPort } = req.body;
    const { Document } = req.app.locals.models;
    const role = req.user?.role || 'client';
    const userId = req.user?.id;

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (!userCanAccessDocument(document, userId, role)) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }

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

    if (['document_manager', 'administrator'].includes(role)) {
      const metadata = { ...(document.metadata || {}) };
      let metadataChanged = false;
      if (isUrgent !== undefined) { metadata.isUrgent = Boolean(isUrgent); metadataChanged = true; }
      if (arrivalPort !== undefined) {
        metadata.arrivalPort = arrivalPort ? String(arrivalPort).trim() : null;
        metadataChanged = true;
      }
      if (metadataChanged) updates.metadata = metadata;
    }

    updates.lastModifiedAt = new Date();
    updates.lastModifiedBy = req.user?.id || 'system';

    await document.update(updates);

    // Clear the needs-audit queue when an auditor finalizes the audit via this route.
    if (updates.status && AUDIT_DONE_STATUSES.includes(updates.status)) {
      await resolveNeedsAuditNotifications(req.app.locals.models, document.id);
    }

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
    const role = req.user?.role || 'client';
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
    const role = req.user?.role || 'client';
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

    // Re-uploaded document is back in the queue — alert auditors again.
    notifyAuditorsNeedAudit(req.app.locals.models, document, userId).catch(() => {});

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
    const role = req.user?.role || 'client';

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
    const role = req.user?.role || 'client';

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

    // Once audited, clear it from every auditor's "needs audit" queue.
    if (AUDIT_DONE_STATUSES.includes(status)) {
      await resolveNeedsAuditNotifications(req.app.locals.models, document.id);
    }

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
    const role = req.user?.role || 'client';

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
    if (!userCanAccessDocument(document, req.user?.id, req.user?.role || 'client')) {
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
    if (!userCanAccessDocument(document, req.user?.id, req.user?.role || 'client')) {
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
    const { category, department, isUrgent } = req.body;
    const { Document } = req.app.locals.models;
    const userId = req.user?.id || 'system';

    if (!category) {
      return res.status(400).json({ error: 'Category required' });
    }

    const resolvedDepartment = department || 'General';

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
          department: resolvedDepartment,
          status: 'in_review',
          uploadedBy: userId,
          metadata: {
            originalName: file.originalname,
            storedFileName: file.filename,
            isUrgent: parseBool(isUrgent),
          }
        });
        uploadedDocs.push(doc);
      } catch (err) {
        failedUploads.push({ file: file.filename, error: err.message });
      }
    }

    // Alert auditors that each newly uploaded document needs an audit.
    Promise.all(uploadedDocs.map(doc =>
      notifyAuditorsNeedAudit(req.app.locals.models, doc, req.user?.id, {
        urgent: Boolean(doc.metadata?.isUrgent),
      })
    )).catch(() => {});

    res.json({
      message: `${uploadedDocs.length} of ${files.length} documents uploaded successfully`,
      uploadedCount: uploadedDocs.length,
      failedCount: failedUploads.length,
      documents: uploadedDocs,
      failures: failedUploads,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: error.message || 'Bulk upload failed' });
  }
};

const getDocumentManagement = async (req, res) => {
  try {
    const role = req.user?.role || 'client';
    if (!['document_manager', 'administrator'].includes(role)) {
      return res.status(403).json({ error: 'Document management is available to document managers and administrators only.' });
    }

    const { filter = 'all', page = 1, limit = 50 } = req.query;
    const { Document, User } = req.app.locals.models;

    const { count, rows } = await Document.findAndCountAll({
      include: [{ model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: [['createdAt', 'DESC']],
    });

    let documents = rows.map(enrichDocumentManagement);

    if (filter === 'needs_audit') {
      documents = documents.filter(doc => doc.auditState === 'needs_audit');
    } else if (filter === 'never_audited') {
      documents = documents.filter(doc => doc.neverAudited);
    } else if (filter === 'urgent') {
      documents = documents.filter(doc => doc.isUrgent);
    }

    const all = rows.map(enrichDocumentManagement);
    res.json({
      summary: {
        total: count,
        needsAudit: all.filter(doc => doc.auditState === 'needs_audit').length,
        neverAudited: all.filter(doc => doc.neverAudited).length,
        urgent: all.filter(doc => doc.isUrgent).length,
        audited: all.filter(doc => doc.auditState === 'audited').length,
      },
      documents,
      total: documents.length,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (error) {
    console.error('Document management error:', error);
    res.status(500).json({ error: error.message || 'Failed to load document management data' });
  }
};

const requestDocumentAudit = async (req, res) => {
  try {
    const role = req.user?.role || 'client';
    if (!['document_manager', 'administrator'].includes(role)) {
      return res.status(403).json({ error: 'Only document managers can request audits from this page.' });
    }

    const { id } = req.params;
    const { urgent = false, port = null, note = null } = req.body || {};
    const { Document } = req.app.locals.models;

    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const plain = document.toJSON ? document.toJSON() : document;
    if (documentHasAuditorReview(plain)) {
      return res.status(400).json({
        error: 'This document has already been audited. Notification is only available for documents that still need audit.',
      });
    }

    const metadata = {
      ...(document.metadata || {}),
      isUrgent: Boolean(urgent),
      arrivalPort: port || document.metadata?.arrivalPort || null,
      lastAuditRequestAt: new Date(),
      lastAuditRequestBy: req.user.id,
      lastAuditRequestNote: note || null,
    };

    await document.update({ metadata });

    const result = await notifyAuditorsNeedAudit(
      req.app.locals.models,
      { ...document.toJSON(), metadata },
      req.user.id,
      {
        urgent: metadata.isUrgent,
        port: metadata.arrivalPort,
        note: note || 'This document has not been audited yet. Please complete the audit.',
        requestedByName: req.user.fullName || req.user.email,
      }
    );

    res.json({
      message: result.notified
        ? `Audit request sent to ${result.notified} auditor(s).`
        : 'No active auditors are available to notify.',
      notified: result.notified || 0,
      document: enrichDocumentManagement({ ...document.toJSON(), metadata }),
    });
  } catch (error) {
    console.error('Request document audit error:', error);
    res.status(500).json({ error: error.message || 'Failed to notify auditors' });
  }
};

module.exports = {
  getAllDocuments,
  getDocumentById,
  getDocumentManagement,
  requestDocumentAudit,
  uploadDocument,
  updateDocument,
  reuploadDocument,
  updateDocumentStatus,
  deleteDocument,
  downloadDocument,
  previewDocumentText,
  shareDocument,
  getAccessLogs,
  bulkUpload,
  resolveNeedsAuditNotifications,
};
