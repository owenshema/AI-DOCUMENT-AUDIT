import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { X, Download, RefreshCw, Calendar, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';
import { roleReportsAPI } from '../api/auth';
import useAuthStore from '../store/authStore';
import { exportFormatIdsForRole } from '../config/reportExports';
import { normalizeRole } from '../config/roles';

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
  events: 'Total activities',
  logins: 'Sign-ins',
  other: 'Other activities',
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

const EXPORT_FORMATS = [
  { id: 'pdf', label: 'PDF document', ext: 'pdf', Icon: FileText },
  { id: 'excel', label: 'Excel spreadsheet', ext: 'xlsx', Icon: FileSpreadsheet },
];

function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgoYmd(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymdLocal(d);
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function RoleReportDetailModal({ reportMeta, isDarkMode, onClose }) {
  const { user } = useAuthStore();
  const role = normalizeRole(user?.role);
  const allowedFormats = useMemo(function () {
    const ids = exportFormatIdsForRole(role);
    return EXPORT_FORMATS.filter(function (fmt) { return ids.includes(fmt.id); });
  }, [role]);
  const pdfOnly = allowedFormats.length === 1;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(() => daysAgoYmd(6));
  const [endDate, setEndDate] = useState(() => ymdLocal(new Date()));
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState('');
  const exportRef = useRef(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  const card = isDarkMode ? 'bg-[#122a45] border-white/10' : 'bg-white border-gray-200';
  const text = isDarkMode ? 'text-white' : 'text-gray-900';
  const sub = isDarkMode ? 'text-slate-400' : 'text-gray-500';
  const rowHover = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const tableHead = isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-gray-50 text-gray-600';
  const inputCls = isDarkMode
    ? 'border-white/10 bg-[#0b1a2e] text-white [color-scheme:dark]'
    : 'border-gray-300 bg-white text-gray-900 [color-scheme:light]';

  const openDatePicker = useCallback(function (ref) {
    const el = ref?.current;
    if (!el) return;
    el.focus();
    if (typeof el.showPicker === 'function') {
      try { el.showPicker(); } catch (_) { /* ignore */ }
    }
  }, []);

  const loadReport = useCallback(function (params) {
    if (!reportMeta?.id) return;
    const from = params?.startDate ?? startDate;
    const to = params?.endDate ?? endDate;
    if (!from || !to) {
      setError('Choose a start date and end date.');
      return;
    }
    if (from > to) {
      setError('Start date must be on or before end date.');
      return;
    }
    setLoading(true);
    setError('');
    roleReportsAPI.getReport(reportMeta.id, { startDate: from, endDate: to })
      .then(function (data) { setReport(data); })
      .catch(function (e) { setError(e?.response?.data?.error || 'Failed to load report'); })
      .finally(function () { setLoading(false); });
  }, [reportMeta?.id, startDate, endDate]);

  // Load once when the modal opens — do not reload on every calendar keystroke
  useEffect(function () {
    if (!reportMeta?.id) return;
    loadReport({ startDate, endDate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportMeta?.id]);

  useEffect(function () {
    function onClickOutside(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return function () { document.removeEventListener('mousedown', onClickOutside); };
  }, []);

  const handleExport = useCallback(function (fmt) {
    if (!reportMeta?.id) return;
    if (!startDate || !endDate || startDate > endDate) {
      setError('Choose a valid start date and end date before exporting.');
      return;
    }
    setExportOpen(false);
    setExporting(fmt.id);
    setError('');
    roleReportsAPI.exportReport(reportMeta.id, fmt.id, { startDate, endDate })
      .then(function (res) {
        saveBlob(new Blob([res.data]), (reportMeta.id || 'report') + '_' + startDate + '_to_' + endDate + '.' + fmt.ext);
      })
      .catch(function (e) {
        const apiErr = e?.response?.data?.error;
        setError(apiErr || 'Export failed. Please try again.');
      })
      .finally(function () { setExporting(''); });
  }, [reportMeta?.id, startDate, endDate]);

  if (!reportMeta) return null;

  var summaryItems = report?.summary ? Object.entries(report.summary) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`no-card-lift flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border shadow-2xl text-sm ${card}`}>
        <div className={`border-b px-6 py-4 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className={`text-lg font-bold ${text}`}>{reportMeta.title}</h2>
              <p className={`mt-1 text-sm ${sub}`}>{reportMeta.description}</p>
            </div>
            <button onClick={onClose} className={`rounded-lg p-1.5 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
              <X className={`h-5 w-5 ${sub}`} />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className={`mb-1 block text-[11px] font-medium ${sub}`} htmlFor="report-start-date">Start date</label>
              <div
                role="presentation"
                onClick={function () { openDatePicker(startInputRef); }}
                className={`flex min-w-[12rem] cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs ${inputCls}`}
              >
                <Calendar className="pointer-events-none h-3.5 w-3.5 shrink-0 opacity-60" />
                <input
                  id="report-start-date"
                  ref={startInputRef}
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={function (e) { setStartDate(e.target.value); }}
                  className="min-w-0 flex-1 cursor-pointer bg-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className={`mb-1 block text-[11px] font-medium ${sub}`} htmlFor="report-end-date">End date</label>
              <div
                role="presentation"
                onClick={function () { openDatePicker(endInputRef); }}
                className={`flex min-w-[12rem] cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs ${inputCls}`}
              >
                <Calendar className="pointer-events-none h-3.5 w-3.5 shrink-0 opacity-60" />
                <input
                  id="report-end-date"
                  ref={endInputRef}
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={function (e) { setEndDate(e.target.value); }}
                  className="min-w-0 flex-1 cursor-pointer bg-transparent outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={function () { loadReport(); }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Apply
            </button>
            {report?.generatedAt && (
              <span className={`pb-1 text-[10px] ${sub}`}>
                {report.periodLabel ? `${report.periodLabel} · ` : ''}
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
            pdfOnly ? (
              <button
                onClick={function () { handleExport(allowedFormats[0]); }}
                disabled={!!exporting}
                className={`flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50`}
              >
                {exporting ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Downloading PDF...</>
                ) : (
                  <><Download className="h-4 w-4" /> Download PDF</>
                )}
              </button>
            ) : (
            <div className="relative" ref={exportRef}>
              <button
                onClick={function () { setExportOpen(function (o) { return !o; }); }}
                disabled={!!exporting}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-50 ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                {exporting ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Exporting {exporting.toUpperCase()}...</>
                ) : (
                  <><Download className="h-4 w-4" /> Export <ChevronDown className="h-3.5 w-3.5 opacity-70" /></>
                )}
              </button>
              {exportOpen && (
                <div className={`no-card-lift absolute bottom-full right-0 z-20 mb-2 w-52 overflow-hidden rounded-xl border shadow-xl ${isDarkMode ? 'border-white/10 bg-[#122a45]' : 'border-gray-200 bg-white'}`}>
                  {allowedFormats.map(function (fmt) {
                    const Icon = fmt.Icon;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={function () { handleExport(fmt); }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-normal ${isDarkMode ? 'text-slate-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                        <span className="flex-1">{fmt.label}</span>
                        <span className={`text-[10px] uppercase ${sub}`}>.{fmt.ext}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            )
          )}
          <button onClick={onClose} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
