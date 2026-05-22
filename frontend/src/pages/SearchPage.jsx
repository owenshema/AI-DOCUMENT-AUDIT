import React, { useState } from 'react';
import AppShell from '../components/AppShell';
import { Search, Filter, FileText, Download, Eye, Clock, Bookmark, X } from 'lucide-react';

const MOCK_RESULTS = [
  { id: 1, title: 'Q1 Compliance Report 2026', type: 'PDF', department: 'Finance', date: '2026-04-10', status: 'approved', size: '2.4 MB', relevance: 98 },
  { id: 2, title: 'HR Policy Manual v3', type: 'DOCX', department: 'HR', date: '2026-03-15', status: 'reviewed', size: '1.1 MB', relevance: 91 },
  { id: 3, title: 'IT Security Framework', type: 'PDF', department: 'IT', date: '2026-02-28', status: 'draft', size: '3.7 MB', relevance: 85 },
  { id: 4, title: 'Vendor Contract — Al Futtaim', type: 'PDF', department: 'Operations', date: '2026-01-20', status: 'approved', size: '0.9 MB', relevance: 79 },
  { id: 5, title: 'Annual Audit Summary 2025', type: 'XLSX', department: 'Finance', date: '2025-12-31', status: 'archived', size: '5.2 MB', relevance: 74 },
];

const SAVED_SEARCHES = [
  'compliance reports 2026',
  'HR policy updates',
  'vendor contracts Finance',
];

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [filters, setFilters] = useState({ type: '', department: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (q = query) => {
    const term = q.toLowerCase();
    const filtered = MOCK_RESULTS.filter((r) => {
      const matchQuery = !term || r.title.toLowerCase().includes(term) || r.department.toLowerCase().includes(term);
      const matchType = !filters.type || r.type === filters.type;
      const matchDept = !filters.department || r.department === filters.department;
      const matchStatus = !filters.status || r.status === filters.status;
      return matchQuery && matchType && matchDept && matchStatus;
    });
    setResults(filtered);
    setSearched(true);
  };

  const handleSavedSearch = (s) => {
    setQuery(s);
    handleSearch(s);
  };

  const STATUS_COLORS = {
    approved: 'bg-emerald-500/15 text-emerald-400',
    reviewed: 'bg-blue-500/15 text-blue-400',
    draft:    'bg-amber-500/15 text-amber-400',
    archived: 'bg-slate-500/15 text-slate-400',
  };

  return (
    <AppShell title="Advanced Search & Discovery" subtitle="Full-text and metadata-based document search">
      {/* Search bar */}
      <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search documents by title, content, department, or metadata..."
              className="w-full rounded-lg border border-white/10 bg-[#0d1117] py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#0ea5e9]/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 hover:text-white"
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
          <button
            onClick={() => handleSearch()}
            className="rounded-lg bg-[#0ea5e9] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0284c7]"
          >
            Search
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3 border-t border-white/10 pt-4">
            <select
              value={filters.type}
              onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
              className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-slate-300 outline-none"
            >
              <option value="">All Types</option>
              <option value="PDF">PDF</option>
              <option value="DOCX">DOCX</option>
              <option value="XLSX">XLSX</option>
            </select>
            <select
              value={filters.department}
              onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))}
              className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-slate-300 outline-none"
            >
              <option value="">All Departments</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
              <option value="IT">IT</option>
              <option value="Operations">Operations</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-slate-300 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="reviewed">Reviewed</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Saved searches */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Bookmark className="h-4 w-4 text-[#38bdf8]" /> Saved Searches
            </h3>
            <ul className="space-y-2">
              {SAVED_SEARCHES.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => handleSavedSearch(s)}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-400 hover:bg-white/5 hover:text-white"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>

            <h3 className="mb-3 mt-5 flex items-center gap-2 text-sm font-semibold text-white">
              <Clock className="h-4 w-4 text-[#38bdf8]" /> Recent Searches
            </h3>
            <ul className="space-y-1 text-xs text-slate-500">
              <li className="px-3 py-1">compliance 2026</li>
              <li className="px-3 py-1">vendor contracts</li>
              <li className="px-3 py-1">IT security</li>
            </ul>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {!searched ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-500">
              <div className="text-center">
                <Search className="mx-auto mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm">Enter a search query to find documents</p>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-500">
              <p className="text-sm">No documents found matching your query.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
              {results.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-[#0ea5e9]/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#0ea5e9]/15 text-[#38bdf8]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{r.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{r.type}</span>
                          <span>·</span>
                          <span>{r.department}</span>
                          <span>·</span>
                          <span>{r.date}</span>
                          <span>·</span>
                          <span>{r.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                      <span className="text-xs font-semibold text-[#38bdf8]">{r.relevance}%</span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="flex items-center gap-1 rounded px-2 py-1 text-[10px] bg-white/5 text-slate-400 hover:text-white">
                      <Eye className="h-3 w-3" /> Preview
                    </button>
                    <button className="flex items-center gap-1 rounded px-2 py-1 text-[10px] bg-white/5 text-slate-400 hover:text-white">
                      <Download className="h-3 w-3" /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default SearchPage;
