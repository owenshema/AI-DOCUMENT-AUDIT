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
    accent: 'indigo',
  },
  {
    id: 'document_manager',
    role: 'document_manager',
    title: 'Document Manager',
    tag: 'Your uploads',
    scope: 'Your documents, pipeline, and compliance',
    headerClass: 'bg-blue-600',
    headerLight: 'bg-blue-50 border-blue-100',
    accent: 'indigo',
  },
  {
    id: 'auditor',
    role: 'auditor',
    title: 'Auditor',
    tag: 'Performs audits',
    scope: 'Queue, completion rate, findings, and compliance',
    headerClass: 'bg-blue-600',
    headerLight: 'bg-blue-50 border-blue-100',
    accent: 'indigo',
  },
  {
    id: 'administrator',
    role: 'administrator',
    title: 'Admin',
    tag: 'System-wide access',
    scope: 'Users, documents, compliance, and system health',
    headerClass: 'bg-blue-600',
    headerLight: 'bg-blue-50 border-blue-100',
    accent: 'indigo',
  },
];

export const CLIENT_REPORT_ID = 'my_documents_status';

/** Report IDs each role may open (must match backend ACCESS_MAP). */
export const ACCESS_BY_ROLE = {
  client: [CLIENT_REPORT_ID, 'activity_report', 'upload_history', 'audit_findings_received'],
  document_manager: [
    CLIENT_REPORT_ID, 'activity_report', 'upload_history', 'pending_review',
    'document_compliance',
  ],
  auditor: [
    'my_audit_queue', 'audit_completion_rate', 'activity_report', 'common_findings',
    'document_compliance', 'workload_history', 'time_to_audit',
  ],
  administrator: [
    'activity_report', 'user_activity', 'all_users', 'document_inventory',
    'document_compliance', 'system_audit_summary', 'auditor_performance',
    'system_health', 'ai_confidence_scores', 'inactive_users',
  ],
};

export const ROLE_REPORTS = [
  {
    id: CLIENT_REPORT_ID,
    section: 'client',
    title: 'My uploads & status',
    description: 'All documents you uploaded and their current audit status. Export is PDF only.',
  },
  {
    id: 'activity_report',
    section: 'client',
    title: 'Activity report',
    description: 'Only your own actions — logins, uploads, and document activity with date and time',
  },
  {
    id: 'upload_history',
    section: 'client',
    title: 'Upload history',
    description: 'Timeline of your uploads with file size and date',
  },
  {
    id: 'audit_findings_received',
    section: 'client',
    title: 'Audit findings received',
    description: 'Findings and scores returned on your documents',
  },

  {
    id: CLIENT_REPORT_ID,
    section: 'document_manager',
    title: 'My uploads & status',
    description: 'All documents you uploaded and their current audit status. Export is PDF only.',
  },
  {
    id: 'activity_report',
    section: 'document_manager',
    title: 'Activity report',
    description: 'Only your own actions — logins, uploads, and document activity with date and time',
  },
  {
    id: 'upload_history',
    section: 'document_manager',
    title: 'Upload history',
    description: 'Timeline of your uploads with file size and date',
  },
  {
    id: 'pending_review',
    section: 'document_manager',
    title: 'Pending review',
    description: 'Your documents still awaiting auditor action',
  },
  {
    id: 'document_compliance',
    section: 'document_manager',
    title: 'Document compliance',
    description: 'Live compliance scores from AI audits in the database',
  },

  { id: 'my_audit_queue', section: 'auditor', title: 'My audit queue', description: 'Documents awaiting audit action' },
  { id: 'audit_completion_rate', section: 'auditor', title: 'Audit completion rate', description: 'Pass/fail/revision breakdown from your completed AI audits' },
  {
    id: 'document_compliance',
    section: 'auditor',
    title: 'Document compliance',
    description: 'Compliance scores pulled live from document analyses',
  },
  { id: 'common_findings', section: 'auditor', title: 'Common findings', description: 'Recurring issues flagged across audits' },
  { id: 'workload_history', section: 'auditor', title: 'Workload history', description: 'Your audit throughput over time' },
  { id: 'time_to_audit', section: 'auditor', title: 'Time-to-audit', description: 'Average time taken per document type' },
  {
    id: 'activity_report',
    section: 'auditor',
    title: 'Activity report',
    description: 'Only your own logins, audits, and actions with date and time for the selected period',
  },

  {
    id: 'activity_report',
    section: 'administrator',
    title: 'Activity report',
    description: 'Only your own actions with date and time (use User activity history for all users)',
  },
  { id: 'user_activity', section: 'administrator', title: 'User activity history', description: 'Logins, uploads, audits, and actions per user over time' },
  { id: 'all_users', section: 'administrator', title: 'All users', description: 'Every registered user with role, account status, and last login' },
  {
    id: 'document_inventory',
    section: 'administrator',
    title: 'All documents & status',
    description: 'Every uploaded document with owner, status, and live audit score',
  },
  {
    id: 'document_compliance',
    section: 'administrator',
    title: 'Document compliance',
    description: 'Pass rate and per-document compliance scores from the database',
  },
  {
    id: 'system_audit_summary',
    section: 'administrator',
    title: 'System audit summary',
    description: 'Org-wide document counts, analyses, and average compliance score',
  },
  {
    id: 'auditor_performance',
    section: 'administrator',
    title: 'Auditor performance',
    description: 'Completed audits and average scores per auditor',
  },
  {
    id: 'ai_confidence_scores',
    section: 'administrator',
    title: 'AI confidence scores',
    description: 'Distribution of AI audit scores from document analyses',
  },
  {
    id: 'system_health',
    section: 'administrator',
    title: 'System health',
    description: 'Storage, analysis volume, and failed actions',
  },
  {
    id: 'inactive_users',
    section: 'administrator',
    title: 'Inactive users',
    description: 'Accounts with no recent login',
  },
];

export function sectionsForUserRole(role) {
  const normalized = normalizeRole(role);
  return ROLE_SECTIONS.filter((s) => s.role === normalized);
}

export function reportsForSection(sectionId) {
  return ROLE_REPORTS.filter((r) => r.section === sectionId);
}

export function canAccessReport(reportId, role) {
  if (reportId === 'activity_report') return true;
  const normalized = normalizeRole(role);
  const allowed = ACCESS_BY_ROLE[normalized] || [];
  return allowed.includes(reportId);
}
