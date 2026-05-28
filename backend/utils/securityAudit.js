'use strict';

async function logSecurityEvent(models, event) {
  if (!models || !models.AuditLog) return;
  try {
    await models.AuditLog.create({
      userId: event.userId || null,
      userRole: event.userRole || 'anonymous',
      action: event.action || 'security_event',
      resourceType: event.resourceType || 'auth',
      status: event.status || 'failure',
      description: event.description || 'Security event',
      ipAddress: event.ipAddress || null,
      userAgent: event.userAgent || null,
      details: event.details || {},
    });
  } catch (err) {
    console.warn('Security audit log failed:', err.message);
  }
}

module.exports = { logSecurityEvent };
