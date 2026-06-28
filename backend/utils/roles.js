'use strict';

const VALID_ROLES = ['administrator', 'auditor', 'document_manager', 'client'];
const DEFAULT_ROLE = 'client';
const OWNER_ROLES = ['client'];

const ROLE_LABELS = {
  administrator: 'Administrator',
  auditor: 'Auditor',
  document_manager: 'Document Manager',
  client: 'Client',
  viewer: 'Client',
};

/** Map legacy viewer role to client. */
function normalizeRole(role) {
  if (!role || role === 'viewer') return DEFAULT_ROLE;
  return role;
}

function formatRoleLabel(role) {
  const key = normalizeRole(role);
  return ROLE_LABELS[key] || key.replace(/_/g, ' ');
}

/** Report export formats allowed per role (auditor may also export Excel). Clients cannot export analysis reports. */
const EXPORT_FORMATS_BY_ROLE = {
  client: [],
  document_manager: ['pdf'],
  administrator: ['pdf'],
  auditor: ['pdf', 'excel'],
};

function normalizeExportFormat(format) {
  const fmt = String(format || 'pdf').toLowerCase();
  if (fmt === 'xlsx') return 'excel';
  if (fmt === 'doc' || fmt === 'word') return 'word';
  return fmt;
}

function allowedExportFormats(role) {
  return EXPORT_FORMATS_BY_ROLE[normalizeRole(role)] || ['pdf'];
}

function isExportFormatAllowed(role, format) {
  return allowedExportFormats(role).includes(normalizeExportFormat(format));
}

module.exports = {
  VALID_ROLES,
  DEFAULT_ROLE,
  OWNER_ROLES,
  ROLE_LABELS,
  EXPORT_FORMATS_BY_ROLE,
  normalizeRole,
  formatRoleLabel,
  normalizeExportFormat,
  allowedExportFormats,
  isExportFormatAllowed,
};
