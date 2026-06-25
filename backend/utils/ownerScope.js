'use strict';

const { OWNER_ROLES, normalizeRole } = require('./roles');

function isOwnerRole(role) {
  return OWNER_ROLES.includes(normalizeRole(role));
}

/** Documents visible to client / document_manager: only their own uploads. */
function documentWhereForUser(user) {
  if (!user?.id) return {};
  if (isOwnerRole(user.role)) {
    return { uploadedBy: user.id };
  }
  return {};
}

function userOwnsDocument(document, userId, role) {
  const normalized = normalizeRole(role);
  if (normalized === 'administrator' || normalized === 'auditor') return true;
  return document?.uploadedBy === userId;
}

module.exports = {
  OWNER_ROLES,
  isOwnerRole,
  documentWhereForUser,
  userOwnsDocument,
};
