import React, { useEffect, useState, useCallback } from 'react';
import { FileBarChart2, Plus, RefreshCw, Download, X, ChevronDown, ChevronUp, Activity, Upload, Bot, FileText, LogIn, Trash2, Lock } from 'lucide-react';
import AppShell from '../components/AppShell';
import { auditAPI, auditLogAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

const STATUS_PILL = {
  draft:     'bg-slate-500/15 text-slate-400',
  published: 'bg-indigo-500/15 text-indigo-400',
  archived:  'bg-amber-500/15 text-amber-400',
};

// Report types with access control
const REPORT_TYPES = [
  { value: 'daily_report',      label: 'Daily Activity Report',   roles: ['administrator','auditor','document_manager','viewer'], desc: 'Summary of all system activity for a day or period' },
  { value: 'policy_report',     label: 'Policy Compliance Report', roles: ['administrator','auditor','document_manager','viewer'], desc: 'Policy adherence across uploaded documents' },
  { value: 'compliance_audit',  label: 'Compliance Audit',         roles: ['administrator','auditor','document_manager'],         desc: 'Full compliance audit with scoring and violations' },
  { value: 'document_review',   label: 'Document Review Report',   roles: ['administrator','auditor','document_manager'],         desc: 'Review of all documents uploaded in the period' },
  { value: 'financial_report',  label: 'Financial Report',         roles: ['administrator','auditor'],                            desc: 'Financial document analysis — invoices, contracts, bills' },
  { value: 'security_audit',    label: 'Security Audit',           roles: ['administrator','auditor'],                            desc: 'Security events, access logs, and anomalies' },
  { value: 'exception_report',  label: 'Exception Report',         roles: ['administrator','auditor'],                            desc: 'High-risk and non-compliant documents only' },
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
  a.setAttribute('download', `audit_report_${reportId.slice(0,8)}.${format === 'PDF' ? 'pdf' : 'csv'}`);
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

export default function AuditReportsPage() {
  const { user, isDarkMode } = useAuthStore();
  const token = localStorage.getItem('token') || '';
  const role  = user?.role || 'viewer';

  const [reports, setReports]     = useState([]);
  const [activity, setActivity]   = useState({ timeline: [], summary: {} });
  const [loading, setLoading]     = useState(true);
  const [actLoading, setActLoading] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'activity'
  const [form, setForm]           = useState({ title: '', reportType: 'daily_report', periodStart: today(), periodEnd: today() });
  const [busy, setBusy]           = useState(false);
  const [msg, setMsg]             = useState('');
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

  useEffect(() => { load(); loadActivity(); }, [load, loadActivity]);

  // Filter report types by role
  const allowedTypes = REPORT_TYPES.filter(t => t.roles.includes(role));

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
      await auditAPI.generateReport(form);
      setShowForm(false);
      setForm({ title: '', reportType: 'daily_report', periodStart: today(), periodEnd: today() });
      load(); loadActivity();
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
    try { await auditAPI.archiveReport(id); load(); } catch {}
  };

  const selectedTypeInfo = REPORT_TYPES.find(t => t.value === form.reportType);

  return (
    <AppShell title="Audit Reports">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1">
          {['reports', 'activity'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab
                ? 'bg-indigo-500 text-white'
                : isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {tab === 'reports' ? `Reports (${reports.length})` : 'Activity Log'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => { load(); loadActivity(); }}
            className={`rounded-xl border p-2 transition-colors ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-400 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setShowForm(true); setMsg(''); }}
            className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600">
            <Plus className="h-4 w-4" /> Generate Report
          </button>
        </div>
      </div>

      {/* ── Reports Tab ── */}
      {activeTab === 'reports' && (
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className={`border-b px-5 py-4 ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
            <h2 className={`text-sm font-semibold ${text}`}>Report Archive ({reports.length})</h2>
          </div>
          {loading ? (
            <div className={`p-10 text-center text-sm ${sub}`}>Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="p-10 text-center">
              <FileBarChart2 className={`mx-auto mb-3 h-10 w-10 ${isDarkMode ? 'text-slate-700' : 'text-gray-300'}`} />
              <p className={`text-sm ${sub}`}>No reports yet. Generate your first audit report.</p>
            </div>
          ) : (
            <div className={`divide-y ${divider}`}>
              {reports.map(r => (
                <div key={r.id}>
                  <div className={`flex items-start gap-3 px-5 py-4 transition-colors ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-gray-50'}`}>
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isDarkMode ? 'bg-indigo-500/15 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-100'}`}>
                      <FileBarChart2 className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className={`text-sm font-medium ${text}`}>{r.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_PILL[r.status] || STATUS_PILL.draft}`}>{r.status}</span>
                      </div>
                      <p className={`text-xs ${sub}`}>
                        {r.reportType?.replace(/_/g, ' ')}
                        {r.periodStart ? ` · ${new Date(r.periodStart).toLocaleDateString()}` : ''}
                        {r.periodEnd   ? ` – ${new Date(r.periodEnd).toLocaleDateString()}`   : ''}
                        {r.complianceScore != null ? ` · Score: ${r.complianceScore}/100` : ''}
                        {r.metrics?.totalDocuments != null ? ` · ${r.metrics.totalDocuments} docs` : ''}
                      </p>
                      {r.executiveSummary && (
                        <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                          className="mt-1.5 flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300">
                          {expanded === r.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {expanded === r.id ? 'Hide' : 'View'} full report
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                      {['PDF', 'Excel'].map(fmt => (
                        <button key={fmt} onClick={() => handleExport(r.id, fmt)}
                          disabled={downloading[`${r.id}_${fmt}`]}
                          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-colors disabled:opacity-60 ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-indigo-500/15 hover:border-indigo-500/30 hover:text-indigo-300' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600'}`}>
                          <Download className="h-3 w-3" />
                          {downloading[`${r.id}_${fmt}`] ? '...' : fmt}
                        </button>
                      ))}
                      {r.status !== 'archived' && (role === 'administrator' || role === 'auditor') && (
                        <button onClick={() => handleArchive(r.id)}
                          className={`rounded-lg border px-2.5 py-1.5 text-[10px] transition-colors ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-400 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                  {expanded === r.id && r.executiveSummary && (
                    <div className={`px-5 pb-4 border-t ${isDarkMode ? 'border-white/5 bg-white/2' : 'border-gray-100 bg-gray-50'}`}>
                      <pre className={`mt-3 whitespace-pre-wrap text-xs font-mono leading-relaxed max-h-96 overflow-y-auto rounded-xl border p-4 ${isDarkMode ? 'border-white/8 bg-[#0d0f14] text-slate-300' : 'border-gray-200 bg-white text-gray-700'}`}>
                        {r.executiveSummary}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Activity Tab ── */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          {/* Summary cards */}
          {activity.summary && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Documents Uploaded', value: activity.summary.totalUploads ?? 0, color: 'text-indigo-400' },
                { label: 'AI Analyses Run',    value: activity.summary.totalAnalyses ?? 0, color: 'text-emerald-400' },
                { label: 'Reports Generated',  value: activity.summary.totalReports ?? 0,  color: 'text-amber-400' },
                { label: 'Total Actions',      value: activity.summary.totalActions ?? 0,  color: 'text-slate-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-2xl border p-4 ${card}`}>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className={`text-xs mt-1 ${sub}`}>{label}</p>
                  <p className={`text-[10px] mt-0.5 ${sub}`}>Last 30 days</p>
                </div>
              ))}
            </div>
          )}

          {/* Timeline */}
          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            <div className={`border-b px-5 py-4 ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
              <h2 className={`text-sm font-semibold ${text}`}>Activity Timeline</h2>
              <p className={`text-xs mt-0.5 ${sub}`}>All system actions — who uploaded, audited, or generated reports</p>
            </div>
            {actLoading ? (
              <div className={`p-8 text-center text-sm ${sub}`}>Loading activity...</div>
            ) : activity.timeline?.length === 0 ? (
              <div className={`p-8 text-center text-sm ${sub}`}>No activity recorded yet.</div>
            ) : (
              <div className={`divide-y ${divider} max-h-[600px] overflow-y-auto`}>
                {activity.timeline.map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 px-5 py-3 ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-gray-50'}`}>
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                      {ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.action}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${text}`}>{item.user}</p>
                      <p className={`text-xs ${sub} truncate`}>{item.action}</p>
                    </div>
                    <span className={`text-[10px] flex-shrink-0 ${sub}`}>{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Generate Report Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${modalBg}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`text-base font-semibold ${text}`}>Generate Audit Report</h3>
              <button onClick={() => setShowForm(false)}><X className={`h-5 w-5 ${sub}`} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={`block text-xs mb-1.5 ${sub}`}>Report Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. May 2026 Daily Activity Report"
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`} />
              </div>

              <div>
                <label className={`block text-xs mb-1.5 ${sub}`}>Report Type</label>
                <div className="space-y-1.5">
                  {REPORT_TYPES.map(t => {
                    const allowed = t.roles.includes(role);
                    const selected = form.reportType === t.value;
                    return (
                      <button key={t.value} disabled={!allowed}
                        onClick={() => allowed && setForm(p => ({ ...p, reportType: t.value }))}
                        className={`w-full flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          !allowed ? 'opacity-40 cursor-not-allowed ' + (isDarkMode ? 'border-white/5 bg-white/2' : 'border-gray-100 bg-gray-50')
                          : selected ? 'border-indigo-500/50 bg-indigo-500/10'
                          : isDarkMode ? 'border-white/8 bg-white/3 hover:border-indigo-500/30 hover:bg-indigo-500/5'
                          : 'border-gray-200 bg-gray-50 hover:border-indigo-200 hover:bg-indigo-50'
                        }`}>
                        <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${selected ? 'border-indigo-500 bg-indigo-500' : isDarkMode ? 'border-white/20' : 'border-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${selected ? 'text-indigo-400' : text}`}>{t.label}</span>
                            {!allowed && <Lock className="h-3 w-3 text-slate-500" />}
                          </div>
                          <p className={`text-[10px] mt-0.5 ${sub}`}>{t.desc}</p>
                          {!allowed && <p className="text-[10px] text-amber-500 mt-0.5">Requires: {t.roles.slice(0,2).join(', ')}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs mb-1.5 ${sub}`}>Period Start *</label>
                  <input type="date" value={form.periodStart} onChange={e => setForm(p => ({ ...p, periodStart: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`} />
                </div>
                <div>
                  <label className={`block text-xs mb-1.5 ${sub}`}>Period End *</label>
                  <input type="date" value={form.periodEnd} onChange={e => setForm(p => ({ ...p, periodEnd: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`} />
                </div>
              </div>

              {msg && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{msg}</p>}

              <button onClick={handleGenerate} disabled={busy}
                className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60 flex items-center justify-center gap-2">
                {busy ? (
                  <><div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Generating...</>
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
