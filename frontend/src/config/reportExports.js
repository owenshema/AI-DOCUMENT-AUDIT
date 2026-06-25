import { normalizeRole } from './roles';

/** Report export formats allowed per role (auditor may also export Excel). */
export const EXPORT_FORMATS_BY_ROLE = {
  client: ['pdf'],
  document_manager: ['pdf'],
  administrator: ['pdf'],
  auditor: ['pdf', 'excel'],
};

export function exportFormatIdsForRole(role) {
  return EXPORT_FORMATS_BY_ROLE[normalizeRole(role)] || ['pdf'];
}

export function canExportFormat(role, formatId) {
  return exportFormatIdsForRole(role).includes(String(formatId || 'pdf').toLowerCase());
}

/** Human-readable export hint for the reports page banner. */
export function exportHintForRole(role) {
  const formats = exportFormatIdsForRole(role);
  if (formats.length === 1) return 'PDF only';
  return formats.map(function (f) { return f.toUpperCase(); }).join(' and ');
}
