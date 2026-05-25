import React, { useEffect, useState, useCallback } from 'react';
import {
  FileBarChart2, Plus, RefreshCw, Download, X, Eye,
  Activity, Upload, Bot, LogIn, Trash2, Lock, Shield, User,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import ReportViewer from '../components/ReportViewer';
import { auditAPI, auditLogAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

const STATUS_PILL = {
  draft:     'bg-slate-500/15 text-slate-400 border-slate-500/20',
  published: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  archived:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

const ROLE_LABELS = {
  administrator: 'Administrator',
  auditor: 'Auditor',
  document_manager: 'Document Manager',
  viewer: 'Viewer',
};

const REPORT_TYPES = [
  { value: 'daily_report',      label: 'Daily Activity Report',    roles: ['administrator', 'auditor', 'document_manager', 'viewer'], desc: 'Uploads, audits, and status changes for the period' },
  { value: 'policy_report',     label: 'Policy Compliance Report', roles: ['administrator', 'auditor', 'document_manager', 'viewer'], desc: 'Policy adherence and violation summary' },
  { value: 'compliance_audit',  label: 'Compliance Audit',         roles: ['administrator', 'auditor', 'document_manager'],          desc: 'Full compliance scoring, org validation, and violations' },
  { value: 'document_review',   label: 'Document Review Report',   roles: ['administrator', 'auditor', 'document_manager'],          desc: 'Per-document scores, risk levels, and register' },
  { value: 'financial_report',  label: 'Financial Report',         roles: ['administrator', 'auditor'],                             desc: 'Invoices, freight bills, and amount validation' },
  { value: 'security_audit',    label: 'Security Audit',           roles: ['administrator', 'auditor'],                             desc: 'Access activity and security-related events' },
  { value: 'exception_report',  label: 'Exception Report',         roles: ['administrator', 'auditor'],                             desc: 'High-risk, rejected, and non-compliant documents only' },
];

const ACTIVITY_ICONS = {
  upload:   <Upload className="h-3.5 w-3.5 text-indigo-400" />,
  analysis: <Bot className="h-3.5 w-3.5 text-emerald-400" />,
  report:   <FileBarChart2 className="h-3.5 w-3.5 text-amber-400" />,
  login:    <LogIn className="h-3.5 w-3.5 text-blue-400" />,
  delete:   <Trash2 className="h-3.5 w-3.5 text-red-400" />,
  action:   <Activity className="h-3.5 w-3.5 text-slate-400" />,
};

const downloadReport = (reportId, format, token) => {
  const base = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  const url  = `${base}/audits/reports/${reportId}/export?format=${format}&token=${token}`;
  const a    = document.createElement('a');
  a.href     = url;
  a.setAttribute('download', `audit_report_${reportId.slice(0, 8)}.${format === 'PDF' ? 'pdf' : 'csv'}`);
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

function complianceColor(score) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

export default function AuditReportsPage() {
  const { user, isDarkMode } = useAuthStore();
  const token = localStorage.getItem('token') || '';
  const role  = user?.role || 'viewer';

  const [reports, setReports]         = useState([]);
  const [activity, setActivity]       = useState({ timeline: [], summary: {} });
  const [loading, setLoading]         = useState(true);
  const [actLoading, setActLoading]   = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState('reports');
  const [form, setForm]               = useState({ title: '', reportType: 'compliance_audit', periodStart: today(), periodEnd: today() });
  const [busy, setBusy]               = useState(false);
  const [msg, setMsg]                 = useState('');
  const [downloading, setDownloading] = useState({});

  function today() { return new Date().toISOString().split('T')[0]; }

  const card    = isDarkMode ? 'bg-[#111318] border-white/8'  : 'bg-white border-gray-200 shadow-sm';
  const text    = isDarkMode ? 'text-white'     : 'text-gray-900';
  const sub     = isDarkMode ? 'text-slate-500' : 'text-gray-500';
  const divider = isDarkMode ? 'divide-white/5' : 'divide-gray-100';
  const inputCls = isDarkMode
    ? 'border-white/10 bg-[#0d0f14] text-white placeholder-slate-600 focus:border-indigo-500/60'
    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-400';
  const modalBg = isDarkMode ? 'bg-[#1a1d24] border-white/10' : 'bg-white border-gray-200';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditAPI.listReports({ limit: 30 });
      setReports(res?.reports || []);
    } catch { setReports([]); }
    setLoading(false);
  }, []);

  const loadActivity = useCallback(async () => {
    setActLoading(true);
    try {
      const res = await auditLogAPI.getActivity({ days: 30 });
      setActivity(res || { timeline: [], summary: {} });
    } catch { setActivity({ timeline: [], summary: {} }); }
    setActLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadActivity();
  }, [load, loadActivity, role]);

  const allowedTypes = REPORT_TYPES.filter(t => t.roles.includes(role));
  const canGenerate = ['administrator', 'auditor', 'document_manager', 'viewer'].includes(role);
  const scopeLabel = ['viewer', 'document_manager'].includes(role)
    ? 'Reports show your documents and activity only.'
    : 'Reports cover organization-wide audit data.';
  const activityScopeLabel = activity.summary?.scope === 'my_account' ? 'My Account Activity' : 'System Activity';

  const openReport = async (r) => {
    if (r.structured) {
      setSelectedReport(r);
      return;
    }
    setDetailLoading(true);
    try {
      const full = await auditAPI.getReport(r.id);
      setSelectedReport(full);
    } catch {
      setSelectedReport(r);
    }
    setDetailLoading(false);
  };

  const handleGenerate = async () => {
    if (!form.title.trim())       return setMsg('Report title is required.');
    if (!form.periodStart)        return setMsg('Period start date is required.');
    if (!form.periodEnd)          return setMsg('Period end date is required.');
    if (form.periodEnd < form.periodStart) return setMsg('End date must be after start date.');

    const typeInfo = REPORT_TYPES.find(t => t.value === form.reportType);
    if (typeInfo && !typeInfo.roles.includes(role))
      return setMsg(`You do not have permission to generate a "${typeInfo.label}".`);

    setBusy(true); setMsg('');
    try {
      const res = await auditAPI.generateReport(form);
      setShowForm(false);
      setForm({ title: '', reportType: 'compliance_audit', periodStart: today(), periodEnd: today() });
      await load();
      loadActivity();
      if (res?.report) setSelectedReport(res.report);
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Generation failed.');
    }
    setBusy(false);
  };

  const handleExport = (id, fmt) => {
    setDownloading(p => ({ ...p, [`${id}_${fmt}`]: true }));
    downloadReport(id, fmt, token);
    setTimeout(() => setDownloading(p => ({ ...p, [`${id}_${fmt}`]: false })), 2000);
  };

  const handleArchive = async (id) => {
    try { await auditAPI.archiveReport(id); load(); if (selectedReport?.id === id) setSelectedReport(null); } catch {}
  };

  const selectedTypeInfo = REPORT_TYPES.find(t => t.value === form.reportType);

  return (
    <AppShell title="Audit Reports">
      {/* Role & scope banner */}
      <div className={`mb-5 rounded-2xl border px-4 py-3 flex flex-wrap items-center gap-3 ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/25' : 'bg-indigo-50 border-indigo-100'}`}>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-indigo-400" />
          <span className={`text-sm font-medium ${text}`}>{ROLE_LABELS[role] || role} View</span>
        </div>
        <p className={`text-xs flex-1 min-w-[200px] ${sub}`}>{scopeLabel}</p>
        <span className={`text-[10px] rounded-full px-2 py-0.5 ${isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-white text-gray-600 border border-gray-200'}`}>
          {allowedTypes.length} report type{allowedTypes.length !== 1 ? 's' : ''} available
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1">
          {['reports', 'activity'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab
                ? 'bg-indigo-500 text-white'
                : isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {tab === 'reports' ? `Reports (${reports.length})` : activityScopeLabel}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => { load(); loadActivity(); }}
            className={`rounded-xl border p-2 transition-colors ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-400 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {canGenerate && (
            <button onClick={() => { setShowForm(true); setMsg(''); }}
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600">
              <Plus className="h-4 w-4" /> Generate Report
            </button>
          )}
        </div>
      </div>

      {/* Reports list */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={`lg:col-span-1 rounded-2xl border overflow-hidden ${card} ${selectedReport ? 'lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto' : ''}`}>
            <div className={`border-b px-5 py-4 sticky top-0 z-10 ${isDarkMode ? 'border-white/8 bg-[#111318]' : 'border-gray-200 bg-white'}`}>
              <h2 className={`text-sm font-semibold ${text}`}>Report Library</h2>
              <p className={`text-xs mt-0.5 ${sub}`}>Select a report to view the full professional breakdown</p>
            </div>
            {loading ? (
              <div className={`p-10 text-center text-sm ${sub}`}>Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="p-10 text-center">
                <FileBarChart2 className={`mx-auto mb-3 h-10 w-10 ${isDarkMode ? 'text-slate-700' : 'text-gray-300'}`} />
                <p className={`text-sm font-medium ${text}`}>No reports yet</p>
                <p className={`text-xs mt-1 ${sub}`}>Generate a compliance or daily report for your selected period.</p>
              </div>
            ) : (
              <div className={`divide-y ${divider}`}>
                {reports.map(r => {
                  const score = r.complianceScore ?? r.structured?.compliance?.score ?? 0;
                  const isSelected = selectedReport?.id === r.id;
                  const typeLabel = r.structured?.meta?.reportTypeLabel || r.reportType?.replace(/_/g, ' ');
                  return (
                    <div key={r.id}
                      className={`px-5 py-4 cursor-pointer transition-colors ${isSelected
                        ? isDarkMode ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : 'bg-indigo-50 border-l-2 border-l-indigo-500'
                        : isDarkMode ? 'hover:bg-white/2' : 'hover:bg-gray-50'}`}
                      onClick={() => openReport(r)}>
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
                          <span className={`text-sm font-bold ${complianceColor(score)}`}>{Math.round(score)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${text}`}>{r.title}</p>
                          <p className={`text-xs mt-0.5 ${sub}`}>{typeLabel}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_PILL[r.status] || STATUS_PILL.draft}`}>{r.status}</span>
                            {r.metrics?.organizationValidation?.orgRejected > 0 && (
                              <span className="rounded-full px-2 py-0.5 text-[10px] bg-red-500/15 text-red-400 border border-red-500/20">
                                {r.metrics.organizationValidation.orgRejected} rejected
                              </span>
                            )}
                          </div>
                        </div>
                        <Eye className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-indigo-400' : sub}`} />
                      </div>
                      <div className="flex gap-1.5 mt-3" onClick={e => e.stopPropagation()}>
                        {['PDF', 'Excel'].map(fmt => (
                          <button key={fmt} onClick={() => handleExport(r.id, fmt)}
                            disabled={downloading[`${r.id}_${fmt}`]}
                            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] ${isDarkMode ? 'border-white/10 text-slate-400 hover:text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            <Download className="h-3 w-3" />
                            {downloading[`${r.id}_${fmt}`] ? '...' : fmt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className={`lg:col-span-1 ${card} rounded-2xl border min-h-[320px]`}>
            {detailLoading ? (
              <div className={`p-12 text-center text-sm ${sub}`}>Loading report...</div>
            ) : selectedReport ? (
              <div className="p-4 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
                <div className="flex justify-end gap-2 mb-3">
                  {(role === 'administrator' || role === 'auditor') && selectedReport.status !== 'archived' && (
                    <button onClick={() => handleArchive(selectedReport.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border ${isDarkMode ? 'border-white/10 text-slate-400' : 'border-gray-200 text-gray-600'}`}>
                      Archive
                    </button>
                  )}
                  <button onClick={() => setSelectedReport(null)}
                    className={`text-xs px-3 py-1.5 rounded-lg ${isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-gray-100 text-gray-600'}`}>
                    Close
                  </button>
                </div>
                <ReportViewer report={selectedReport} isDarkMode={isDarkMode} />
              </div>
            ) : (
              <div className="p-12 text-center">
                <FileBarChart2 className={`mx-auto mb-3 h-12 w-12 ${isDarkMode ? 'text-slate-700' : 'text-gray-300'}`} />
                <p className={`text-sm font-medium ${text}`}>Select a report</p>
                <p className={`text-xs mt-1 max-w-xs mx-auto ${sub}`}>
                  Choose a report from the library to view executive summary, KPIs, risk assessment, and document register tailored to your role.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity tab */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          {activity.summary && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Documents Uploaded', value: activity.summary.totalUploads ?? 0, color: 'text-indigo-400' },
                { label: 'AI Audits Run', value: activity.summary.totalAnalyses ?? 0, color: 'text-emerald-400' },
                { label: 'Reports Generated', value: activity.summary.totalReports ?? 0, color: 'text-amber-400' },
                { label: 'Total Actions', value: activity.summary.totalActions ?? 0, color: 'text-slate-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-2xl border p-4 ${card}`}>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className={`text-xs mt-1 ${sub}`}>{label}</p>
                  <p className={`text-[10px] mt-0.5 ${sub}`}>Last 30 days · {ROLE_LABELS[role]}</p>
                </div>
              ))}
            </div>
          )}

          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            <div className={`border-b px-5 py-4 ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
              <h2 className={`text-sm font-semibold ${text}`}>{activityScopeLabel}</h2>
              <p className={`text-xs mt-0.5 ${sub}`}>
                {activity.summary?.scope === 'my_account'
                  ? 'Activity linked to your account and uploaded documents.'
                  : 'Organization-wide uploads, audits, and system actions.'}
              </p>
            </div>
            {actLoading ? (
              <div className={`p-8 text-center text-sm ${sub}`}>Loading activity...</div>
            ) : activity.timeline?.length === 0 ? (
              <div className={`p-8 text-center text-sm ${sub}`}>No activity recorded yet.</div>
            ) : (
              <div className={`divide-y ${divider} max-h-[600px] overflow-y-auto`}>
                {activity.timeline.map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 px-5 py-3 ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-gray-50'}`}>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                      {ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.action}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold flex items-center gap-1 ${text}`}>
                        <User className="h-3 w-3" />{item.user}
                      </p>
                      <p className={`text-xs mt-0.5 ${sub}`}>{item.action || item.detail}</p>
                    </div>
                    <span className={`text-[10px] flex-shrink-0 ${sub}`}>
                      {item.time ? new Date(item.time).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generate modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl my-8 ${modalBg}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`text-base font-semibold ${text}`}>Generate Professional Report</h3>
                <p className={`text-xs mt-0.5 ${sub}`}>Tailored for {ROLE_LABELS[role]}</p>
              </div>
              <button onClick={() => setShowForm(false)}><X className={`h-5 w-5 ${sub}`} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={`block text-xs mb-1.5 font-medium ${sub}`}>Report Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. May 2026 Logistics Compliance Audit"
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`} />
              </div>

              <div>
                <label className={`block text-xs mb-1.5 font-medium ${sub}`}>Report Type</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {REPORT_TYPES.map(t => {
                    const allowed = t.roles.includes(role);
                    const selected = form.reportType === t.value;
                    return (
                      <button key={t.value} disabled={!allowed}
                        onClick={() => allowed && setForm(p => ({ ...p, reportType: t.value }))}
                        className={`w-full flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          !allowed ? 'opacity-40 cursor-not-allowed ' + (isDarkMode ? 'border-white/5' : 'border-gray-100')
                          : selected ? 'border-indigo-500/50 bg-indigo-500/10'
                          : isDarkMode ? 'border-white/8 hover:border-indigo-500/30' : 'border-gray-200 hover:border-indigo-200'
                        }`}>
                        <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${selected ? 'border-indigo-500 bg-indigo-500' : isDarkMode ? 'border-white/20' : 'border-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${selected ? 'text-indigo-400' : text}`}>{t.label}</span>
                            {!allowed && <Lock className="h-3 w-3 text-slate-500" />}
                          </div>
                          <p className={`text-[10px] mt-0.5 ${sub}`}>{t.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs mb-1.5 font-medium ${sub}`}>Period Start *</label>
                  <input type="date" value={form.periodStart} onChange={e => setForm(p => ({ ...p, periodStart: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`} />
                </div>
                <div>
                  <label className={`block text-xs mb-1.5 font-medium ${sub}`}>Period End *</label>
                  <input type="date" value={form.periodEnd} onChange={e => setForm(p => ({ ...p, periodEnd: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`} />
                </div>
              </div>

              {msg && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{msg}</p>}

              <button onClick={handleGenerate} disabled={busy}
                className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60 flex items-center justify-center gap-2">
                {busy ? (
                  <><div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Building report...</>
                ) : (
                  <><Plus className="h-4 w-4" /> Generate {selectedTypeInfo?.label || 'Report'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
