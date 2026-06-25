import { normalizeRole } from './roles';

export const ROLE_SECTIONS = [
  {
    id: 'client',
    role: 'client',
    title: 'Client',
    tag: 'Client portal',
    scope: 'Your uploaded documents and audit status',
    headerClass: 'bg-blue-600',
    headerLight: 'bg-blue-50 border-blue-100',
    accent: 'blue',
  },
  {
    id: 'document_manager',
    role: 'document_manager',
    title: 'Document Manager',
    tag: 'Your uploads',
    scope: 'Same as client — your uploaded documents and audit status',
    headerClass: 'bg-emerald-600',
    headerLight: 'bg-emerald-50 border-emerald-100',
    accent: 'emerald',
  },
  {
    id: 'auditor',
    role: 'auditor',
    title: 'Auditor',
    tag: 'Performs audits',
    scope: 'Your audit queue and completion rate only',
    headerClass: 'bg-orange-500',
    headerLight: 'bg-orange-50 border-orange-100',
    accent: 'orange',
  },
  {
    id: 'administrator',
    role: 'administrator',
    title: 'Admin',
    tag: 'System-wide access',
    scope: 'User history, all users, and document upload status',
    headerClass: 'bg-violet-600',
    headerLight: 'bg-violet-50 border-violet-100',
    accent: 'violet',
  },
];

export const CLIENT_REPORT_ID = 'my_documents_status';

/** Report IDs each role may open (must match backend ACCESS_MAP). */
export const ACCESS_BY_ROLE = {
  client: [CLIENT_REPORT_ID],
  document_manager: [CLIENT_REPORT_ID],
  auditor: ['my_audit_queue', 'audit_completion_rate'],
  administrator: ['user_activity', 'all_users', 'document_inventory'],
};

export const ROLE_REPORTS = [
  {
    id: CLIENT_REPORT_ID,
    section: 'client',
    title: 'My uploads & status',
    description: 'All documents you uploaded and their current audit status. Export is PDF only.',
  },
  {
    id: CLIENT_REPORT_ID,
    section: 'document_manager',
    title: 'My uploads & status',
    description: 'All documents you uploaded and their current audit status. Export is PDF only.',
  },
  { id: 'my_audit_queue', section: 'auditor', title: 'My audit queue', description: 'Assigned documents with priority, age, and deadlines' },
  { id: 'audit_completion_rate', section: 'auditor', title: 'Audit completion rate', description: 'Pass/fail/revision breakdown across your completed audits' },
  { id: 'user_activity', section: 'administrator', title: 'User activity history', description: 'Logins, uploads, audits, and actions per user over time' },
  { id: 'all_users', section: 'administrator', title: 'All users', description: 'Every registered user with role, account status, and last login' },
  {
    id: 'document_inventory',
    section: 'administrator',
    title: 'All documents & status',
    description: 'Every uploaded document with owner and current audit status',
  },
];

export function sectionsForUserRole(role) {
  const normalized = normalizeRole(role);
  return ROLE_SECTIONS.filter((s) => s.role === normalized);
}

export function reportsForSection(sectionId) {
  const sectionReports = ROLE_REPORTS.filter((r) => r.section === sectionId);
  if (sectionId === 'client' || sectionId === 'document_manager') {
    return sectionReports.filter((r) => r.id === CLIENT_REPORT_ID);
  }
  return sectionReports;
}

export function canAccessReport(reportId, role) {
  const normalized = normalizeRole(role);
  const allowed = ACCESS_BY_ROLE[normalized] || [];
  return allowed.includes(reportId);
}
