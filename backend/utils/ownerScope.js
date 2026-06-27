'use strict';

const { OWNER_ROLES, normalizeRole } = require('./roles');

function isOwnerRole(role) {
  return OWNER_ROLES.includes(normalizeRole(role));
}

/** Documents visible to client: only their own uploads. Managers/auditors/admins see all. */
function documentWhereForUser(user) {
  if (!user?.id) return {};
  if (normalizeRole(user.role) === 'client') {
    return { uploadedBy: user.id };
  }
  return {};
}

function userOwnsDocument(document, userId, role) {
  const normalized = normalizeRole(role);
  if (normalized === 'administrator' || normalized === 'auditor' || normalized === 'document_manager') {
    return true;
  }
  return document?.uploadedBy === userId;
}

module.exports = {
  OWNER_ROLES,
  isOwnerRole,
  documentWhereForUser,
  userOwnsDocument,
};
