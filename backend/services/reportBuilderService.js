'use strict';
/**
 * Professional structured audit reports — role-based sections and KPIs.
 */

const ROLE_LABELS = {
  administrator: 'System Administrator',
  auditor: 'Compliance Auditor',
  document_manager: 'Document Manager',
  viewer: 'Portal Viewer',
};

const REPORT_TYPE_META = {
  daily_report: {
    title: 'Daily Activity Report',
    icon: 'calendar',
    audience: ['auditor', 'document_manager', 'viewer'],
  },
  policy_report: {
    title: 'Policy Compliance Report',
    icon: 'shield',
    audience: ['auditor', 'document_manager', 'viewer'],
  },
  compliance_audit: {
    title: 'Compliance Audit Report',
    icon: 'check-circle',
    audience: ['auditor', 'document_manager'],
  },
  document_review: {
    title: 'Document Review Report',
    icon: 'file-text',
    audience: ['auditor', 'document_manager'],
  },
  financial_report: {
    title: 'Financial & Billing Report',
    icon: 'dollar-sign',
    audience: ['auditor'],
  },
  security_audit: {
    title: 'Security & Access Audit',
    icon: 'lock',
    audience: ['auditor', 'administrator'],
  },
  exception_report: {
    title: 'Exception & High-Risk Report',
    icon: 'alert-triangle',
    audience: ['auditor'],
  },
};

function complianceStatus(score) {
  if (score >= 80) return { label: 'Compliant', color: 'green', code: 'compliant' };
  if (score >= 60) return { label: 'Partially Compliant', color: 'amber', code: 'partial' };
  return { label: 'Non-Compliant', color: 'red', code: 'non_compliant' };
}

function aggregateOrgStats(analyses) {
  var stats = {
    orgAccepted: 0,
    orgRejected: 0,
    aiThresholdExceeded: 0,
    forgeryFlagged: 0,
    avgAiPercent: 0,
  };
  var aiPercents = [];
  analyses.forEach(function(a) {
    var r = a.results || {};
    if (r.organization_match === true) stats.orgAccepted++;
    if (r.organization_match === false) stats.orgRejected++;
    if (r.ai_threshold_exceeded) stats.aiThresholdExceeded++;
    if (r.document_inspection?.forgery_analysis?.is_suspicious) stats.forgeryFlagged++;
    if (typeof r.ai_generated_percentage === 'number') aiPercents.push(r.ai_generated_percentage);
  });
  if (aiPercents.length) {
    stats.avgAiPercent = Math.round(aiPercents.reduce(function(s, n) { return s + n; }, 0) / aiPercents.length);
  }
  return stats;
}

function filterDocumentsForRole(docList, role, ownerScoped) {
  if (!docList) return [];
  if (['administrator', 'auditor'].includes(role) && !ownerScoped) return docList;
  return docList;
}

function buildRoleSections(data, role, reportType) {
  var sections = [];
  var score = data.compliance_score ?? 0;
  var status = complianceStatus(score);
  var orgStats = data.organization_stats || {};

  sections.push({
    id: 'executive',
    title: 'Executive Summary',
    priority: 1,
    visibleTo: ['administrator', 'auditor', 'document_manager', 'viewer'],
    paragraphs: [
      data.summary || 'No summary available for this period.',
    ],
    highlights: [
      { label: 'Compliance Score', value: score + '/100', status: status.code },
      { label: 'Documents Processed', value: String(data.total_documents ?? 0) },
      { label: 'Pass Rate', value: (data.pass_rate ?? 0) + '%' },
      { label: 'Period', value: (data.period?.start || '—') + ' to ' + (data.period?.end || '—') },
    ],
  });

  sections.push({
    id: 'kpis',
    title: 'Key Performance Indicators',
    priority: 2,
    visibleTo: ['administrator', 'auditor', 'document_manager', 'viewer'],
    metrics: [
      { key: 'documents', label: 'Documents Uploaded', value: data.total_documents ?? 0, icon: 'upload' },
      { key: 'analyses', label: 'AI Audits Completed', value: data.total_analyses ?? 0, icon: 'cpu' },
      { key: 'checks', label: 'Compliance Checks', value: data.total_checks ?? 0, icon: 'clipboard' },
      { key: 'passed', label: 'Checks Passed', value: data.passed_checks ?? 0, icon: 'check' },
      { key: 'failed', label: 'Checks Failed', value: data.failed_checks ?? 0, icon: 'x' },
      { key: 'high_risk', label: 'High Risk Items', value: data.risk_distribution?.high ?? 0, icon: 'alert', warn: (data.risk_distribution?.high ?? 0) > 0 },
    ],
  });

  if (['compliance_audit', 'exception_report', 'policy_report', 'daily_report'].includes(reportType)) {
    sections.push({
      id: 'organization',
      title: 'Organization Document Validation',
      priority: 3,
      visibleTo: ['administrator', 'auditor', 'document_manager'],
      paragraphs: [
        'Documents are validated against the SIFCO / Super International freight training profile. Non-organization documents are automatically rejected.',
      ],
      metrics: [
        { key: 'org_ok', label: 'Organization Match', value: orgStats.orgAccepted ?? 0 },
        { key: 'org_fail', label: 'Not Our Organization', value: orgStats.orgRejected ?? 0, warn: (orgStats.orgRejected ?? 0) > 0 },
        { key: 'ai_high', label: 'AI Content > 25%', value: orgStats.aiThresholdExceeded ?? 0, warn: (orgStats.aiThresholdExceeded ?? 0) > 0 },
        { key: 'forgery', label: 'Forgery Indicators', value: orgStats.forgeryFlagged ?? 0, warn: (orgStats.forgeryFlagged ?? 0) > 0 },
        { key: 'avg_ai', label: 'Avg AI-Written %', value: (orgStats.avgAiPercent ?? 0) + '%' },
      ],
    });
  }

  sections.push({
    id: 'risk',
    title: 'Risk Assessment',
    priority: 4,
    visibleTo: ['administrator', 'auditor', 'document_manager'],
    riskDistribution: data.risk_distribution || { high: 0, medium: 0, low: 0 },
    narrative: (data.risk_distribution?.high ?? 0) > 0
      ? data.risk_distribution.high + ' document(s) require immediate auditor review.'
      : 'No high-risk documents identified in this reporting period.',
  });

  if (reportType === 'financial_report' || reportType === 'compliance_audit') {
    var financialDocs = (data.document_list || []).filter(function(d) {
      return /invoice|freight|financial|contract|agreement/i.test((d.category || '') + (d.title || ''));
    });
    sections.push({
      id: 'financial',
      title: 'Financial & Billing Review',
      priority: 5,
      visibleTo: ['administrator', 'auditor'],
      table: {
        columns: ['Document', 'Category', 'Score', 'Risk', 'Issues'],
        rows: financialDocs.slice(0, 15).map(function(d) {
          return [
            d.title,
            d.category || '—',
            d.compliance_score != null ? d.compliance_score + '/100' : '—',
            (d.risk_level || '—').toUpperCase(),
            (d.violations_count || 0) + ' violation(s)',
          ];
        }),
      },
      emptyMessage: financialDocs.length ? null : 'No financial documents in this period.',
    });
  }

  if (reportType === 'exception_report' || reportType === 'compliance_audit') {
    var exceptions = (data.document_list || []).filter(function(d) {
      return d.risk_level === 'high' || (d.compliance_score != null && d.compliance_score < 60) || (d.violations_count || 0) > 0;
    });
    sections.push({
      id: 'exceptions',
      title: 'Exceptions & Non-Compliance',
      priority: 6,
      visibleTo: ['administrator', 'auditor'],
      bullets: exceptions.length
        ? exceptions.map(function(d) {
          return d.title + ' — Score ' + (d.compliance_score ?? '—') + '/100, Risk: ' + (d.risk_level || 'unknown').toUpperCase();
        })
        : ['No exception documents in this period.'],
      violations: (data.violations || []).slice(0, 12),
      missingFields: (data.missing_fields || []).slice(0, 8),
    });
  }

  sections.push({
    id: 'documents',
    title: 'Document Register',
    priority: 7,
    visibleTo: ['administrator', 'auditor', 'document_manager', 'viewer'],
    table: {
      columns: ['Title', 'Category', 'Department', 'Status', 'Score', 'Risk'],
      rows: (data.document_list || []).slice(0, 20).map(function(d) {
        return [
          d.title,
          d.category || '—',
          d.department || '—',
          (d.status || '—').replace(/_/g, ' '),
          d.compliance_score != null ? d.compliance_score + '/100' : 'Pending',
          (d.risk_level || '—').toUpperCase(),
        ];
      }),
    },
    breakdowns: {
      departments: data.departments || {},
      categories: data.categories || {},
      statuses: data.doc_statuses || {},
    },
  });

  if (['administrator', 'auditor'].includes(role)) {
    sections.push({
      id: 'activity',
      title: 'Audit Trail & Activity',
      priority: 8,
      visibleTo: ['administrator', 'auditor'],
      timeline: (data.activity_log || []).slice(0, 25).map(function(a) {
        return { date: a.time, user: a.user, action: a.action, type: a.type };
      }),
    });
  } else {
    sections.push({
      id: 'activity',
      title: 'Your Activity Summary',
      priority: 8,
      visibleTo: ['document_manager', 'viewer'],
      timeline: (data.activity_log || []).slice(0, 15).map(function(a) {
        return { date: a.time, user: a.user, action: a.action, type: a.type };
      }),
      note: 'Showing activity related to your account and documents.',
    });
  }

  sections.push({
    id: 'recommendations',
    title: 'Recommendations & Next Steps',
    priority: 9,
    visibleTo: ['administrator', 'auditor', 'document_manager', 'viewer'],
    numbered: (data.recommendations || []).length
      ? data.recommendations
      : ['Maintain current document submission standards.', 'Schedule follow-up review for any rejected documents.'],
  });

  sections.push({
    id: 'conclusion',
    title: 'Conclusion',
    priority: 10,
    visibleTo: ['administrator', 'auditor', 'document_manager', 'viewer'],
    paragraphs: [buildConclusion(data, status)],
  });

  return sections.filter(function(s) {
    return s.visibleTo.includes(role);
  });
}

function buildConclusion(data, status) {
  var score = data.compliance_score ?? 0;
  var start = data.period?.start || '—';
  var end = data.period?.end || '—';
  if (status.code === 'compliant') {
    return 'The reporting period ' + start + ' to ' + end + ' meets organizational compliance targets with a score of ' + score + '/100. Continue standard operating procedures.';
  }
  if (status.code === 'partial') {
    return 'The period ' + start + ' to ' + end + ' shows partial compliance (' + score + '/100). Address listed recommendations before the next audit cycle.';
  }
  return 'Immediate remediation is required. Compliance score ' + score + '/100 is below the 80-point threshold. Escalate high-risk and rejected documents to the audit team.';
}

function buildStructuredReport(auditSummary, options) {
  options = options || {};
  var role = options.viewerRole || auditSummary.generated_by_role || 'auditor';
  var reportType = auditSummary.reportType || 'compliance_audit';
  var ownerScoped = options.ownerScoped || false;
  var score = auditSummary.compliance_score ?? 0;
  var status = complianceStatus(score);
  var orgStats = aggregateOrgStats(auditSummary._rawAnalyses || []);

  var enriched = Object.assign({}, auditSummary, {
    organization_stats: orgStats,
  });

  var sections = buildRoleSections(enriched, role, reportType);
  var typeMeta = REPORT_TYPE_META[reportType] || { title: reportType, icon: 'file' };

  return {
    version: '2.0',
    meta: {
      title: auditSummary.title,
      reportType: reportType,
      reportTypeLabel: typeMeta.title,
      period: auditSummary.period,
      generatedAt: new Date().toISOString(),
      generatedBy: auditSummary.generated_by || 'System',
      generatedByRole: role,
      generatedByRoleLabel: ROLE_LABELS[role] || role,
      audience: typeMeta.audience,
      scope: ownerScoped ? 'personal' : 'organization',
      scopeLabel: ownerScoped ? 'My Documents & Activity' : 'Organization-Wide',
      engine: auditSummary.engine || 'rule-based-v5-org-trained',
      confidential: true,
    },
    compliance: {
      score: score,
      status: status,
      passRate: auditSummary.pass_rate ?? 0,
    },
    organizationValidation: orgStats,
    sections: sections,
    recommendations: auditSummary.recommendations || [],
    riskSummary: auditSummary.risk_distribution || {},
  };
}

function formatReportAsText(structured) {
  if (!structured) return '';
  var lines = [];
  var m = structured.meta || {};
  lines.push('═'.repeat(72));
  lines.push('  ' + (m.title || 'AUDIT REPORT').toUpperCase());
  lines.push('  ' + (m.reportTypeLabel || m.reportType || ''));
  lines.push('═'.repeat(72));
  lines.push('');
  lines.push('Prepared for:     ' + (m.generatedByRoleLabel || m.generatedByRole));
  lines.push('Scope:            ' + (m.scopeLabel || m.scope));
  lines.push('Period:           ' + (m.period?.start || '—') + ' to ' + (m.period?.end || '—'));
  lines.push('Compliance:       ' + (structured.compliance?.score ?? '—') + '/100 — ' + (structured.compliance?.status?.label || ''));
  lines.push('Generated:        ' + new Date(m.generatedAt || Date.now()).toLocaleString());
  lines.push('Classification:   CONFIDENTIAL — Internal Use Only');
  lines.push('');

  (structured.sections || []).forEach(function(section, idx) {
    lines.push('─'.repeat(72));
    lines.push((idx + 1) + '. ' + section.title.toUpperCase());
    lines.push('─'.repeat(72));

    if (section.paragraphs) {
      section.paragraphs.forEach(function(p) { lines.push(p); lines.push(''); });
    }
    if (section.highlights) {
      section.highlights.forEach(function(h) {
        lines.push('  • ' + h.label + ': ' + h.value);
      });
      lines.push('');
    }
    if (section.metrics) {
      section.metrics.forEach(function(metric) {
        lines.push('  • ' + metric.label + ': ' + metric.value);
      });
      lines.push('');
    }
    if (section.riskDistribution) {
      lines.push('  High: ' + section.riskDistribution.high + '  |  Medium: ' + section.riskDistribution.medium + '  |  Low: ' + section.riskDistribution.low);
      if (section.narrative) lines.push('  ' + section.narrative);
      lines.push('');
    }
    if (section.table && section.table.rows && section.table.rows.length) {
      lines.push('  ' + section.table.columns.join(' | '));
      section.table.rows.forEach(function(row) {
        lines.push('  ' + row.join(' | '));
      });
      lines.push('');
    }
    if (section.bullets) {
      section.bullets.forEach(function(b) { lines.push('  • ' + b); });
      lines.push('');
    }
    if (section.violations && section.violations.length) {
      lines.push('  Violations:');
      section.violations.forEach(function(v) {
        var line = typeof v === 'string' ? v : ((v.code ? '[' + v.code + '] ' : '') + (v.title || '') + (v.summary ? ': ' + v.summary : ''));
        lines.push('    - ' + line);
      });
      lines.push('');
    }
    if (section.numbered) {
      section.numbered.forEach(function(r, i) { lines.push('  ' + (i + 1) + '. ' + r); });
      lines.push('');
    }
    if (section.timeline && section.timeline.length) {
      section.timeline.forEach(function(t) {
        lines.push('  [' + (t.date || '—') + '] ' + t.user + ': ' + t.action);
      });
      lines.push('');
    }
  });

  lines.push('═'.repeat(72));
  lines.push('Super International Freight / SIFCO — DocAudit AI');
  lines.push('End of Report');
  return lines.join('\n');
}

function filterStructuredForRole(structured, role) {
  if (!structured) return structured;
  if (['administrator', 'auditor'].includes(role)) return structured;
  var copy = JSON.parse(JSON.stringify(structured));
  copy.sections = (copy.sections || []).filter(function(s) {
    return s.visibleTo && s.visibleTo.includes(role);
  });
  copy.meta = Object.assign({}, copy.meta, {
    generatedByRole: role,
    generatedByRoleLabel: ROLE_LABELS[role] || role,
    scope: 'personal',
    scopeLabel: 'My Documents & Activity',
  });
  return copy;
}

module.exports = {
  buildStructuredReport: buildStructuredReport,
  formatReportAsText: formatReportAsText,
  filterStructuredForRole: filterStructuredForRole,
  complianceStatus: complianceStatus,
  REPORT_TYPE_META: REPORT_TYPE_META,
  ROLE_LABELS: ROLE_LABELS,
};
