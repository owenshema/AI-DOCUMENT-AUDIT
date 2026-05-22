export const PROCESS_STAGES = [
  { key: 'ingestion', title: 'Ingestion', steps: ['Upload document', 'OCR & metadata', 'Duplicate detection'] },
  { key: 'ai', title: 'AI Engine', steps: ['AI content analysis', 'Entity recognition', 'Anomaly detection'] },
  { key: 'compliance', title: 'Compliance', steps: ['Compliance check', 'Flag violations', 'Assign workflow'] },
  { key: 'audit', title: 'Compliance & Audit', steps: ['Log audit trail', 'Generate audit report', 'Apply retention policy'] },
];

export const ROLE_PERMISSIONS = {
  document_manager: {
    label: 'Document Manager',
    allowed: ['documents', 'ai-analysis', 'compliance', 'audit-reports'],
  },
  viewer: {
    label: 'Viewer',
    allowed: ['documents'],
  },
  auditor: {
    label: 'Auditor',
    allowed: ['documents', 'ai-analysis', 'compliance', 'audit-reports', 'user-access'],
  },
  administrator: {
    label: 'Administrator',
    allowed: ['documents', 'ai-analysis', 'compliance', 'audit-reports', 'user-access', 'settings'],
  },
};

export const FEATURE_LOGIC = {
  documents: {
    title: 'Documents',
    objective: 'Manage document lifecycle from upload to archived state.',
    actions: ['Upload files', 'Review & approve', 'Save versions', 'Search documents'],
  },
  'ai-analysis': {
    title: 'AI Analysis',
    objective: 'Run OCR, extraction, and anomaly detection on ingested files.',
    actions: ['OCR processing', 'Entity extraction', 'Anomaly detection', 'Confidence scoring'],
  },
  compliance: {
    title: 'Compliance',
    objective: 'Evaluate policy conformance and assign remediation workflows.',
    actions: ['Run compliance check', 'Flag violations', 'Assign tasks', 'Track corrective actions'],
  },
  'audit-reports': {
    title: 'Audit Reports',
    objective: 'Generate evidence-ready reports from workflow and compliance outcomes.',
    actions: ['Compile findings', 'Export reports', 'Track report periods', 'Schedule recurring reports'],
  },
  'user-access': {
    title: 'User Access',
    objective: 'Control access rights by role and department.',
    actions: ['Manage users', 'Assign roles', 'Review access rights', 'Enforce least privilege'],
  },
  settings: {
    title: 'Settings',
    objective: 'Configure retention, legal hold, and platform governance controls.',
    actions: ['Apply retention policy', 'Set legal hold', 'Configure notifications', 'Manage policy rules'],
  },
};
