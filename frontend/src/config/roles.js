/** System role keys and display labels. */

export const ROLE_LABELS = {
  administrator: 'Administrator',
  auditor: 'Auditor',
  document_manager: 'Document Manager',
  client: 'Client',
};

/** Map legacy viewer role to client. */
export function normalizeRole(role) {
  if (!role || role === 'viewer') return 'client';
  return role;
}

export function formatRoleLabel(role) {
  const key = normalizeRole(role);
  return ROLE_LABELS[key] || key.replace(/_/g, ' ');
}

export const OWNER_ROLES = ['client'];

export function isOwnerRole(role) {
  return OWNER_ROLES.includes(normalizeRole(role));
}
