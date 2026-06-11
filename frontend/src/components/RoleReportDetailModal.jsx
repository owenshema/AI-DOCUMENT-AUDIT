import React, { useEffect, useState, useCallback } from 'react';
import { X, Download, RefreshCw, Calendar, Shield } from 'lucide-react';
import { roleReportsAPI } from '../api/auth';

const SUMMARY_LABELS = {
  total: 'Total',
  pending: 'Pending',
  audited: 'Audited',
  uploads: 'Uploads',
  findings: 'Findings',
  documentsReviewed: 'Documents reviewed',
  queueSize: 'In queue',
  avgScore: 'Avg score',
  passRate: 'Pass rate',
  audits: 'Audits',
  auditsInPeriod: 'Audits in period',
  auditsAnalyzed: 'Audits analyzed',
  categories: 'Finding categories',
  events: 'Events',
  revisions: 'Revisions',
  overdue: 'Overdue',
  slaDays: 'SLA (days)',
  rejected: 'Rejected',
  totalUploads: 'Total uploads',
  periods: 'Periods',
  stages: 'Pipeline stages',
  activeUsers: 'Active users',
  auditors: 'Auditors',
  inactive: 'Inactive accounts',
  thresholdDays: 'Inactive threshold (days)',
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
  storage: 'Storage used',
  errors: 'Failed actions',
  analyses: 'AI analyses',
  totalDocs: 'Total documents',
  completed: 'Completed',
};

function formatCellValue(value) {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function downloadCsv(report) {
  if (!report?.rows?.length || !report?.columns?.length) return;
  var header = report.columns.map(function (c) { return c.label; }).join(',');
  var lines = report.rows.map(function (row) {
    return report.columns.map(function (c) {
      var val = row[c.key] != null ? String(row[c.key]) : '';
      return '"' + val.replace(/"/g, '""') + '"';
    }).join(',');
  });
  var blob = new Blob([[header].concat(lines).join('\n')], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = (report.id || 'report') + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function RoleReportDetailModal({ reportMeta, isDarkMode, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(90);

  const card = isDarkMode ? 'bg-[#1a1d24] border-white/10' : 'bg-white border-gray-200';
  const text = isDarkMode ? 'text-white' : 'text-gray-900';
  const sub = isDarkMode ? 'text-slate-400' : 'text-gray-500';
  const rowHover = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const tableHead = isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-gray-50 text-gray-600';
  const inputCls = isDarkMode
    ? 'border-white/10 bg-[#0d0f14] text-white'
    : 'border-gray-300 bg-white text-gray-900';

  const loadReport = useCallback(function () {
    if (!reportMeta?.id) return;
    setLoading(true);
    setError('');
    roleReportsAPI.getReport(reportMeta.id, { days: days })
      .then(function (data) { setReport(data); })
      .catch(function (e) { setError(e?.response?.data?.error || 'Failed to load report'); })
      .finally(function () { setLoading(false); });
  }, [reportMeta?.id, days]);

  useEffect(function () { loadReport(); }, [loadReport]);

  if (!reportMeta) return null;

  var summaryItems = report?.summary ? Object.entries(report.summary) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border shadow-2xl ${card}`}>
        <div className={`border-b px-6 py-4 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className={`text-lg font-bold ${text}`}>{reportMeta.title}</h2>
              <p className={`mt-1 text-sm ${sub}`}>{reportMeta.description}</p>
              {report?.scopeLabel && (
                <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${isDarkMode ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                  <Shield className="h-3 w-3" /> {report.scopeLabel}
                </p>
              )}
            </div>
            <button onClick={onClose} className={`rounded-lg p-1.5 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
              <X className={`h-5 w-5 ${sub}`} />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${inputCls}`}>
              <Calendar className="h-3.5 w-3.5 opacity-60" />
              <span className={sub}>Period</span>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-transparent outline-none">
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 180 days</option>
                <option value={365}>Last 12 months</option>
              </select>
            </div>
            <button onClick={loadReport} className={`rounded-xl border p-2 ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''} ${sub}`} />
            </button>
            {report?.generatedAt && (
              <span className={`text-[10px] ${sub}`}>
                Generated {new Date(report.generatedAt).toLocaleString()} · {report.rows?.length || 0} rows
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className={`py-16 text-center text-sm ${sub}`}>
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin opacity-50" />
              Loading live data from your audit system...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
          ) : (
            <>
              {summaryItems.length > 0 && (
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {summaryItems.map(function ([key, val]) {
                    return (
                      <div key={key} className={`rounded-xl border px-3 py-3 ${isDarkMode ? 'border-white/8 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                        <p className={`text-[10px] uppercase tracking-wide ${sub}`}>{SUMMARY_LABELS[key] || key.replace(/([A-Z])/g, ' $1')}</p>
                        <p className={`mt-1 text-lg font-bold ${text}`}>{String(val)}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {report?.rows?.length > 0 ? (
                <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className={tableHead}>
                        {report.columns.map(function (col) {
                          return (
                            <th key={col.key} className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap">{col.label}</th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                      {report.rows.map(function (row, i) {
                        return (
                          <tr key={i} className={rowHover}>
                            {report.columns.map(function (col) {
                              return (
                                <td key={col.key} className={`px-4 py-2.5 text-xs ${text}`}>{formatCellValue(row[col.key])}</td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`rounded-xl border px-4 py-10 text-center text-sm ${isDarkMode ? 'border-white/8' : 'border-gray-200'} ${sub}`}>
                  No records in this period. Upload documents and run AI Analysis to populate this report.
                </div>
              )}
            </>
          )}
        </div>

        <div className={`flex justify-end gap-2 border-t px-6 py-4 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
          {report?.rows?.length > 0 && (
            <button
              onClick={function () { downloadCsv(report); }}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )}
          <button onClick={onClose} className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
