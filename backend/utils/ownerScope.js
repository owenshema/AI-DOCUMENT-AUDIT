'use strict';

const { Op, literal } = require('sequelize');
const { OWNER_ROLES, normalizeRole } = require('./roles');

function isOwnerRole(role) {
  return OWNER_ROLES.includes(normalizeRole(role));
}

function getAssignedClientIds(document) {
  const ids = document?.metadata?.assignedClientIds;
  return Array.isArray(ids) ? ids.filter(Boolean) : [];
}

function isDocumentAssignedToUser(document, userId) {
  if (!userId) return false;
  return getAssignedClientIds(document).includes(userId);
}

/** Documents visible to client: own uploads + documents assigned by document manager. */
function documentWhereForUser(user) {
  if (!user?.id) return {};
  if (normalizeRole(user.role) === 'client') {
    const safeId = String(user.id).replace(/'/g, "''");
    return {
      [Op.or]: [
        { uploadedBy: user.id },
        literal(`COALESCE(metadata->'assignedClientIds', '[]'::jsonb) @> '["${safeId}"]'::jsonb`),
      ],
    };
  }
  return {};
}

function userOwnsDocument(document, userId, role) {
  const normalized = normalizeRole(role);
  if (normalized === 'administrator' || normalized === 'auditor' || normalized === 'document_manager') {
    return true;
  }
  if (document?.uploadedBy === userId) return true;
  if (normalized === 'client' && isDocumentAssignedToUser(document, userId)) return true;
  return false;
}

module.exports = {
  OWNER_ROLES,
  isOwnerRole,
  getAssignedClientIds,
  isDocumentAssignedToUser,
  documentWhereForUser,
  userOwnsDocument,
};
