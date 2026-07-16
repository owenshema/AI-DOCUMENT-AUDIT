/**
 * Document Controller
 * Handles document upload, retrieval, and management with real database
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { documentWhereForUser, userOwnsDocument, getAssignedClientIds } = require('../utils/ownerScope');
const { normalizeRole } = require('../utils/roles');
const {
  AUDIT_PENDING_STATUSES,
  AUDIT_DONE_STATUSES,
  documentHasAuditorReview,
  documentNeedsAudit,
} = require('../utils/documentAudit');
const { buildAuditMarkup, managerReviewStatusFromAudit, attachMarkupPositions } = require('../services/auditMarkupService');
const { buildMarkedDocumentPdf, buildMarkedTextView, buildMarkedTextPdf } = require('../services/documentMarkedPdfService');

const REQUEST_PENDING_PATH = '__CLIENT_REQUEST_PENDING__';

function isRequestOnlyDocument(document) {
  const meta = document?.metadata || {};
  return Boolean(meta.requestOnly && !meta.preparedAt);
}

function hasDocumentFile(document) {
  if (!document?.filePath || document.filePath === REQUEST_PENDING_PATH) return false;
  return !isRequestOnlyDocument(document);
}

const getStoredFilePath = (document) => {
  if (!hasDocumentFile(document)) return null;
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

/** File path clients receive — corrected/approved version only after manager release. */
const getClientReleaseFilePath = (document) => {
  const meta = document.metadata || {};
  if (meta.clientReleasePath) {
    return getStoredFilePath({
      ...document,
      filePath: meta.clientReleasePath,
      fileName: meta.clientReleaseFileName || document.fileName,
      metadata: { ...meta, storedFileName: meta.clientReleaseStoredName || null },
    });
  }
  return getStoredFilePath(document);
};

const parseBool = (value) => value === true || value === 'true' || value === '1';

const DOCUMENT_STATUSES = ['uploaded', 'in_review', 'in_progress', 'submitted', 'reviewed', 'changes_requested', 'approved', 'rejected'];

const enrichDocumentManagement = (document, userId = null) => {
  const meta = document.metadata || {};
  const plain = document.toJSON ? document.toJSON() : document;
  const assignedClientIds = getAssignedClientIds(plain);
  const isAssignedToMe = userId ? assignedClientIds.includes(userId) : false;
  const isOwnUpload = userId ? plain.uploadedBy === userId : false;
  const requestFulfilled = meta.magerwaRequestStatus === 'fulfilled'
    || meta.documentRequestStatus === 'fulfilled'
    || meta.requestStatus === 'fulfilled'
    || Boolean(meta.requestClearedAt);
  const releasedToMe = Boolean(meta.clientReleasedAt) && isAssignedToMe;
  return {
    ...plain,
    auditState: isRequestOnlyDocument(plain)
      ? 'pending_preparation'
      : documentNeedsAudit(plain)
        ? 'needs_audit'
        : documentHasAuditorReview(plain)
          ? 'audited'
          : 'pending',
    neverAudited: !documentHasAuditorReview(plain),
    isUrgent: Boolean(meta.isUrgent),
    arrivalPort: meta.arrivalPort || meta.cargoPort || null,
    cargoPort: meta.cargoPort || meta.arrivalPort || null,
    lastAuditRequestAt: meta.lastAuditRequestAt || null,
    assignedClientIds,
    assignedAt: meta.assignedAt || null,
    assignedBy: meta.assignedBy || null,
    assignmentNote: meta.assignmentNote || null,
    isAssignedToMe,
    isOwnUpload,
    // Once assigned/released to the client, show under Assigned for cargo (even if they originally requested it)
    documentSource: releasedToMe
      ? 'assigned'
      : (isAssignedToMe && !isOwnUpload)
        ? 'assigned'
        : isOwnUpload
          ? 'own'
          : 'other',
    auditMarkup: meta.auditMarkup || [],
    managerReviewStatus: meta.managerReviewStatus || null,
    needsCorrection: meta.managerReviewStatus === 'needs_correction',
    readyForClient: meta.managerReviewStatus === 'ready_for_client' || meta.clientReleasedAt != null,
    clientReleasedAt: meta.clientReleasedAt || null,
    hasCorrectedVersion: Boolean(meta.clientReleasePath && meta.correctedAt),
    isClientUpload: Boolean(meta.clientUpload),
    returnedToManagerAt: meta.returnedToManagerAt || null,
    awaitingClientAssignment: meta.managerReviewStatus === 'ready_for_client' && !meta.clientReleasedAt,
    magerwaRequested: Boolean(meta.magerwaRequested || meta.documentRequested) && !requestFulfilled,
    magerwaRequestStatus: meta.magerwaRequestStatus || meta.documentRequestStatus || null,
    magerwaRequestedAt: meta.magerwaRequestedAt || null,
    magerwaRequestPort: meta.magerwaRequestPort || null,
    magerwaRequestNote: meta.magerwaRequestNote || null,
    isRequestOnly: isRequestOnlyDocument(plain) && !requestFulfilled,
    needsManagerPreparation: Boolean(meta.requestOnly && !meta.preparedAt) && !requestFulfilled,
    hasDocumentFile: hasDocumentFile(plain),
    requestStatus: meta.requestStatus || null,
    requestFulfilled,
  };
};

/** Clients receive cargo documents only — hide internal audit/analysis details. */
const sanitizeDocumentForClient = (document, role) => {
  if (normalizeRole(role) !== 'client') return document;
  const sanitized = { ...document, auditMarkup: [] };
  if (sanitized.metadata) {
    const m = { ...sanitized.metadata };
    delete m.auditMarkup;
    delete m.latestAuditSummary;
    delete m.latestComplianceScore;
    delete m.latestOverallAuditScore;
    delete m.latestAiGeneratedPercentage;
    delete m.latestAuditDecision;
    delete m.latestAuditReportId;
    delete m.statusReason;
    sanitized.metadata = m;
  }
  return sanitized;
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
      actorId ? User.findByPk(actorId, { attributes: ['id', 'fullName', 'email', 'role'] }) : null,
      requestedByName ? null : (actorId ? User.findByPk(actorId, { attributes: ['fullName', 'email'] }) : null),
    ]);
    if (!auditors.length) return { notified: 0 };

    const uploaderName = uploader?.fullName || uploader?.email || 'A user';
    const managerName = requestedByName || requester?.fullName || uploaderName;
    const meta = document.metadata || {};
    const isUrgent = urgent || meta.isUrgent;
    const arrivalPort = port || meta.arrivalPort || null;

    const isClientDoc = uploader?.role === 'client' || meta.clientUpload;
    let message = isClientDoc
      ? `Client ${uploaderName} uploaded "${document.title}" for audit. After your review, return it to the document manager so they can assign it back to the client.`
      : `Document "${document.title}" has not been audited yet. Please complete the audit.`;
    if (isUrgent) {
      message = isClientDoc
        ? `URGENT: Client ${uploaderName} uploaded "${document.title}" — audit immediately, then return to document manager for client assignment.`
        : `URGENT: Document "${document.title}" needs audit immediately.`;
    }
    if (arrivalPort) message += ` Document arrived at port ${arrivalPort}.`;
    if (note) message += ` ${note}`;
    message += ` Requested by ${managerName}.`;

    const priority = isUrgent ? 'critical' : 'high';
    const subject = isUrgent
      ? `URGENT audit required: "${document.title}"`
      : isClientDoc
        ? `Client document needs audit: "${document.title}"`
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
    document.uploadedBy ? User.findByPk(document.uploadedBy, { attributes: ['id', 'email', 'fullName', 'role'] }) : null,
    actorId ? User.findByPk(actorId, { attributes: ['id', 'email', 'fullName'] }) : null,
  ]);
  const recipients = [owner, auditor]
    .filter(Boolean)
    .filter((user, index, all) => all.findIndex(u => u.id === user.id) === index);

  const ownerIsClient = normalizeRole(owner?.role) === 'client';
  const message = ownerIsClient
    ? (['approved', 'reviewed'].includes(status)
      ? `Your document "${document.title}" passed audit. The document manager will assign it to you shortly for Magerwa/port cargo clearance.`
      : `Your document "${document.title}" is being reviewed. The document manager will contact you when it is ready.`)
    : `Document "${document.title}" has been updated. Log in to the portal to view the status and full analysis.`;

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

/**
 * Notify document managers when auditor returns audited document with analysis + markup.
 */
const notifyDocumentManagersAuditReturn = async (models, document, status, reason, auditorId, auditMarkup = []) => {
  const { Notification, User } = models;
  try {
    const [managers, auditor] = await Promise.all([
      User.findAll({
        where: { role: 'document_manager', isActive: true, approvalStatus: 'approved' },
        attributes: ['id', 'email', 'fullName'],
      }),
      auditorId ? User.findByPk(auditorId, { attributes: ['fullName', 'email'] }) : null,
    ]);
    if (!managers.length) return { notified: 0 };

    const mistakeCount = auditMarkup.length;
    const needsFix = status === 'changes_requested' || status === 'rejected';
    const message = needsFix
      ? `Auditor returned "${document.title}" with ${mistakeCount} mistake(s) marked in red. Status: ${status.replace(/_/g, ' ')}. Please review, correct the document, then release to the client.`
      : `Auditor approved "${document.title}". ${mistakeCount ? `${mistakeCount} note(s) attached.` : 'No mistakes found.'} You may assign the document to the client for Magerwa/port cargo clearance.`;

    const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000/document-management';

    await Promise.all(managers.map(mgr => Notification.create({
      recipientId: mgr.id,
      notificationType: 'audit_returned_to_manager',
      priority: needsFix ? 'high' : 'medium',
      subject: needsFix ? `Corrections needed: ${document.title}` : `Audit complete — ready for client: ${document.title}`,
      message,
      details: {
        documentId: document.id,
        status,
        reason: reason || null,
        mistakeCount,
        auditorName: auditor?.fullName || auditor?.email || 'Auditor',
        auditMarkup: auditMarkup.slice(0, 20),
      },
      relatedEntityType: 'document',
      relatedEntityId: document.id,
      actionUrl: `/document-management?documentId=${document.id}`,
      status: 'unread',
      sentAt: new Date(),
      deliveryStatus: 'sent',
    })));

    try {
      const emailService = require('../services/emailService');
      await Promise.all(managers.filter(m => m.email).map(mgr => emailService.sendEmail({
        to: mgr.email,
        subject: needsFix ? `Corrections needed: "${document.title}"` : `Audit returned: "${document.title}"`,
        html: `<p>Hi <strong>${mgr.fullName || mgr.email}</strong>,</p><p>${message}</p><p><a href="${portalUrl}">Open Document Management</a></p>`,
        text: `${message}\nOpen Document Management: ${portalUrl}`,
      }).catch(() => {})));
    } catch (e) { console.warn('Manager audit return email failed:', e.message); }

    return { notified: managers.length };
  } catch (e) {
    console.warn('Notify document managers failed:', e.message);
    return { notified: 0 };
  }
};

/**
 * Notify document managers when a client uploads a document for audit & cargo clearance.
 */
const notifyDocumentManagersClientUpload = async (models, document, clientUser) => {
  const { Notification, User } = models;
  try {
    const managers = await User.findAll({
      where: { role: 'document_manager', isActive: true, approvalStatus: 'approved' },
      attributes: ['id', 'email', 'fullName'],
    });
    if (!managers.length) return { notified: 0 };

    const clientName = clientUser?.fullName || clientUser?.email || 'A client';
    const message = `${clientName} uploaded "${document.title}". Auditors have been notified to audit it. After approval, assign the document back to this client for Magerwa/port cargo clearance.`;
    const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000/document-management';

    await Promise.all(managers.map(mgr => Notification.create({
      recipientId: mgr.id,
      notificationType: 'client_document_uploaded',
      priority: 'medium',
      subject: `Client upload: ${document.title}`,
      message,
      details: {
        documentId: document.id,
        uploadedBy: clientUser?.id || document.uploadedBy,
        clientName,
      },
      relatedEntityType: 'document',
      relatedEntityId: document.id,
      actionUrl: `/document-management?documentId=${document.id}`,
      status: 'unread',
      sentAt: new Date(),
      deliveryStatus: 'sent',
    })));

    try {
      const emailService = require('../services/emailService');
      await Promise.all(managers.filter(m => m.email).map(mgr => emailService.sendEmail({
        to: mgr.email,
        subject: `Client uploaded document: "${document.title}"`,
        html: `<p>Hi <strong>${mgr.fullName || mgr.email}</strong>,</p><p>${message}</p><p><a href="${portalUrl}">Open Document Management</a></p>`,
        text: `${message}\nOpen Document Management: ${portalUrl}`,
      }).catch(() => {})));
    } catch (e) { console.warn('Manager client-upload email failed:', e.message); }

    return { notified: managers.length };
  } catch (e) {
    console.warn('Notify managers (client upload) failed:', e.message);
    return { notified: 0 };
  }
};

/**
 * Notify document managers when a client requests a document for Magerwa/port presentation.
 */
const notifyDocumentManagersMagerwaRequest = async (models, document, clientUser, port, note) => {
  const { Notification, User } = models;
  try {
    const managers = await User.findAll({
      where: { role: 'document_manager', isActive: true, approvalStatus: 'approved' },
      attributes: ['id', 'email', 'fullName'],
    });
    if (!managers.length) return { notified: 0 };

    const clientName = clientUser?.fullName || clientUser?.email || 'A client';
    const message = `${clientName} requested document "${document.title}".${port ? ` Port: ${port}.` : ''}${note ? ` Note: ${note}` : ''} Please ensure audit is complete and assign the approved document to the client.`;
    const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000/document-management';

    await Promise.all(managers.map(mgr => Notification.create({
      recipientId: mgr.id,
      notificationType: 'client_document_request',
      priority: 'high',
      subject: `Document request: ${document.title}`,
      message,
      details: {
        documentId: document.id,
        requestedBy: clientUser?.id,
        clientName,
        port: port || null,
        note: note || null,
      },
      relatedEntityType: 'document',
      relatedEntityId: document.id,
      actionUrl: `/document-management?documentId=${document.id}`,
      status: 'unread',
      sentAt: new Date(),
      deliveryStatus: 'sent',
    })));

    try {
      const emailService = require('../services/emailService');
      await Promise.all(managers.filter(m => m.email).map(mgr => emailService.sendEmail({
        to: mgr.email,
        subject: `Document request: "${document.title}"`,
        html: `<p>Hi <strong>${mgr.fullName || mgr.email}</strong>,</p><p>${message}</p><p><a href="${portalUrl}">Open Document Management</a></p>`,
        text: `${message}\nOpen Document Management: ${portalUrl}`,
      }).catch(() => {})));
    } catch (e) { console.warn('Manager Magerwa request email failed:', e.message); }

    return { notified: managers.length };
  } catch (e) {
    console.warn('Notify managers (Magerwa request) failed:', e.message);
    return { notified: 0 };
  }
};

/**
 * Notify document managers when a client requests a document without uploading a file.
 */
const notifyDocumentManagersClientDocumentRequest = async (models, document, clientUser, port, note) => {
  const { Notification, User } = models;
  try {
    const managers = await User.findAll({
      where: { role: 'document_manager', isActive: true, approvalStatus: 'approved' },
      attributes: ['id', 'email', 'fullName'],
    });
    if (!managers.length) return { notified: 0 };

    const clientName = clientUser?.fullName || clientUser?.email || 'A client';
    const message = `${clientName} needs a document: "${document.title}".${port ? ` Port: ${port}.` : ''}${note ? ` Note: ${note}` : ''} Please prepare the document, send it to the auditor for audit, then assign it back to the client.`;
    const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000/document-management';

    await Promise.all(managers.map(mgr => Notification.create({
      recipientId: mgr.id,
      notificationType: 'client_document_request',
      priority: 'high',
      subject: `Client needs document: ${document.title}`,
      message,
      details: {
        documentId: document.id,
        requestedBy: clientUser?.id,
        clientName,
        port: port || null,
        note: note || null,
        requestOnly: true,
      },
      relatedEntityType: 'document',
      relatedEntityId: document.id,
      actionUrl: `/document-management?documentId=${document.id}&filter=magerwa_requests`,
      status: 'unread',
      sentAt: new Date(),
      deliveryStatus: 'sent',
    })));

    try {
      const emailService = require('../services/emailService');
      await Promise.all(managers.filter(m => m.email).map(mgr => emailService.sendEmail({
        to: mgr.email,
        subject: `Client needs document: "${document.title}"`,
        html: `<p>Hi <strong>${mgr.fullName || mgr.email}</strong>,</p><p>${message}</p><p><a href="${portalUrl}">Open Document Management</a></p>`,
        text: `${message}\nOpen Document Management: ${portalUrl}`,
      }).catch(() => {})));
    } catch (e) { console.warn('Manager client document request email failed:', e.message); }

    return { notified: managers.length };
  } catch (e) {
    console.warn('Notify managers (client document request) failed:', e.message);
    return { notified: 0 };
  }
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

    if (role === 'client' && req.query.source === 'assigned') {
      filteredRows = filteredRows.filter(doc => {
        const e = enrichDocumentManagement(doc, userId);
        return e.isAssignedToMe && e.documentSource === 'assigned';
      });
    } else if (role === 'client' && req.query.source === 'own') {
      filteredRows = filteredRows.filter(doc => enrichDocumentManagement(doc, userId).isOwnUpload);
    }

    const count = filteredRows.length;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const rows = filteredRows.slice(offset, offset + parseInt(limit, 10));

    res.json({
      documents: rows.map(doc => sanitizeDocumentForClient(enrichDocumentManagement(doc, userId), role)),
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

    res.json(sanitizeDocumentForClient(enrichDocumentManagement(document, userId), role));
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
    const uploaderRole = normalizeRole(req.user?.role);
    const isClientUpload = uploaderRole === 'client';

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
        clientUpload: isClientUpload,
        uploaderRole,
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

    if (isClientUpload && req.user) {
      notifyDocumentManagersClientUpload(req.app.locals.models, document, req.user).catch(() => {});
    }

    res.status(201).json({
      message: isClientUpload
        ? 'Document uploaded. An auditor will review it, then your document manager will assign it back to you when ready.'
        : 'Document uploaded successfully',
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
    const isManager = ['document_manager', 'administrator'].includes(role);
    if (role === 'client' && document.uploadedBy !== userId) {
      return res.status(403).json({ error: 'Only the uploader or document manager can re-upload this file.' });
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
      status: isManager ? 'approved' : 'in_review',
      ocrProcessed: Boolean(reExtracted),
      extractedText: reExtracted ? reExtracted.slice(0, 10000) : null,
      metadata: {
        ...(document.metadata || {}),
        ...(isManager ? {} : {
          statusReason: null,
          latestAuditDecision: null,
          latestAuditSummary: null,
          latestComplianceScore: null,
          latestAiGeneratedPercentage: null,
        }),
        ...(isManager ? {
          clientReleasePath: newPath,
          clientReleaseFileName: req.file.originalname || req.file.filename,
          clientReleaseStoredName: req.file.filename,
          managerReviewStatus: 'ready_for_client',
          correctedAt: new Date(),
          correctedBy: userId,
        } : {}),
        reuploads: [
          ...priorUploads,
          {
            fileName: req.file.originalname,
            storedFileName: req.file.filename,
            uploadedBy: userId,
            uploadedAt: new Date(),
            correctionByManager: isManager,
          },
        ],
      },
      lastModifiedBy: userId,
      lastModifiedAt: new Date(),
    });

    if (isManager) {
      await AuditLog.create({
        userId,
        action: 'document_corrected',
        description: `Document manager uploaded corrected version for "${document.title}"`,
        resourceType: 'document',
        resourceId: id,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      return res.json({
        message: 'Corrected document uploaded and marked ready for client release',
        document: enrichDocumentManagement(await Document.findByPk(id), userId),
      });
    }

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

    const { isDocumentAssignedToUser } = require('../utils/ownerScope');
    const isAssignedClient = role === 'client' && isDocumentAssignedToUser(document, userId);
    const isClientOwner = normalizeRole(role) === 'client' && document.uploadedBy === userId;
    if (isClientOwner && !isAssignedClient) {
      return res.status(403).json({
        error: 'Use Request Document and wait until the document manager assigns the approved document to you.',
      });
    }
    if (isAssignedClient && !document.metadata?.clientReleasedAt) {
      return res.status(403).json({
        error: 'This document has not been released by the document manager yet. Please wait until it is assigned to you for cargo clearance.',
      });
    }

    const downloadName = isAssignedClient && document.metadata?.clientReleaseFileName
      ? document.metadata.clientReleaseFileName
      : document.fileName;
    const filePath = isAssignedClient ? getClientReleaseFilePath(document) : getStoredFilePath(document);
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
    const safeName = (downloadName || 'document').replace(/"/g, '');
    const asAttachment = req.query.attachment === '1' || req.query.attachment === 'true'
      || req.query.download === '1' || req.query.download === 'true';
    res.setHeader(
      'Content-Disposition',
      `${asAttachment ? 'attachment' : 'inline'}; filename="${safeName}"`
    );
    res.sendFile(path.resolve(filePath));
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
    const { Document, DocumentAnalysis, AuditLog } = req.app.locals.models;
    const role = req.user?.role || 'client';

    if (role !== 'auditor') {
      return res.status(403).json({ error: 'Only auditors can update document progress.' });
    }

    if (!DOCUMENT_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Use one of: ${DOCUMENT_STATUSES.join(', ')}` });
    }

    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const analysis = await DocumentAnalysis.findOne({ where: { documentId: id } });
    const rawMarkup = analysis ? buildAuditMarkup(analysis, status) : [];
    const auditMarkup = document.extractedText
      ? attachMarkupPositions(document.extractedText, rawMarkup)
      : rawMarkup;
    const managerReviewStatus = managerReviewStatusFromAudit(status);

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
      auditMarkup,
      managerReviewStatus,
      returnedToManagerAt: new Date(),
      returnedByAuditor: req.user.id,
      statusHistory: [
        ...statusHistory,
        { status, reason: reason || null, reportId, changedBy: req.user.id, changedAt: new Date() }
      ],
    };

    if (status === 'approved' || status === 'reviewed') {
      metadata.clientReleasePath = document.filePath;
      metadata.clientReleaseFileName = document.fileName;
      metadata.clientReleaseStoredName = document.metadata?.storedFileName || null;
      // Clear previous release so manager can re-assign after a new audit return
      delete metadata.clientReleasedAt;
      metadata.awaitingManagerAssignment = true;
    }

    await document.update({
      status,
      metadata,
      lastModifiedBy: req.user.id,
      lastModifiedAt: new Date(),
    });

    await notifyDocumentOwner(req.app.locals.models, document, status, reason, req.user.id);
    await notifyDocumentManagersAuditReturn(
      req.app.locals.models,
      { ...document.toJSON(), metadata },
      status,
      reason,
      req.user.id,
      auditMarkup
    );

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

    res.json({
      message: 'Audit returned to document manager with marked mistakes and analysis',
      document: enrichDocumentManagement({ ...document.toJSON(), status, metadata }, req.user.id),
      auditMarkup,
      managerReviewStatus,
    });
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
    const uploaderRole = normalizeRole(req.user?.role);
    const isClientUpload = uploaderRole === 'client';

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
            clientUpload: isClientUpload,
            uploaderRole,
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

    if (isClientUpload && req.user && uploadedDocs.length) {
      Promise.all(uploadedDocs.map(doc =>
        notifyDocumentManagersClientUpload(req.app.locals.models, doc, req.user)
      )).catch(() => {});
    }

    res.json({
      message: isClientUpload
        ? `${uploadedDocs.length} document(s) uploaded. Auditors and document managers have been notified.`
        : `${uploadedDocs.length} of ${files.length} documents uploaded successfully`,
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

const getAssignableClients = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role || 'client');
    if (!['document_manager', 'administrator'].includes(role)) {
      return res.status(403).json({ error: 'Only document managers can list clients for assignment.' });
    }

    const { User } = req.app.locals.models;
    const { Op } = require('sequelize');
    // Document managers see every active client account for assignment
    const clients = await User.findAll({
      where: {
        role: { [Op.in]: ['client', 'viewer'] },
        isActive: true,
      },
      attributes: ['id', 'fullName', 'email', 'phone', 'department', 'approvalStatus', 'isActive'],
      order: [['fullName', 'ASC'], ['email', 'ASC']],
    });

    res.json({
      clients: clients.map(c => ({
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        phone: c.phone || null,
        department: c.department || null,
        approvalStatus: c.approvalStatus || 'approved',
      })),
      total: clients.length,
    });
  } catch (error) {
    console.error('Get assignable clients error:', error);
    res.status(500).json({ error: error.message || 'Failed to load clients' });
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
      include: [
        { model: User, as: 'uploader', attributes: ['id', 'fullName', 'email', 'phone', 'role'] },
      ],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: [['createdAt', 'DESC']],
    });

    const allClientIds = [...new Set(rows.flatMap(r => getAssignedClientIds(r.toJSON ? r.toJSON() : r)))];
    const assignedUsers = allClientIds.length
      ? await User.findAll({
        where: { id: allClientIds },
        attributes: ['id', 'fullName', 'email', 'phone'],
      })
      : [];
    const userMap = Object.fromEntries(assignedUsers.map(u => [u.id, u]));

    const enrichWithAssignees = (doc) => {
      const enriched = enrichDocumentManagement(doc);
      enriched.isClientUpload = enriched.isClientUpload || enriched.uploader?.role === 'client';
      enriched.assignedClients = (enriched.assignedClientIds || [])
        .map(id => userMap[id])
        .filter(Boolean);
      return enriched;
    };

    let documents = rows.map(enrichWithAssignees);

    if (filter === 'needs_audit') {
      documents = documents.filter(doc => doc.auditState === 'needs_audit');
    } else if (filter === 'never_audited') {
      documents = documents.filter(doc => doc.neverAudited);
    } else if (filter === 'urgent') {
      documents = documents.filter(doc => doc.isUrgent);
    } else if (filter === 'audited') {
      documents = documents.filter(doc => doc.auditState === 'audited');
    } else if (filter === 'client_uploads') {
      documents = documents.filter(doc => doc.isClientUpload);
    } else if (filter === 'magerwa_requests') {
      documents = documents.filter(doc =>
        !doc.requestFulfilled
        && !doc.clientReleasedAt
        && (
          doc.needsManagerPreparation
          || (doc.magerwaRequested && doc.magerwaRequestStatus === 'pending')
        )
      );
    } else if (filter === 'needs_preparation') {
      documents = documents.filter(doc => doc.needsManagerPreparation && !doc.requestFulfilled);
    } else if (filter === 'needs_correction') {
      documents = documents.filter(doc => doc.needsCorrection || doc.managerReviewStatus === 'needs_correction');
    } else if (filter === 'ready_for_client') {
      documents = documents.filter(doc => doc.awaitingClientAssignment && ['approved', 'reviewed'].includes(doc.status));
    }

    const all = rows.map(enrichWithAssignees);
    res.json({
      summary: {
        total: count,
        needsAudit: all.filter(doc => doc.auditState === 'needs_audit').length,
        neverAudited: all.filter(doc => doc.neverAudited).length,
        urgent: all.filter(doc => doc.isUrgent).length,
        audited: all.filter(doc => doc.auditState === 'audited').length,
        clientUploads: all.filter(doc => doc.isClientUpload).length,
        awaitingAssignment: all.filter(doc => doc.awaitingClientAssignment && ['approved', 'reviewed'].includes(doc.status)).length,
        magerwaRequests: all.filter(doc =>
          doc.needsManagerPreparation
          || (doc.magerwaRequested && doc.magerwaRequestStatus === 'pending' && !doc.clientReleasedAt)
        ).length,
        needsPreparation: all.filter(doc => doc.needsManagerPreparation).length,
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

const notifyAssignedClients = async (models, document, clientIds, actorId, note) => {
  const { Notification, User } = models;
  if (!clientIds.length) return { notified: 0 };

  const [clients, manager] = await Promise.all([
    User.findAll({
      where: { id: clientIds, role: 'client', isActive: true },
      attributes: ['id', 'email', 'fullName'],
    }),
    User.findByPk(actorId, { attributes: ['fullName', 'email'] }),
  ]);
  if (!clients.length) return { notified: 0 };

  const managerName = manager?.fullName || manager?.email || 'Document manager';
  const port = document.metadata?.cargoPort || document.metadata?.arrivalPort;
  const portLine = port ? ` Present this document at ${port} to receive your cargo.` : ' Download the document and take it to Magerwa or the port to receive your cargo.';
  const message = note
    || `Document "${document.title}" has been audited and assigned to you.${portLine} Download the document from your portal and take it to the port.`;

  await Promise.all(clients.map(client => Notification.create({
    recipientId: client.id,
    notificationType: 'document_assigned',
    priority: 'medium',
    subject: `Document assigned: ${document.title}`,
    message,
    details: {
      documentId: document.id,
      documentTitle: document.title,
      assignedBy: actorId,
      assignedByName: managerName,
    },
    relatedEntityType: 'document',
    relatedEntityId: document.id,
    actionUrl: `/documents?documentId=${document.id}`,
    status: 'unread',
    sentAt: new Date(),
    deliveryStatus: 'sent',
  })));

  try {
    const emailService = require('../services/emailService');
    const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000/documents';
    await Promise.all(clients.filter(c => c.email).map(client => emailService.sendEmail({
      to: client.email,
      subject: `Document assigned: "${document.title}"`,
      html: `<p>Hi <strong>${client.fullName || client.email}</strong>,</p><p>${message}</p><p>Assigned by ${managerName}.</p><p><a href="${portalUrl}">Open your document portal</a></p>`,
      text: `${message}\nAssigned by ${managerName}.\nOpen portal: ${portalUrl}`,
    }).catch(() => {})));
  } catch (e) {
    console.warn('Assign client email failed:', e.message);
  }

  return { notified: clients.length };
};

const assignDocumentToClients = async (req, res) => {
  try {
    const role = req.user?.role || 'client';
    if (!['document_manager', 'administrator'].includes(role)) {
      return res.status(403).json({ error: 'Only document managers can assign documents to clients.' });
    }

    const { id } = req.params;
    const { clientIds = [], note = null, port = null } = req.body || {};
    const { Document, User, DocumentAnalysis, AuditLog } = req.app.locals.models;

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({ error: 'clientIds array is required with at least one client user.' });
    }

    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const plain = document.toJSON ? document.toJSON() : document;
    if (!documentHasAuditorReview(plain)) {
      return res.status(400).json({
        error: 'This document must be audited before it can be assigned to clients.',
      });
    }

    if (plain.metadata?.managerReviewStatus === 'needs_correction') {
      return res.status(400).json({
        error: 'This document has mistakes that need correction. Upload a corrected version before assigning to the client.',
      });
    }

    if (!['approved', 'reviewed'].includes(document.status)) {
      return res.status(400).json({
        error: 'Only approved documents can be assigned to clients for Magerwa/port cargo clearance.',
      });
    }

    if (!plain.metadata?.clientReleasePath && !document.filePath) {
      return res.status(400).json({
        error: 'No client-ready document file is available. Upload a corrected version or wait for auditor approval.',
      });
    }

    const analysis = await DocumentAnalysis.findOne({ where: { documentId: id } });
    if (!analysis) {
      return res.status(400).json({
        error: 'No audit analysis found for this document. Run the audit before assigning.',
      });
    }

    const { Op } = require('sequelize');
    const clients = await User.findAll({
      where: {
        id: clientIds,
        role: { [Op.in]: ['client', 'viewer'] },
        isActive: true,
      },
      attributes: ['id', 'fullName', 'email', 'phone'],
    });
    if (!clients.length) {
      return res.status(400).json({ error: 'No valid active client accounts found for the given IDs.' });
    }

    const validIds = clients.map(c => c.id);
    const resolvedPort = port || document.metadata?.arrivalPort || document.metadata?.cargoPort || null;
    const releasePath = document.metadata?.clientReleasePath || document.filePath;
    const wasClientRequest = Boolean(
      plain.metadata?.magerwaRequested
      || plain.metadata?.documentRequested
      || plain.metadata?.clientDocumentRequest
      || plain.metadata?.requestOnly
      || plain.status === 'requested'
    );
    const metadata = {
      ...(document.metadata || {}),
      assignedClientIds: validIds,
      assignedAt: new Date(),
      assignedBy: req.user.id,
      assignmentNote: note || null,
      cargoPort: resolvedPort,
      arrivalPort: resolvedPort || document.metadata?.arrivalPort || null,
      clientReleasedAt: new Date(),
      clientReleasePath: releasePath,
      managerReviewStatus: 'released_to_client',
      // Assignment fulfills/clears the client's open request for this document
      magerwaRequestStatus: 'fulfilled',
      documentRequestStatus: 'fulfilled',
      requestStatus: 'fulfilled',
      requestClearedAt: new Date(),
      requestClearedBy: req.user.id,
      awaitingManagerAssignment: false,
    };
    if (wasClientRequest) {
      metadata.magerwaRequested = false;
      metadata.documentRequested = false;
      metadata.clientDocumentRequest = false;
    }

    const updates = { metadata };
    if (document.status === 'requested') {
      updates.status = 'approved';
    }

    await document.update(updates);

    const notifyResult = await notifyAssignedClients(
      req.app.locals.models,
      { ...document.toJSON(), metadata },
      validIds,
      req.user.id,
      note
    );

    await AuditLog.create({
      userId: req.user.id,
      action: 'document_assigned',
      description: `Document "${document.title}" assigned to ${validIds.length} client(s)`,
      resourceType: 'document',
      resourceId: id,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: `Document assigned to ${validIds.length} client(s).`,
      notified: notifyResult.notified || 0,
      assignedClients: clients,
      document: enrichDocumentManagement({ ...document.toJSON(), metadata }),
    });
  } catch (error) {
    console.error('Assign document error:', error);
    res.status(500).json({ error: error.message || 'Failed to assign document' });
  }
};

/** Client requests a document without uploading — manager prepares, auditor audits, manager assigns. */
const createClientDocumentRequest = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (role !== 'client') {
      return res.status(403).json({ error: 'Only clients can submit document requests.' });
    }

    const { title, description, category, port, note } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Title is required for a document request.' });
    }

    const { Document, AuditLog } = req.app.locals.models;
    const userId = req.user.id;
    const resolvedPort = String(port || '').trim() || null;

    const document = await Document.create({
      id: uuidv4(),
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      fileName: 'pending-request',
      filePath: REQUEST_PENDING_PATH,
      fileSize: 0,
      fileFormat: 'REQUEST',
      mimeType: null,
      category: category || 'other',
      department: req.user.department || 'General',
      status: 'requested',
      uploadedBy: userId,
      uploadedAt: new Date(),
      metadata: {
        requestOnly: true,
        clientDocumentRequest: true,
        clientUpload: false,
        magerwaRequested: true,
        documentRequested: true,
        magerwaRequestStatus: 'pending',
        documentRequestStatus: 'pending',
        requestStatus: 'pending_manager_preparation',
        magerwaRequestedAt: new Date(),
        documentRequestedAt: new Date(),
        magerwaRequestedBy: userId,
        magerwaRequestPort: resolvedPort,
        magerwaRequestNote: note ? String(note).trim() : null,
        arrivalPort: resolvedPort,
      },
    });

    const notifyResult = await notifyDocumentManagersClientDocumentRequest(
      req.app.locals.models,
      document,
      req.user,
      resolvedPort,
      note
    );

    await AuditLog.create({
      userId,
      action: 'client_document_request',
      description: `Client requested document "${document.title}" (no upload)`,
      resourceType: 'document',
      resourceId: document.id,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      message: 'Document request submitted. Your document manager will prepare it, send it for audit, and assign it to you when ready.',
      notifiedManagers: notifyResult.notified || 0,
      document: sanitizeDocumentForClient(enrichDocumentManagement(document, userId), role),
    });
  } catch (error) {
    console.error('Create client document request error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit document request' });
  }
};

/** Document manager uploads the file for a client request and sends to auditor. */
const fulfillClientDocumentRequest = async (req, res) => {
  try {
    const role = req.user?.role || 'client';
    if (!['document_manager', 'administrator'].includes(role)) {
      return res.status(403).json({ error: 'Only document managers can prepare client document requests.' });
    }

    const { id } = req.params;
    const { note } = req.body || {};
    const { Document, AuditLog } = req.app.locals.models;

    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const meta = document.metadata || {};
    if (!meta.requestOnly || meta.preparedAt) {
      return res.status(400).json({ error: 'This is not a pending client document request awaiting preparation.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Upload the document file to fulfill this client request.' });
    }

    const resolvedPath = req.file.path ? path.resolve(req.file.path) : '';
    const metadata = {
      ...meta,
      preparedAt: new Date(),
      preparedBy: req.user.id,
      preparationNote: note ? String(note).trim() : null,
      requestStatus: 'prepared_pending_audit',
      originalName: req.file.originalname,
      storedFileName: req.file.filename,
      clientUpload: false,
    };

    await document.update({
      fileName: req.file.originalname,
      filePath: resolvedPath,
      fileSize: req.file.size,
      fileFormat: path.extname(req.file.originalname).replace('.', '').toUpperCase() || 'FILE',
      mimeType: req.file.mimetype,
      status: 'in_review',
      metadata,
      lastModifiedBy: req.user.id,
      lastModifiedAt: new Date(),
    });

    const updated = await Document.findByPk(id);
    const auditNotify = await notifyAuditorsNeedAudit(
      req.app.locals.models,
      updated,
      req.user.id,
      {
        urgent: true,
        port: meta.magerwaRequestPort || meta.arrivalPort,
        note: note || `Document prepared for client request. Please audit and return to document manager.`,
        requestedByName: req.user.fullName || req.user.email,
      }
    );

    const { Notification, User } = req.app.locals.models;
    const client = document.uploadedBy
      ? await User.findByPk(document.uploadedBy, { attributes: ['id', 'email', 'fullName'] })
      : null;
    if (client) {
      await Notification.create({
        recipientId: client.id,
        notificationType: 'document_request_prepared',
        priority: 'medium',
        subject: `Your document request is being audited: ${document.title}`,
        message: `Your document manager prepared "${document.title}" and sent it to the auditor. You will be notified when it is assigned to you.`,
        details: { documentId: id },
        relatedEntityType: 'document',
        relatedEntityId: id,
        actionUrl: `/documents?documentId=${id}`,
        status: 'unread',
        sentAt: new Date(),
        deliveryStatus: 'sent',
      }).catch(() => {});
    }

    await AuditLog.create({
      userId: req.user.id,
      action: 'document_request_prepared',
      description: `Document manager prepared client request "${document.title}" and sent to auditor`,
      resourceType: 'document',
      resourceId: id,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: `Document prepared and sent to ${auditNotify.notified || 0} auditor(s) for audit.`,
      notifiedAuditors: auditNotify.notified || 0,
      document: enrichDocumentManagement(updated),
    });
  } catch (error) {
    console.error('Fulfill client document request error:', error);
    res.status(500).json({ error: error.message || 'Failed to prepare document request' });
  }
};

const requestMagerwaPresentation = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (role !== 'client') {
      return res.status(403).json({ error: 'Only clients can request documents.' });
    }

    const { id } = req.params;
    const { port = null, note = null } = req.body || {};
    const { Document, AuditLog } = req.app.locals.models;
    const userId = req.user.id;

    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    if (document.uploadedBy !== userId) {
      return res.status(403).json({ error: 'You can only request documents you uploaded.' });
    }

    const meta = document.metadata || {};
    if (meta.clientReleasedAt && getAssignedClientIds(document).includes(userId)) {
      return res.status(400).json({
        error: 'This document is already assigned to you. Download it from Assigned for cargo.',
      });
    }

    if (meta.magerwaRequested && meta.magerwaRequestStatus === 'pending') {
      return res.json({
        message: 'Your document request is already pending. The auditor and document manager will process it.',
        document: enrichDocumentManagement(document, userId),
      });
    }

    const resolvedPort = String(port || meta.magerwaRequestPort || meta.arrivalPort || '').trim() || null;
    const metadata = {
      ...meta,
      magerwaRequested: true,
      documentRequested: true,
      magerwaRequestedAt: new Date(),
      documentRequestedAt: new Date(),
      magerwaRequestedBy: userId,
      magerwaRequestPort: resolvedPort,
      magerwaRequestNote: note ? String(note).trim() : null,
      magerwaRequestStatus: 'pending',
      documentRequestStatus: 'pending',
      arrivalPort: resolvedPort || meta.arrivalPort || null,
    };

    await document.update({ metadata });

    const notifyMgr = await notifyDocumentManagersMagerwaRequest(
      req.app.locals.models,
      { ...document.toJSON(), metadata },
      req.user,
      resolvedPort,
      note
    );

    let auditorNotify = { notified: 0 };
    if (!documentHasAuditorReview({ ...document.toJSON(), metadata })) {
      auditorNotify = await notifyAuditorsNeedAudit(
        req.app.locals.models,
        { ...document.toJSON(), metadata },
        userId,
        {
          urgent: true,
          port: resolvedPort,
          note: note || 'Client requested this document. Please audit urgently so the document manager can assign it back.',
        }
      );
    }

    await AuditLog.create({
      userId,
      action: 'document_request',
      description: `Client requested document "${document.title}"${resolvedPort ? ` (${resolvedPort})` : ''}`,
      resourceType: 'document',
      resourceId: id,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: 'Document request sent. You will be notified when the document manager assigns it to you.',
      notifiedManagers: notifyMgr.notified || 0,
      notifiedAuditors: auditorNotify.notified || 0,
      document: enrichDocumentManagement({ ...document.toJSON(), metadata }, userId),
    });
  } catch (error) {
    console.error('Document request error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit document request' });
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

const getMarkedDocumentView = async (req, res) => {
  try {
    const { id } = req.params;
    const { Document } = req.app.locals.models;
    const userId = req.user?.id;
    const role = req.user?.role || 'client';

    if (normalizeRole(role) === 'client') {
      return res.status(403).json({ error: 'Marked audit documents are not available to client accounts.' });
    }

    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (!userCanAccessDocument(document, userId, role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const markup = document.metadata?.auditMarkup || [];
    if (!markup.length) {
      return res.status(404).json({ error: 'No audit marks on this document yet. Complete an audit first.' });
    }

    let text = document.extractedText || '';
    if (!text || text.length < 25) {
      const filePath = getStoredFilePath(document);
      if (filePath) {
        const { extractTextFromFile } = require('../services/pdfTextService');
        text = await extractTextFromFile(filePath, document.mimeType) || '';
      }
    }

    res.json({
      documentId: id,
      title: document.title || document.fileName,
      status: document.status,
      ...buildMarkedTextView(text, markup),
    });
  } catch (error) {
    console.error('Marked document view error:', error);
    res.status(500).json({ error: error.message || 'Failed to build marked view' });
  }
};

const downloadMarkedDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { Document } = req.app.locals.models;
    const userId = req.user?.id;
    const role = req.user?.role || 'client';

    if (normalizeRole(role) === 'client') {
      return res.status(403).json({ error: 'Marked audit documents are not available to client accounts.' });
    }

    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (!userCanAccessDocument(document, userId, role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const markup = document.metadata?.auditMarkup || [];
    if (!markup.length) {
      return res.status(404).json({ error: 'No audit marks on this document yet.' });
    }

    const filePath = getStoredFilePath(document);
    let text = document.extractedText || '';
    if ((!text || text.length < 25) && filePath) {
      const { extractTextFromFile } = require('../services/pdfTextService');
      text = await extractTextFromFile(filePath, document.mimeType) || '';
    }

    const safeName = (document.title || document.fileName || 'document').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40);
    const isPdf = (document.fileFormat || '').toUpperCase() === 'PDF'
      || (document.fileName || '').toLowerCase().endsWith('.pdf');

    if (isPdf && filePath) {
      const pdfBytes = await buildMarkedDocumentPdf(filePath, text, markup);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="marked_${safeName}.pdf"`);
      return res.send(Buffer.from(pdfBytes));
    }

    const pdfBuffer = await buildMarkedTextPdf(text, markup, document.title || document.fileName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="marked_${safeName}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Download marked document error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate marked document' });
  }
};

module.exports = {
  getAllDocuments,
  getDocumentById,
  getDocumentManagement,
  getAssignableClients,
  createClientDocumentRequest,
  fulfillClientDocumentRequest,
  assignDocumentToClients,
  requestMagerwaPresentation,
  requestDocumentAudit,
  uploadDocument,
  updateDocument,
  reuploadDocument,
  updateDocumentStatus,
  deleteDocument,
  downloadDocument,
  downloadMarkedDocument,
  getMarkedDocumentView,
  previewDocumentText,
  shareDocument,
  getAccessLogs,
  bulkUpload,
  resolveNeedsAuditNotifications,
};
