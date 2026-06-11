'use strict';

export const ROLE_SECTIONS = [
  {
    id: 'viewer',
    role: 'viewer',
    title: 'Viewer',
    tag: 'Uploads & tracks',
    scope: 'Personal activity only',
    headerClass: 'bg-blue-600',
    headerLight: 'bg-blue-50 border-blue-100',
    accent: 'blue',
  },
  {
    id: 'document_manager',
    role: 'document_manager',
    title: 'Document Manager',
    tag: 'Manages docs',
    scope: 'All documents in the system',
    headerClass: 'bg-emerald-600',
    headerLight: 'bg-emerald-50 border-emerald-100',
    accent: 'emerald',
  },
  {
    id: 'auditor',
    role: 'auditor',
    title: 'Auditor',
    tag: 'Performs audits',
    scope: 'Own workload + aggregate quality data',
    headerClass: 'bg-orange-500',
    headerLight: 'bg-orange-50 border-orange-100',
    accent: 'orange',
  },
  {
    id: 'administrator',
    role: 'administrator',
    title: 'Admin',
    tag: 'System-wide access',
    scope: 'All reports across all roles',
    headerClass: 'bg-violet-600',
    headerLight: 'bg-violet-50 border-violet-100',
    accent: 'violet',
  },
];

export const ROLE_REPORTS = [
  { id: 'my_documents_status', section: 'viewer', title: 'My documents status', description: 'List of uploaded docs with current audit stage and status' },
  { id: 'upload_history', section: 'viewer', title: 'Upload history', description: 'Timeline of all uploads made, including file size and date' },
  { id: 'audit_findings_received', section: 'viewer', title: 'Audit findings received', description: 'Summary of findings returned on their documents' },
  { id: 'pending_review', section: 'viewer', title: 'Pending review', description: 'Documents awaiting auditor assignment or action' },

  { id: 'document_inventory', section: 'document_manager', title: 'Document inventory', description: 'Full list of all documents, owners, and current status' },
  { id: 'pipeline_status', section: 'document_manager', title: 'Pipeline status', description: 'Documents at each audit stage — pending, in-review, completed' },
  { id: 'overdue_documents', section: 'document_manager', title: 'Overdue documents', description: 'Docs breaching SLA or stuck without auditor action' },
  { id: 'rejection_revision_log', section: 'document_manager', title: 'Rejection & revision log', description: 'Documents returned for revision and resubmission counts' },
  { id: 'version_history', section: 'document_manager', title: 'Version history', description: 'Revision trail across all document versions' },
  { id: 'submission_volume_trend', section: 'document_manager', title: 'Submission volume trend', description: 'Monthly/weekly upload counts to plan auditor capacity' },

  { id: 'my_audit_queue', section: 'auditor', title: 'My audit queue', description: 'Assigned documents with priority, age, and deadlines' },
  { id: 'audit_completion_rate', section: 'auditor', title: 'Audit completion rate', description: 'Pass/fail/revision breakdown across completed audits' },
  { id: 'time_to_audit', section: 'auditor', title: 'Time-to-audit', description: 'Average time taken per document type vs target SLA' },
  { id: 'common_findings', section: 'auditor', title: 'Common findings', description: 'Recurring issues flagged, grouped by category' },
  { id: 'audit_trail_log', section: 'auditor', title: 'Audit trail log', description: 'Full log of every action taken on each audited document' },
  { id: 'workload_history', section: 'auditor', title: 'Workload history', description: 'Personal throughput over time — useful for productivity review' },

  { id: 'user_activity', section: 'administrator', title: 'User activity', description: 'Logins, uploads, audits, and actions per user over time' },
  { id: 'role_access_log', section: 'administrator', title: 'Role & access log', description: 'History of role assignments, changes, and permission events' },
  { id: 'system_audit_summary', section: 'administrator', title: 'System audit summary', description: 'Org-wide audit completion stats, SLA adherence, and backlogs' },
  { id: 'auditor_performance', section: 'administrator', title: 'Auditor performance', description: 'Compare throughput, accuracy, and SLA compliance across auditors' },
  { id: 'document_compliance', section: 'administrator', title: 'Document compliance', description: 'Overall pass rate, flagged categories, and compliance trends' },
  { id: 'system_health', section: 'administrator', title: 'System health', description: 'Storage usage, AI model performance, and error rate monitoring' },
  { id: 'inactive_users', section: 'administrator', title: 'Inactive users', description: 'Accounts with no recent activity — for access review and cleanup' },
  { id: 'ai_confidence_scores', section: 'administrator', title: 'AI confidence scores', description: 'Distribution of AI-generated audit confidence vs human review outcomes' },
];

export function sectionsForUserRole(role) {
  if (role === 'administrator') return ROLE_SECTIONS;
  return ROLE_SECTIONS.filter((s) => s.role === role);
}

export function reportsForSection(sectionId) {
  return ROLE_REPORTS.filter((r) => r.section === sectionId);
}

export function canAccessReport(reportId, role) {
  const report = ROLE_REPORTS.find((r) => r.id === reportId);
  if (!report) return false;
  if (role === 'administrator') return true;
  return report.section === role;
}
