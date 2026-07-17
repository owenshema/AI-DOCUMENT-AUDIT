'use strict';

const { Op } = require('sequelize');
const { normalizeRole } = require('../utils/roles');
const { parseDeviceFromUserAgent } = require('../utils/loginContext');

const REPORT_META = {
  my_documents_status: { title: 'My uploads & status', description: 'All documents you uploaded and their current audit status' },
  upload_history: { title: 'Upload history', description: 'Timeline of all uploads made, including file size and date' },
  audit_findings_received: { title: 'Audit findings received', description: 'Summary of findings returned on their documents' },
  pending_review: { title: 'Pending review', description: 'Documents awaiting auditor assignment or action' },
  document_inventory: { title: 'Document inventory', description: 'Full list of all documents, owners, and current status' },
  pipeline_status: { title: 'Pipeline status', description: 'Documents at each audit stage — pending, in-review, completed' },
  overdue_documents: { title: 'Overdue documents', description: 'Docs breaching SLA or stuck without auditor action' },
  rejection_revision_log: { title: 'Rejection & revision log', description: 'Documents returned for revision and resubmission counts' },
  version_history: { title: 'Version history', description: 'Revision trail across all document versions' },
  submission_volume_trend: { title: 'Submission volume trend', description: 'Monthly/weekly upload counts to plan auditor capacity' },
  my_audit_queue: { title: 'My audit queue', description: 'Assigned documents with priority, age, and deadlines' },
  audit_completion_rate: { title: 'Audit completion rate', description: 'Pass/fail/revision breakdown across completed audits' },
  time_to_audit: { title: 'Time-to-audit', description: 'Average time taken per document type vs target SLA' },
  common_findings: { title: 'Common findings', description: 'Recurring issues flagged, grouped by category' },
  audit_trail_log: { title: 'Audit trail log', description: 'Full log of every action taken on each audited document' },
  workload_history: { title: 'Workload history', description: 'Personal throughput over time — useful for productivity review' },
  activity_report: { title: 'Activity report', description: 'User actions with date and time for the selected period — logins, uploads, audits, and more' },
  user_activity: { title: 'User activity', description: 'Logins, uploads, audits, and actions per user over time' },
  role_access_log: { title: 'Role & access log', description: 'History of role assignments, changes, and permission events' },
  system_audit_summary: { title: 'System audit summary', description: 'Org-wide audit completion stats, SLA adherence, and backlogs' },
  auditor_performance: { title: 'Auditor performance', description: 'Compare throughput, accuracy, and SLA compliance across auditors' },
  document_compliance: { title: 'Document compliance', description: 'Overall pass rate, flagged categories, and compliance trends' },
  system_health: { title: 'System health', description: 'Storage usage, AI model performance, and error rate monitoring' },
  inactive_users: { title: 'Inactive users', description: 'Accounts with no recent activity — for access review and cleanup' },
  ai_confidence_scores: { title: 'AI confidence scores', description: 'Distribution of AI-generated audit confidence vs human review outcomes' },
  all_users: { title: 'All users', description: 'Every registered user with role, account status, and last login' },
};

function docScope(user) {
  var role = normalizeRole(user.role);
  if (role === 'client' || role === 'document_manager') return { uploadedBy: user.id };
  return {};
}

function scopeLabelForRole(role) {
  role = normalizeRole(role);
  if (role === 'client' || role === 'document_manager') return 'Personal — your uploads only';
  if (role === 'auditor') return 'Your audit queue and completion metrics';
  if (role === 'administrator') return 'System-wide';
  return 'Scoped';
}

async function scopedDocumentIds(models, user) {
  var where = docScope(user);
  if (!Object.keys(where).length) return null;
  var docs = await models.Document.findAll({ where: where, attributes: ['id'] });
  return docs.map(function (d) { return d.id; });
}

async function analysisWhere(models, user, ctx) {
  var where = fieldInPeriod('createdAt', ctx);
  var docIds = await scopedDocumentIds(models, user);
  if (docIds) {
    where.documentId = { [Op.in]: docIds.length ? docIds : ['00000000-0000-0000-0000-000000000000'] };
  }
  return where;
}

function logWhere(user, ctx) {
  var where = fieldInPeriod('createdAt', ctx);
  if (user.role === 'client' || user.role === 'document_manager') {
    where.userId = user.id;
  }
  return where;
}

async function loadAnalyses(models, user, ctx, limit) {
  return models.DocumentAnalysis.findAll({
    where: await analysisWhere(models, user, ctx),
    include: [{ model: models.Document, attributes: ['id', 'title', 'status', 'category', 'uploadedBy'], required: false }],
    order: [['createdAt', 'DESC']],
    limit: limit || 200,
  });
}

function violationsFromAnalysis(a) {
  var res = a.results || {};
  var list = Array.isArray(res.violations) ? res.violations : [];
  return list.map(function (v) {
    if (typeof v === 'string') return { title: v, summary: v, severity: 'MEDIUM' };
    return {
      title: v.title || v.check || 'Finding',
      summary: v.summary || v.message || v.detail || '',
      severity: v.severity || 'MEDIUM',
    };
  });
}

function complianceFromAnalysis(a) {
  var res = a.results || {};
  if (res.compliance_score != null) return Number(res.compliance_score);
  if (res.complianceScore != null) return Number(res.complianceScore);
  if (a.confidence != null) return Math.round(Number(a.confidence) * 100);
  return null;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Plain-language labels for report readers (no IT jargon). */
var ACTION_LABELS = {
  login: 'Signed in',
  successful_login: 'Signed in',
  failed_login: 'Sign-in failed',
  failed_otp: 'Verification code failed',
  login_blocked: 'Sign-in blocked',
  account_locked: 'Account locked',
  logout: 'Signed out',
  user_registered: 'Created an account',
  register: 'Created an account',
  email_verified: 'Verified email',
  password_changed: 'Changed password',
  password_reset_requested: 'Requested password reset',
  password_reset_completed: 'Reset password',
  document_upload: 'Uploaded a document',
  upload: 'Uploaded a document',
  document_uploaded: 'Uploaded a document',
  bulk_upload: 'Uploaded several documents',
  document_delete: 'Deleted a document',
  document_deleted: 'Deleted a document',
  document_update: 'Updated a document',
  document_reupload: 'Re-uploaded a document',
  document_status_update: 'Returned audit decision',
  document_assigned: 'Assigned document to client',
  client_document_request: 'Requested a document',
  document_request: 'Requested a document',
  request_audit: 'Asked auditor to review',
  analysis: 'Ran document audit',
  document_analysis: 'Ran document audit',
  analyze: 'Ran document audit',
  mfa_setup: 'Set up extra security',
  mfa_verified: 'Verified security code',
  mfa_failed: 'Security code failed',
  role_updated: 'Changed user role',
  user_status_updated: 'Updated account status',
  user_deleted: 'Removed a user',
  security_event: 'Security notice',
};

function humanizeHttpStyleAction(raw) {
  var m = String(raw || '').toLowerCase().match(/^(get|post|put|patch|delete|head|options)[_/\s-]+(.+)$/);
  if (!m) return null;
  var method = m[1];
  var resource = m[2].replace(/[_/\\.-]+/g, ' ').trim();
  var topic = 'item';
  if (/document|upload|file/i.test(resource)) topic = 'document';
  else if (/auth|login|otp|password|user/i.test(resource)) topic = 'account';
  else if (/report/i.test(resource)) topic = 'report';
  else if (/audit|analysis|compliance/i.test(resource)) topic = 'audit';
  else if (/task|workflow/i.test(resource)) topic = 'task';
  else if (/dashboard|stat/i.test(resource)) topic = 'dashboard';
  else if (/notification/i.test(resource)) topic = 'notification';
  else if (/search/i.test(resource)) topic = 'search';
  if (method === 'get') {
    if (topic === 'document') return 'Viewed documents';
    if (topic === 'report') return 'Viewed a report';
    if (topic === 'audit') return 'Viewed audit information';
    if (topic === 'dashboard') return 'Opened the dashboard';
    if (topic === 'account') return 'Viewed account information';
    return 'Viewed information';
  }
  if (method === 'post') {
    if (topic === 'document') return 'Submitted a document';
    if (topic === 'audit') return 'Started an audit';
    if (topic === 'report') return 'Generated a report';
    if (topic === 'account') return 'Updated account';
    if (topic === 'search') return 'Searched';
    return 'Saved a change';
  }
  if (method === 'put' || method === 'patch') {
    if (topic === 'document') return 'Updated a document';
    if (topic === 'account') return 'Updated account';
    return 'Updated information';
  }
  if (method === 'delete') {
    if (topic === 'document') return 'Deleted a document';
    return 'Removed an item';
  }
  return 'Activity';
}

function humanizeAction(action) {
  var raw = String(action || '').trim();
  if (!raw) return 'Activity';
  var key = raw.toLowerCase().replace(/\s+/g, '_');
  if (ACTION_LABELS[key]) return ACTION_LABELS[key];
  var httpLabel = humanizeHttpStyleAction(raw);
  if (httpLabel) return httpLabel;
  if (/login/i.test(raw) && /fail/i.test(raw)) return 'Sign-in failed';
  if (/login|sign.?in/i.test(raw)) return 'Signed in';
  if (/logout|sign.?out/i.test(raw)) return 'Signed out';
  if (/upload/i.test(raw)) return 'Uploaded a document';
  if (/assign/i.test(raw)) return 'Assigned a document';
  if (/request/i.test(raw) && /document|magerwa|cargo/i.test(raw)) return 'Requested a document';
  if (/audit|analysis|compliance/i.test(raw)) return 'Worked on an audit';
  if (/status/i.test(raw)) return 'Updated status';
  if (/password/i.test(raw)) return 'Password update';
  if (/role|permission|access/i.test(raw)) return 'Access change';
  if (/delete|remove/i.test(raw)) return 'Removed an item';
  if (/download|export/i.test(raw)) return 'Downloaded a file';
  // Strip technical leftovers and title-case remaining words
  var cleaned = raw
    .replace(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/gi, '')
    .replace(/[_/\\.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Activity';
  return cleaned.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

function humanizeDetails(text) {
  if (text == null || text === '') return '—';
  var s = String(text);
  s = s
    .replace(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/gi, '')
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/\/api\/[^\s,]*/gi, '')
    .replace(/\b(api|endpoint|json|uuid|jwt|smtp|http|https|localhost)\b/gi, '')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '')
    .replace(/[_/\\]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim();
  return s || '—';
}

function humanizeStatus(status) {
  var s = String(status || '').toLowerCase();
  if (!s || s === '—' || s === 'unknown') return '—';
  if (s === 'success' || s === 'ok' || s === 'completed') return 'Done';
  if (s === 'failure' || s === 'failed' || s === 'error') return 'Failed';
  if (s === 'pending') return 'Pending';
  return humanizeDetails(status);
}

function humanizeResource(resourceType) {
  var r = String(resourceType || '').toLowerCase();
  if (!r || r === '—') return '—';
  if (r === 'auth') return 'Account';
  if (r === 'document' || r === 'documents') return 'Document';
  if (r === 'user' || r === 'users') return 'User';
  if (r === 'analysis' || r === 'audit') return 'Audit';
  if (r === 'report') return 'Report';
  return humanizeDetails(resourceType);
}

function fmtBytes(n) {
  if (!n) return '—';
  var kb = Number(n) / 1024;
  if (kb < 1024) return Math.round(kb) + ' KB';
  return (kb / 1024).toFixed(1) + ' MB';
}

function daysSince(d) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function ymdLocal(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function startOfLocalDay(d) {
  var x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d) {
  var x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseYmd(str) {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(String(str).trim())) return null;
  var parts = String(str).trim().split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/** Resolve report window from query: preset=yesterday | date=YYYY-MM-DD | startDate/endDate | days */
function resolvePeriod(query) {
  query = query || {};
  var preset = String(query.preset || '').toLowerCase().trim();
  var single = parseYmd(query.date);
  var startDate = parseYmd(query.startDate);
  var endDate = parseYmd(query.endDate);

  if (preset === 'yesterday') {
    var y = new Date();
    y.setDate(y.getDate() - 1);
    var yStart = startOfLocalDay(y);
    var yEnd = endOfLocalDay(y);
    return {
      since: yStart,
      until: yEnd,
      days: 1,
      periodLabel: 'Yesterday (' + ymdLocal(y) + ')',
      periodStart: yStart.toISOString(),
      periodEnd: yEnd.toISOString(),
    };
  }

  if (preset === 'today') {
    var t = new Date();
    var tStart = startOfLocalDay(t);
    var tEnd = endOfLocalDay(t);
    return {
      since: tStart,
      until: tEnd,
      days: 1,
      periodLabel: 'Today (' + ymdLocal(t) + ')',
      periodStart: tStart.toISOString(),
      periodEnd: tEnd.toISOString(),
    };
  }

  if (single) {
    var sStart = startOfLocalDay(single);
    var sEnd = endOfLocalDay(single);
    return {
      since: sStart,
      until: sEnd,
      days: 1,
      periodLabel: ymdLocal(single),
      periodStart: sStart.toISOString(),
      periodEnd: sEnd.toISOString(),
    };
  }

  if (startDate || endDate) {
    var since = startOfLocalDay(startDate || endDate);
    var until = endOfLocalDay(endDate || startDate || new Date());
    if (until < since) {
      var tmp = since;
      since = startOfLocalDay(until);
      until = endOfLocalDay(tmp);
    }
    var spanDays = Math.max(1, Math.round((until - since) / 86400000) + 1);
    return {
      since: since,
      until: until,
      days: spanDays,
      periodLabel: ymdLocal(since) + ' – ' + ymdLocal(until),
      periodStart: since.toISOString(),
      periodEnd: until.toISOString(),
    };
  }

  var days = Math.min(Math.max(parseInt(query.days, 10) || 90, 1), 365);
  var until = new Date();
  var sinceRoll = new Date(Date.now() - days * 86400000);
  return {
    since: sinceRoll,
    until: until,
    days: days,
    periodLabel: 'Last ' + days + ' days',
    periodStart: sinceRoll.toISOString(),
    periodEnd: until.toISOString(),
  };
}

function fieldInPeriod(field, ctx) {
  var range = {};
  if (ctx.since) range[Op.gte] = ctx.since;
  if (ctx.until) range[Op.lte] = ctx.until;
  if (!Object.keys(range).length && !(ctx.since || ctx.until)) return {};
  // Sequelize Op keys are Symbols — keep a plain object for callers
  var out = {};
  out[field] = range;
  return out;
}

/** Keep only rows whose date field falls inside the selected report window. */
function filterRowsInPeriod(rows, dateField, ctx) {
  if (!ctx || (!ctx.since && !ctx.until)) return rows || [];
  var sinceMs = ctx.since ? new Date(ctx.since).getTime() : null;
  var untilMs = ctx.until ? new Date(ctx.until).getTime() : null;
  return (rows || []).filter(function (row) {
    var raw = row[dateField] || row.get?.(dateField);
    if (!raw) return false;
    var t = new Date(raw).getTime();
    if (Number.isNaN(t)) return false;
    if (sinceMs != null && t < sinceMs) return false;
    if (untilMs != null && t > untilMs) return false;
    return true;
  });
}

async function loadUsersMap(models, ids) {
  var map = {};
  if (!ids.length) return map;
  var users = await models.User.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'fullName', 'email', 'role'],
  });
  users.forEach(function (u) {
    map[u.id] = u.fullName || u.email || u.id;
  });
  return map;
}

async function buildReport(reportId, models, user, query) {
  var meta = REPORT_META[reportId];
  if (!meta) return null;

  var period = resolvePeriod(query);
  var where = docScope(user);
  var handlers = {
    my_documents_status: buildMyDocumentsStatus,
    upload_history: buildUploadHistory,
    audit_findings_received: buildAuditFindings,
    pending_review: buildPendingReview,
    document_inventory: buildDocumentInventory,
    pipeline_status: buildPipelineStatus,
    overdue_documents: buildOverdueDocuments,
    rejection_revision_log: buildRejectionLog,
    version_history: buildVersionHistory,
    submission_volume_trend: buildSubmissionTrend,
    my_audit_queue: buildAuditQueue,
    audit_completion_rate: buildCompletionRate,
    time_to_audit: buildTimeToAudit,
    common_findings: buildCommonFindings,
    audit_trail_log: buildAuditTrailLog,
    activity_report: buildActivityReport,
    workload_history: buildWorkloadHistory,
    user_activity: buildUserActivity,
    role_access_log: buildRoleAccessLog,
    system_audit_summary: buildSystemAuditSummary,
    auditor_performance: buildAuditorPerformance,
    document_compliance: buildDocumentCompliance,
    system_health: buildSystemHealth,
    inactive_users: buildInactiveUsers,
    ai_confidence_scores: buildAiConfidence,
    all_users: buildAllUsers,
  };

  var handler = handlers[reportId];
  if (!handler) return null;
  var payload = await handler(models, user, {
    where: where,
    since: period.since,
    until: period.until,
    days: period.days,
    user: user,
  });
  return Object.assign({
    id: reportId,
    title: meta.title,
    description: meta.description,
    generatedAt: new Date().toISOString(),
    periodDays: period.days,
    periodLabel: period.periodLabel,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    scope: ['client', 'document_manager'].includes(normalizeRole(user.role)) ? 'personal' : normalizeRole(user.role) === 'administrator' ? 'system' : 'organization',
    scopeLabel: scopeLabelForRole(user.role),
  }, payload);
}

async function buildMyDocumentsStatus(models, user, ctx) {
  var where = Object.assign({}, ctx.where || {}, fieldInPeriod('uploadedAt', ctx));
  var docs = await models.Document.findAll({
    where: where,
    order: [['uploadedAt', 'DESC']],
    limit: 500,
  });
  // Enforce selected dates in memory so UI never shows out-of-range uploads
  docs = filterRowsInPeriod(docs, 'uploadedAt', ctx).slice(0, 100);
  var docIds = docs.map(function (d) { return d.id; });
  var analyses = docIds.length
    ? await models.DocumentAnalysis.findAll({
      where: { documentId: { [Op.in]: docIds } },
      order: [['createdAt', 'DESC']],
    })
    : [];
  var latestByDoc = {};
  analyses.forEach(function (a) {
    if (!latestByDoc[a.documentId]) latestByDoc[a.documentId] = a;
  });
  var pending = docs.filter(function (d) { return /pending|uploaded|in_review|submitted/i.test(d.status); }).length;
  var audited = docs.filter(function (d) { return latestByDoc[d.id]; }).length;
  return {
    summary: { total: docs.length, pending: pending, audited: audited },
    columns: [
      { key: 'title', label: 'Document' },
      { key: 'category', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'auditScore', label: 'Audit score' },
      { key: 'uploadedAt', label: 'Uploaded' },
    ],
    rows: docs.map(function (d) {
      var a = latestByDoc[d.id];
      var score = a ? complianceFromAnalysis(a) : (d.metadata && d.metadata.latestComplianceScore);
      return {
        title: d.title,
        category: d.category,
        status: d.status,
        auditScore: score != null ? score + '%' : 'Not audited',
        uploadedAt: fmtDate(d.uploadedAt),
      };
    }),
  };
}

async function buildUploadHistory(models, user, ctx) {
  var docs = await models.Document.findAll({
    where: Object.assign({}, ctx.where, fieldInPeriod('uploadedAt', ctx)),
    order: [['uploadedAt', 'DESC']],
    limit: 100,
  });
  return {
    summary: { uploads: docs.length },
    columns: [
      { key: 'title', label: 'Document' },
      { key: 'fileName', label: 'File' },
      { key: 'fileSize', label: 'Size' },
      { key: 'uploadedAt', label: 'Date' },
    ],
    rows: docs.map(function (d) {
      return { title: d.title, fileName: d.fileName, fileSize: fmtBytes(d.fileSize), uploadedAt: fmtDate(d.uploadedAt) };
    }),
  };
}

async function buildAuditFindings(models, user, ctx) {
  var analyses = await loadAnalyses(models, user, ctx, 100);
  var rows = [];
  analyses.forEach(function (a) {
    var title = (a.Document && a.Document.title) || a.documentId;
    var violations = violationsFromAnalysis(a);
    if (violations.length) {
      violations.forEach(function (v) {
        rows.push({
          document: title,
          severity: v.severity,
          finding: v.summary || v.title,
          score: complianceFromAnalysis(a) != null ? complianceFromAnalysis(a) + '%' : '—',
          date: fmtDate(a.createdAt),
        });
      });
    } else {
      var msg = (a.results && a.results.organization_message) || a.summary || a.status || 'Audit completed';
      rows.push({
        document: title,
        severity: (a.results && a.results.risk_level) || 'INFO',
        finding: msg,
        score: complianceFromAnalysis(a) != null ? complianceFromAnalysis(a) + '%' : '—',
        date: fmtDate(a.createdAt),
      });
    }
  });
  return {
    summary: { findings: rows.length, documentsReviewed: analyses.length },
    columns: [
      { key: 'document', label: 'Document' },
      { key: 'severity', label: 'Severity' },
      { key: 'finding', label: 'Finding' },
      { key: 'score', label: 'Score' },
      { key: 'date', label: 'Date' },
    ],
    rows: rows,
  };
}

async function buildPendingReview(models, user, ctx) {
  var pendingStatuses = ['uploaded', 'in_review', 'in_progress', 'submitted', 'pending', 'draft'];
  var docs = await models.Document.findAll({
    where: Object.assign({}, ctx.where, fieldInPeriod('uploadedAt', ctx), { status: { [Op.in]: pendingStatuses } }),
    order: [['uploadedAt', 'ASC']],
    limit: 100,
  });
  return {
    summary: { pending: docs.length },
    columns: [
      { key: 'title', label: 'Document' },
      { key: 'status', label: 'Stage' },
      { key: 'ageDays', label: 'Age (days)' },
      { key: 'uploadedAt', label: 'Submitted' },
    ],
    rows: docs.map(function (d) {
      return { title: d.title, status: d.status, ageDays: daysSince(d.uploadedAt), uploadedAt: fmtDate(d.uploadedAt) };
    }),
  };
}

async function buildDocumentInventory(models, user, ctx) {
  var docs = await models.Document.findAll({
    where: fieldInPeriod('uploadedAt', ctx),
    order: [['uploadedAt', 'DESC']],
    limit: 150,
  });
  var owners = await loadUsersMap(models, docs.map(function (d) { return d.uploadedBy; }).filter(Boolean));
  return {
    summary: { total: docs.length },
    columns: [
      { key: 'title', label: 'Document' },
      { key: 'owner', label: 'Owner' },
      { key: 'category', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'uploadedAt', label: 'Uploaded' },
    ],
    rows: docs.map(function (d) {
      return {
        title: d.title,
        owner: owners[d.uploadedBy] || '—',
        category: d.category,
        status: d.status,
        uploadedAt: fmtDate(d.uploadedAt),
      };
    }),
  };
}

async function buildPipelineStatus(models, user, ctx) {
  var docs = await models.Document.findAll({
    where: fieldInPeriod('uploadedAt', ctx),
    attributes: ['status'],
  });
  var counts = {};
  docs.forEach(function (d) {
    var s = d.status || 'unknown';
    counts[s] = (counts[s] || 0) + 1;
  });
  return {
    summary: { stages: Object.keys(counts).length, total: docs.length },
    columns: [{ key: 'stage', label: 'Stage' }, { key: 'count', label: 'Documents' }],
    rows: Object.keys(counts).sort().map(function (stage) {
      return { stage: stage, count: counts[stage] };
    }),
  };
}

async function buildOverdueDocuments(models, user, ctx) {
  var cutoff = new Date(Date.now() - 7 * 86400000);
  var docs = await models.Document.findAll({
    where: {
      status: { [Op.in]: ['uploaded', 'in_review', 'in_progress', 'submitted', 'pending'] },
      uploadedAt: { [Op.lt]: cutoff },
    },
    order: [['uploadedAt', 'ASC']],
    limit: 100,
  });
  var owners = await loadUsersMap(models, docs.map(function (d) { return d.uploadedBy; }).filter(Boolean));
  return {
    summary: { overdue: docs.length, slaDays: 7 },
    columns: [
      { key: 'title', label: 'Document' },
      { key: 'owner', label: 'Owner' },
      { key: 'status', label: 'Status' },
      { key: 'ageDays', label: 'Days waiting' },
    ],
    rows: docs.map(function (d) {
      return { title: d.title, owner: owners[d.uploadedBy] || '—', status: d.status, ageDays: daysSince(d.uploadedAt) };
    }),
  };
}

async function buildRejectionLog(models, user, ctx) {
  var docs = await models.Document.findAll({
    where: Object.assign(
      { status: { [Op.in]: ['rejected', 'revision_required', 'returned'] } },
      fieldInPeriod('updatedAt', ctx)
    ),
    order: [['updatedAt', 'DESC']],
    limit: 100,
  });
  return {
    summary: { rejected: docs.length },
    columns: [
      { key: 'title', label: 'Document' },
      { key: 'status', label: 'Outcome' },
      { key: 'updatedAt', label: 'Last updated' },
    ],
    rows: docs.map(function (d) {
      return { title: d.title, status: d.status, updatedAt: fmtDate(d.updatedAt) };
    }),
  };
}

async function buildVersionHistory(models, user, ctx) {
  var where = Object.assign({}, logWhere(user, ctx), {
    action: { [Op.or]: [{ [Op.iLike]: '%reupload%' }, { [Op.iLike]: '%version%' }, { [Op.iLike]: '%revision%' }] },
  });
  var logs = await models.AuditLog.findAll({
    where: where,
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  return {
    summary: { revisions: logs.length },
    columns: [
      { key: 'action', label: 'Event' },
      { key: 'details', label: 'Details' },
      { key: 'time', label: 'Date' },
    ],
    rows: logs.map(function (l) {
      return {
        action: humanizeAction(l.action),
        details: humanizeDetails(l.description || '—'),
        time: fmtDate(l.createdAt),
      };
    }),
  };
}

async function buildSubmissionTrend(models, user, ctx) {
  var docs = await models.Document.findAll({
    where: Object.assign({}, ctx.where, fieldInPeriod('uploadedAt', ctx)),
    attributes: ['uploadedAt'],
  });
  var buckets = {};
  docs.forEach(function (d) {
    var dt = new Date(d.uploadedAt);
    var key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
    buckets[key] = (buckets[key] || 0) + 1;
  });
  var rows = Object.keys(buckets).sort().map(function (period) {
    return { period: period, uploads: buckets[period] };
  });
  return {
    summary: { totalUploads: docs.length, periods: rows.length },
    columns: [{ key: 'period', label: 'Period' }, { key: 'uploads', label: 'Uploads' }],
    rows: rows,
  };
}

async function buildAuditQueue(models, user, ctx) {
  var rows = [];
  if (user.role === 'auditor' || user.role === 'administrator') {
    var taskWhere = user.role === 'auditor' ? { assignedTo: user.id } : {};
    var tasks = await models.Task.findAll({
      where: Object.assign({}, taskWhere, fieldInPeriod('createdAt', ctx), { status: { [Op.in]: ['pending', 'in_progress'] } }),
      order: [['dueDate', 'ASC']],
      limit: 100,
    });
    var docIds = tasks.map(function (t) { return t.documentId; }).filter(Boolean);
    var docs = docIds.length
      ? await models.Document.findAll({ where: { id: { [Op.in]: docIds } }, attributes: ['id', 'title', 'category'] })
      : [];
    var docMap = {};
    docs.forEach(function (d) { docMap[d.id] = d; });
    rows = tasks.map(function (t) {
      var doc = docMap[t.documentId];
      return {
        title: doc ? doc.title : t.title,
        source: 'Task',
        priority: t.priority,
        ageDays: daysSince(t.createdAt),
        dueDate: fmtDate(t.dueDate),
      };
    });
  }
  if (!rows.length) {
    var pendingDocs = await models.Document.findAll({
      where: Object.assign(
        {
          status: { [Op.in]: ['uploaded', 'in_review', 'submitted', 'pending'] },
        },
        fieldInPeriod('uploadedAt', ctx)
      ),
      order: [['uploadedAt', 'ASC']],
      limit: 50,
    });
    rows = pendingDocs.map(function (d) {
      return {
        title: d.title,
        source: 'Document pipeline',
        priority: daysSince(d.uploadedAt) > 7 ? 'high' : 'medium',
        ageDays: daysSince(d.uploadedAt),
        dueDate: '—',
      };
    });
  }
  return {
    summary: { queueSize: rows.length },
    columns: [
      { key: 'title', label: 'Task / Document' },
      { key: 'source', label: 'Source' },
      { key: 'priority', label: 'Priority' },
      { key: 'ageDays', label: 'Age (days)' },
      { key: 'dueDate', label: 'Due' },
    ],
    rows: rows,
  };
}

async function buildCompletionRate(models, user, ctx) {
  var analyses;
  if (normalizeRole(user.role) === 'auditor') {
    var tasks = await models.Task.findAll({
      where: Object.assign({ assignedTo: user.id, status: 'completed' }, fieldInPeriod('completedAt', ctx)),
      attributes: ['documentId'],
    });
    var docIds = tasks.map(function (t) { return t.documentId; }).filter(Boolean);
    analyses = docIds.length
      ? await models.DocumentAnalysis.findAll({
        where: Object.assign({ documentId: { [Op.in]: docIds } }, fieldInPeriod('createdAt', ctx)),
        include: [{ model: models.Document, attributes: ['id', 'title', 'status', 'category', 'uploadedBy'], required: false }],
        order: [['createdAt', 'DESC']],
        limit: 500,
      })
      : [];
  } else {
    analyses = await loadAnalyses(models, user, ctx, 500);
  }
  var counts = { approved: 0, flagged: 0, rejected: 0, pending: 0 };
  analyses.forEach(function (a) {
    var res = a.results || {};
    var score = complianceFromAnalysis(a);
    var docStatus = a.Document && a.Document.status;
    if (res.organization_match === false || score <= 20) counts.rejected++;
    else if (score >= 90 || docStatus === 'approved') counts.approved++;
    else if (score >= 60 || /flag|warning/i.test(res.risk_level || '')) counts.flagged++;
    else counts.pending++;
  });
  var total = analyses.length || 1;
  return {
    summary: {
      auditsInPeriod: analyses.length,
      passRate: analyses.length ? Math.round((counts.approved / total) * 100) + '%' : '0%',
    },
    columns: [{ key: 'outcome', label: 'Outcome' }, { key: 'count', label: 'Count' }, { key: 'share', label: 'Share' }],
    rows: [
      { outcome: 'Approved / pass', count: counts.approved, share: Math.round((counts.approved / total) * 100) + '%' },
      { outcome: 'Flagged / warnings', count: counts.flagged, share: Math.round((counts.flagged / total) * 100) + '%' },
      { outcome: 'Rejected', count: counts.rejected, share: Math.round((counts.rejected / total) * 100) + '%' },
      { outcome: 'Pending / other', count: counts.pending, share: Math.round((counts.pending / total) * 100) + '%' },
    ],
  };
}

async function buildTimeToAudit(models, user, ctx) {
  var analyses = await loadAnalyses(models, user, ctx, 200);
  var byType = {};
  analyses.forEach(function (a) {
    if (!a.completedAt) return;
    var cat = (a.Document && a.Document.category) || (a.results && a.results.document_type) || 'general';
    var ms = new Date(a.completedAt) - new Date(a.createdAt);
    if (ms < 0) return;
    if (!byType[cat]) byType[cat] = { totalMs: 0, count: 0 };
    byType[cat].totalMs += ms;
    byType[cat].count++;
  });
  return {
    summary: { analyses: analyses.length, targetSlaHours: 48 },
    columns: [{ key: 'documentType', label: 'Document type' }, { key: 'avgHours', label: 'Avg hours' }, { key: 'count', label: 'Audits' }],
    rows: Object.keys(byType).map(function (cat) {
      var avgH = (byType[cat].totalMs / byType[cat].count / 3600000).toFixed(1);
      return { documentType: cat, avgHours: avgH, count: byType[cat].count };
    }),
  };
}

async function buildCommonFindings(models, user, ctx) {
  var analyses = await loadAnalyses(models, user, ctx, 300);
  var freq = {};
  analyses.forEach(function (a) {
    violationsFromAnalysis(a).forEach(function (v) {
      var label = v.title || v.summary || 'General';
      if (label.length > 80) label = label.slice(0, 77) + '...';
      freq[label] = (freq[label] || 0) + 1;
    });
    var res = a.results || {};
    if (res.organization_message && !(res.organization_match)) {
      freq['Not a trained SIFCO document'] = (freq['Not a trained SIFCO document'] || 0) + 1;
    }
  });
  var rows = Object.keys(freq)
    .sort(function (a, b) { return freq[b] - freq[a]; })
    .slice(0, 25)
    .map(function (label) {
      return { category: label, occurrences: freq[label] };
    });
  return {
    summary: { categories: rows.length, auditsAnalyzed: analyses.length },
    columns: [{ key: 'category', label: 'Finding category' }, { key: 'occurrences', label: 'Occurrences' }],
    rows: rows,
  };
}

async function buildAuditTrailLog(models, user, ctx) {
  var where = logWhere(user, ctx);
  if (user.role === 'auditor') {
    where.action = { [Op.or]: [{ [Op.iLike]: '%audit%' }, { [Op.iLike]: '%analysis%' }, { [Op.iLike]: '%compliance%' }, { [Op.iLike]: '%review%' }] };
  }
  var logs = await models.AuditLog.findAll({
    where: where,
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  var users = await loadUsersMap(models, logs.map(function (l) { return l.userId; }).filter(Boolean));
  return {
    summary: { events: logs.length },
    columns: [
      { key: 'user', label: 'User' },
      { key: 'action', label: 'What happened' },
      { key: 'resource', label: 'Related to' },
      { key: 'time', label: 'When' },
    ],
    rows: logs.map(function (l) {
      return {
        user: users[l.userId] || 'System',
        action: humanizeAction(l.action),
        resource: humanizeResource(l.resourceType),
        time: fmtDate(l.createdAt),
      };
    }),
  };
}

function fmtDevice(log) {
  if (!log) return 'Unknown device';
  if (log.device && typeof log.device === 'object') {
    if (log.device.label) return String(log.device.label);
    const parts = [log.device.browser, log.device.os, log.device.formFactor].filter(Boolean);
    if (parts.length) return parts.join(' · ');
  }
  return parseDeviceFromUserAgent(log.userAgent);
}

async function buildActivityReport(models, user, ctx) {
  // Every user only sees their own actions (what they did)
  var where = Object.assign(fieldInPeriod('createdAt', ctx), { userId: user.id });

  var logs = await models.AuditLog.findAll({
    where: where,
    order: [['createdAt', 'DESC']],
    limit: 500,
  });

  var displayName = user.fullName || user.email || 'You';
  var logins = 0;
  var uploads = 0;
  var audits = 0;
  var other = 0;

  logs.forEach(function (l) {
    if (/login/i.test(l.action)) logins++;
    else if (/upload/i.test(l.action)) uploads++;
    else if (/audit|analysis|compliance|review/i.test(l.action)) audits++;
    else other++;
  });

  return {
    summary: {
      events: logs.length,
      logins: logins,
      uploads: uploads,
      audits: audits,
      other: other,
    },
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'time', label: 'Time' },
      { key: 'user', label: 'Person' },
      { key: 'action', label: 'What happened' },
      { key: 'device', label: 'Device' },
      { key: 'details', label: 'Details' },
      { key: 'status', label: 'Result' },
    ],
    rows: logs.map(function (l) {
      return {
        date: fmtDate(l.createdAt),
        time: fmtTime(l.createdAt),
        user: displayName,
        action: humanizeAction(l.action),
        device: fmtDevice(l),
        details: l.description
          ? humanizeDetails(l.description)
          : humanizeResource(l.resourceType),
        status: humanizeStatus(l.status),
      };
    }),
  };
}

async function buildWorkloadHistory(models, user, ctx) {
  var taskWhere = Object.assign({ assignedTo: user.id, status: 'completed' }, fieldInPeriod('completedAt', ctx));
  var tasks = await models.Task.findAll({ where: taskWhere, attributes: ['completedAt'] });
  var buckets = {};
  tasks.forEach(function (t) {
    var dt = new Date(t.completedAt);
    var key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
    buckets[key] = (buckets[key] || 0) + 1;
  });
  return {
    summary: { completed: tasks.length },
    columns: [{ key: 'period', label: 'Period' }, { key: 'completed', label: 'Audits completed' }],
    rows: Object.keys(buckets).sort().map(function (p) {
      return { period: p, completed: buckets[p] };
    }),
  };
}

async function buildAllUsers(models, user, ctx) {
  var users = await models.User.findAll({
    where: fieldInPeriod('createdAt', ctx),
    attributes: ['fullName', 'email', 'role', 'isActive', 'lastLogin', 'createdAt'],
    order: [['fullName', 'ASC']],
    limit: 200,
  });
  return {
    summary: { totalUsers: users.length },
    columns: [
      { key: 'name', label: 'User' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Account status' },
      { key: 'lastLogin', label: 'Last login' },
      { key: 'createdAt', label: 'Registered' },
    ],
    rows: users.map(function (u) {
      return {
        name: u.fullName || '—',
        email: u.email,
        role: u.role,
        status: u.isActive !== false ? 'Active' : 'Inactive',
        lastLogin: fmtDate(u.lastLogin) || 'Never',
        createdAt: fmtDate(u.createdAt),
      };
    }),
  };
}

async function buildUserActivity(models, user, ctx) {
  var logs = await models.AuditLog.findAll({
    where: fieldInPeriod('createdAt', ctx),
    attributes: ['userId', 'action'],
  });
  var byUser = {};
  logs.forEach(function (l) {
    if (!l.userId) return;
    if (!byUser[l.userId]) byUser[l.userId] = { actions: 0, uploads: 0, audits: 0 };
    byUser[l.userId].actions++;
    if (/upload/i.test(l.action)) byUser[l.userId].uploads++;
    if (/audit|analysis|compliance/i.test(l.action)) byUser[l.userId].audits++;
  });
  var users = await loadUsersMap(models, Object.keys(byUser));
  return {
    summary: { activeUsers: Object.keys(byUser).length },
    columns: [
      { key: 'user', label: 'User' },
      { key: 'actions', label: 'Total actions' },
      { key: 'uploads', label: 'Uploads' },
      { key: 'audits', label: 'Audits' },
    ],
    rows: Object.keys(byUser).map(function (uid) {
      return {
        user: users[uid] || uid,
        actions: byUser[uid].actions,
        uploads: byUser[uid].uploads,
        audits: byUser[uid].audits,
      };
    }),
  };
}

async function buildRoleAccessLog(models, user, ctx) {
  var logs = await models.AuditLog.findAll({
    where: Object.assign(fieldInPeriod('createdAt', ctx), {
      action: { [Op.or]: [{ [Op.iLike]: '%role%' }, { [Op.iLike]: '%permission%' }, { [Op.iLike]: '%access%' }] },
    }),
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  return {
    summary: { events: logs.length },
    columns: [{ key: 'action', label: 'What happened' }, { key: 'details', label: 'Details' }, { key: 'time', label: 'When' }],
    rows: logs.map(function (l) {
      return {
        action: humanizeAction(l.action),
        details: humanizeDetails(l.description || '—'),
        time: fmtDate(l.createdAt),
      };
    }),
  };
}

async function buildSystemAuditSummary(models, user, ctx) {
  var periodDocs = fieldInPeriod('uploadedAt', ctx);
  var periodAnalyses = fieldInPeriod('createdAt', ctx);
  var totalDocs = await models.Document.count({ where: periodDocs });
  var pending = await models.Document.count({
    where: Object.assign({}, periodDocs, { status: { [Op.in]: ['uploaded', 'in_review', 'pending', 'submitted'] } }),
  });
  var completed = await models.Document.count({
    where: Object.assign({}, periodDocs, { status: { [Op.in]: ['approved', 'completed'] } }),
  });
  var analyses = await models.DocumentAnalysis.count({
    where: Object.assign({}, periodAnalyses, { status: 'completed' }),
  });
  return {
    summary: { totalDocs: totalDocs, pending: pending, completed: completed, analyses: analyses },
    columns: [{ key: 'metric', label: 'Metric' }, { key: 'value', label: 'Value' }],
    rows: [
      { metric: 'Documents in period', value: totalDocs },
      { metric: 'Pending audit', value: pending },
      { metric: 'Completed', value: completed },
      { metric: 'AI analyses run', value: analyses },
    ],
  };
}

async function buildAuditorPerformance(models, user, ctx) {
  var auditors = await models.User.findAll({ where: { role: 'auditor' }, attributes: ['id', 'fullName', 'email'] });
  var rows = [];
  for (var i = 0; i < auditors.length; i++) {
    var a = auditors[i];
    var completed = await models.Task.count({ where: Object.assign({ assignedTo: a.id, status: 'completed' }, fieldInPeriod('completedAt', ctx)) });
    var pending = await models.Task.count({ where: { assignedTo: a.id, status: { [Op.in]: ['pending', 'in_progress'] } } });
    rows.push({
      auditor: a.fullName || a.email,
      completed: completed,
      pending: pending,
      slaCompliance: completed + pending > 0 ? Math.round((completed / (completed + pending)) * 100) + '%' : '—',
    });
  }
  return {
    summary: { auditors: auditors.length },
    columns: [
      { key: 'auditor', label: 'Auditor' },
      { key: 'completed', label: 'Completed' },
      { key: 'pending', label: 'Pending' },
      { key: 'slaCompliance', label: 'SLA compliance' },
    ],
    rows: rows,
  };
}

async function buildDocumentCompliance(models, user, ctx) {
  var analyses = await loadAnalyses(models, user, ctx, 500);
  if (!analyses.length) {
    return {
      summary: { avgScore: 0, audits: 0 },
      columns: [{ key: 'metric', label: 'Metric' }, { key: 'value', label: 'Value' }],
      rows: [{ metric: 'No AI audits in this period', value: 'Upload and run AI Analysis on documents' }],
    };
  }
  var scores = analyses.map(complianceFromAnalysis).filter(function (s) { return s != null; });
  var avg = scores.length ? Math.round(scores.reduce(function (s, v) { return s + v; }, 0) / scores.length) : 0;
  var pass = scores.filter(function (s) { return s >= 80; }).length;
  var flagged = analyses.filter(function (a) {
    var s = complianceFromAnalysis(a);
    return s != null && s >= 60 && s < 80;
  }).length;
  return {
    summary: { avgScore: avg, passRate: scores.length ? Math.round((pass / scores.length) * 100) + '%' : '0%', audits: analyses.length },
    columns: [{ key: 'metric', label: 'Metric' }, { key: 'value', label: 'Value' }],
    rows: [
      { metric: 'Average compliance score', value: avg + '%' },
      { metric: 'Pass rate (≥80%)', value: scores.length ? Math.round((pass / scores.length) * 100) + '%' : '0%' },
      { metric: 'Flagged (60–79%)', value: flagged },
      { metric: 'Audits in period', value: analyses.length },
    ],
  };
}

async function buildSystemHealth(models, user, ctx) {
  var docs = await models.Document.findAll({ attributes: ['fileSize'] });
  var totalBytes = docs.reduce(function (s, d) { return s + Number(d.fileSize || 0); }, 0);
  var analyses = await models.DocumentAnalysis.count();
  var errors = await models.AuditLog.count({
    where: Object.assign({ status: 'failed' }, fieldInPeriod('createdAt', ctx)),
  });
  return {
    summary: { storage: fmtBytes(totalBytes), analyses: analyses, errors: errors },
    columns: [{ key: 'metric', label: 'Metric' }, { key: 'value', label: 'Value' }],
    rows: [
      { metric: 'Storage used', value: fmtBytes(totalBytes) },
      { metric: 'Documents stored', value: docs.length },
      { metric: 'AI analyses total', value: analyses },
      { metric: 'Failed actions (period)', value: errors },
    ],
  };
}

async function buildInactiveUsers(models, user, ctx) {
  var cutoff = new Date(Date.now() - 30 * 86400000);
  var users = await models.User.findAll({
    where: {
      [Op.or]: [
        { lastLogin: { [Op.lt]: cutoff } },
        { lastLogin: null },
      ],
      isActive: true,
    },
    attributes: ['fullName', 'email', 'role', 'lastLogin'],
    limit: 100,
  });
  return {
    summary: { inactive: users.length, thresholdDays: 30 },
    columns: [
      { key: 'name', label: 'User' },
      { key: 'role', label: 'Role' },
      { key: 'lastLogin', label: 'Last login' },
    ],
    rows: users.map(function (u) {
      return { name: u.fullName || u.email, role: u.role, lastLogin: fmtDate(u.lastLogin) || 'Never' };
    }),
  };
}

async function buildAiConfidence(models, user, ctx) {
  var analyses = await loadAnalyses(models, user, ctx, 200);
  var buckets = { high: 0, medium: 0, low: 0 };
  var rows = [];
  analyses.forEach(function (a) {
    var res = a.results || {};
    var conf = complianceFromAnalysis(a);
    if (conf == null && a.confidence != null) conf = Math.round(Number(a.confidence) * 100);
    if (conf == null) return;
    if (conf >= 80) buckets.high++;
    else if (conf >= 60) buckets.medium++;
    else buckets.low++;
    var outcome = (a.Document && a.Document.status) || (res.organization_match ? 'matched' : 'rejected');
    var engine = res.engine || 'sifco-notebook';
    rows.push({
      document: (a.Document && a.Document.title) || a.documentId,
      aiScore: conf + '%',
      outcome: outcome,
      engine: engine,
      date: fmtDate(a.createdAt),
    });
  });
  return {
    summary: buckets,
    columns: [
      { key: 'document', label: 'Document' },
      { key: 'aiScore', label: 'AI / audit score' },
      { key: 'outcome', label: 'Outcome' },
      { key: 'engine', label: 'Engine' },
      { key: 'date', label: 'Date' },
    ],
    rows: rows.slice(0, 100),
  };
}

const ACCESS_MAP = {
  client: ['my_documents_status', 'activity_report'],
  document_manager: ['my_documents_status', 'activity_report'],
  auditor: ['my_audit_queue', 'audit_completion_rate', 'activity_report'],
  administrator: ['activity_report', 'user_activity', 'all_users', 'document_inventory'],
};

function canAccessReport(reportId, role) {
  var normalized = normalizeRole(role);
  // Personal activity report is available to every signed-in role
  if (reportId === 'activity_report' && REPORT_META[reportId]) return true;
  if (normalized === 'administrator') return !!REPORT_META[reportId];
  var allowed = ACCESS_MAP[normalized] || [];
  return allowed.indexOf(reportId) >= 0;
}

module.exports = {
  REPORT_META,
  buildReport,
  canAccessReport,
};
