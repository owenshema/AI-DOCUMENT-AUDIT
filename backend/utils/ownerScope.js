'use strict';

const OWNER_ROLES = ['viewer', 'document_manager'];

function isOwnerRole(role) {
  return OWNER_ROLES.includes(role);
}

/** Documents visible to viewer / document_manager: only their own uploads. */
function documentWhereForUser(user) {
  if (!user?.id) return {};
  if (isOwnerRole(user.role)) {
    return { uploadedBy: user.id };
  }
  return {};
}

function userOwnsDocument(document, userId, role) {
  if (role === 'administrator' || role === 'auditor') return true;
  return document?.uploadedBy === userId;
}

module.exports = {
  OWNER_ROLES,
  isOwnerRole,
  documentWhereForUser,
  userOwnsDocument,
};
