import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Filter, FileText, FileBarChart2, Eye, Bookmark, Clock,
  X, ChevronDown, SlidersHorizontal,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import { searchAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

const DOC_STATUSES = ['uploaded', 'in_review', 'approved', 'rejected', 'changes_requested'];
const FILE_FORMATS = ['pdf', 'docx', 'xlsx', 'png', 'jpg'];
const DEPARTMENTS = ['Finance', 'Operations', 'Compliance', 'Logistics', 'General'];
const REPORT_TYPES = [
  { value: '', label: 'All report types' },
  { value: 'compliance_audit', label: 'Compliance Audit' },
  { value: 'daily_report', label: 'Daily Activity' },
  { value: 'document_review', label: 'Document Review' },
  { value: 'exception_report', label: 'Exception Report' },
];

const STATUS_PILL = {
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/20',
  in_review: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  uploaded: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  published: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  draft: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  archived: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

function scoreColor(score) {
  if (score == null) return 'text-slate-400';
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-indigo-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { isDarkMode } = useAuthStore();

  const [tab, setTab] = useState(params.get('tab') || 'documents');
  const [query, setQuery] = useState(params.get('q') || '');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [savedSearches, setSavedSearches] = useState([]);
  const [history, setHistory] = useState([]);
  const [filters, setFilters] = useState({
    fileFormat: '',
    department: '',
    status: '',
    reportType: '',
    dateFrom: '',
    dateTo: '',
  });

  const card = isDarkMode ? 'bg-[#111318] border-white/8' : 'bg-white border-gray-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-gray-900';
  const sub = isDarkMode ? 'text-slate-500' : 'text-gray-500';
  const inputCls = isDarkMode
    ? 'border-white/10 bg-[#0d0f14] text-white placeholder-slate-600 focus:border-indigo-500/60'
    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-400';

  const activeFilterCount = useMemo(() => Object.values(filters).filter(Boolean).length, [filters]);

  const runSearch = useCallback(async (opts = {}) => {
    const term = (opts.query ?? query).trim();
    const searchTab = opts.tab ?? tab;
    setLoading(true);
    setSearched(true);

    try {
      let res;
      if (searchTab === 'reports') {
        res = await searchAPI.advanced({
          title: term || undefined,
          searchReports: true,
          reportType: filters.reportType || undefined,
          status: filters.status || undefined,
          uploadedByRange: filters.dateFrom && filters.dateTo
            ? { from: filters.dateFrom, to: filters.dateTo }
            : undefined,
        }, { limit: 30, page: 1 });
      } else if (term || activeFilterCount > 0) {
        res = await searchAPI.search(term, {
          filters: {
            fileFormat: filters.fileFormat || undefined,
            department: filters.department || undefined,
            status: filters.status || undefined,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
          },
          limit: 30,
          page: 1,
        });
      } else {
        setResults([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setResults(res?.results || []);
      setTotal(res?.total || 0);
      setParams({
        q: term || '',
        tab: searchTab,
      });
    } catch {
      setResults([]);
      setTotal(0);
    }
    setLoading(false);
  }, [query, tab, filters, activeFilterCount, setParams]);

  useEffect(() => {
    searchAPI.getSaved().then((r) => setSavedSearches(r?.searches || [])).catch(() => {});
    searchAPI.getHistory().then((r) => setHistory(r?.history || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (params.get('q')) runSearch({ query: params.get('q') });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearFilters = () => setFilters({
    fileFormat: '', department: '', status: '', reportType: '', dateFrom: '', dateTo: '',
  });

  const openResult = (item) => {
    if (item.kind === 'report' || tab === 'reports') {
      navigate('/audit-reports');
    } else {
      navigate('/documents');
    }
  };

  return (
    <AppShell title="Search">
      <div className={`mb-6 rounded-2xl border p-5 ${card}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${sub}`} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder={tab === 'reports' ? 'Search audit reports by title...' : 'Search documents by title, content, department...'}
              className={`w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none ${inputCls}`}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters((p) => !p)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilterCount}</span>
              )}
            </button>
            <button
              onClick={() => runSearch()}
              className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
            >
              Search
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {['documents', 'reports'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (searched) runSearch({ tab: t }); }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize ${tab === t ? 'bg-indigo-500 text-white' : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-gray-100 text-gray-600'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className={`mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3 ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
            {tab === 'documents' ? (
              <>
                <select value={filters.fileFormat} onChange={(e) => setFilters((p) => ({ ...p, fileFormat: e.target.value }))} className={`rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`}>
                  <option value="">All file types</option>
                  {FILE_FORMATS.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                </select>
                <select value={filters.department} onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))} className={`rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`}>
                  <option value="">All departments</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className={`rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`}>
                  <option value="">All statuses</option>
                  {DOC_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </>
            ) : (
              <>
                <select value={filters.reportType} onChange={(e) => setFilters((p) => ({ ...p, reportType: e.target.value }))} className={`rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`}>
                  {REPORT_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className={`rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`}>
                  <option value="">All statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </>
            )}
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))} className={`rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`} />
            <input type="date" value={filters.dateTo} onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))} className={`rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`} />
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className={`flex items-center justify-center gap-1 rounded-xl border px-3 py-2.5 text-xs ${isDarkMode ? 'border-white/10 text-slate-400' : 'border-gray-200 text-gray-600'}`}>
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <aside className="space-y-4 lg:col-span-1">
          <div className={`rounded-2xl border p-4 ${card}`}>
            <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${text}`}>
              <Bookmark className="h-4 w-4 text-indigo-400" /> Saved searches
            </h3>
            {savedSearches.length === 0 ? (
              <p className={`text-xs ${sub}`}>No saved searches yet.</p>
            ) : (
              <ul className="space-y-1">
                {savedSearches.slice(0, 6).map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => { setQuery(s.query || s.searchName); runSearch({ query: s.query || s.searchName }); }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs ${isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {s.searchName || s.query}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`rounded-2xl border p-4 ${card}`}>
            <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${text}`}>
              <Clock className="h-4 w-4 text-indigo-400" /> Recent
            </h3>
            {history.length === 0 ? (
              <p className={`text-xs ${sub}`}>Your recent searches appear here.</p>
            ) : (
              <ul className="space-y-1">
                {history.slice(0, 6).map((h, i) => (
                  <li key={i}>
                    <button
                      onClick={() => h.query && (setQuery(h.query), runSearch({ query: h.query }))}
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs ${sub}`}
                    >
                      {h.query || 'Search'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <div className="lg:col-span-3">
          {!searched ? (
            <div className={`flex h-56 flex-col items-center justify-center rounded-2xl border ${card}`}>
              <Search className={`mb-3 h-10 w-10 ${isDarkMode ? 'text-slate-700' : 'text-gray-300'}`} />
              <p className={`text-sm font-medium ${text}`}>Search across your audit system</p>
              <p className={`mt-1 max-w-md text-center text-xs ${sub}`}>
                Find documents by title or content, filter by department and status, or search generated audit reports.
              </p>
            </div>
          ) : loading ? (
            <div className={`flex h-56 items-center justify-center rounded-2xl border ${card}`}>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : results.length === 0 ? (
            <div className={`flex h-56 flex-col items-center justify-center rounded-2xl border ${card}`}>
              <Filter className={`mb-3 h-8 w-8 ${sub}`} />
              <p className={`text-sm ${text}`}>No results found</p>
              <p className={`mt-1 text-xs ${sub}`}>Try different keywords or adjust your filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className={`text-xs ${sub}`}>{total} result{total !== 1 ? 's' : ''} found</p>
              {results.map((item) => {
                const isReport = item.kind === 'report' || tab === 'reports';
                const Icon = isReport ? FileBarChart2 : FileText;
                const health = item.overallAuditScore ?? item.complianceScore;
                return (
                  <div key={item.id} className={`rounded-2xl border p-4 transition-colors hover:border-indigo-500/30 ${card}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isDarkMode ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
                          <Icon className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate font-semibold ${text}`}>{item.title}</p>
                          <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${sub}`}>
                            {isReport ? (
                              <>
                                <span>{(item.reportType || 'report').replace(/_/g, ' ')}</span>
                                {item.periodStart && <span>· {item.periodStart} to {item.periodEnd}</span>}
                              </>
                            ) : (
                              <>
                                <span>{(item.fileFormat || 'file').toUpperCase()}</span>
                                {item.department && <span>· {item.department}</span>}
                                {item.category && <span>· {item.category}</span>}
                              </>
                            )}
                            {item.createdAt && (
                              <span>· {new Date(item.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-2">
                        {item.status && (
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_PILL[item.status] || STATUS_PILL.uploaded}`}>
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        )}
                        {health != null && (
                          <span className={`text-sm font-bold ${scoreColor(health)}`}>{Math.round(health)}% health</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => openResult(item)}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${isDarkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        <Eye className="h-3.5 w-3.5" /> Open
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
