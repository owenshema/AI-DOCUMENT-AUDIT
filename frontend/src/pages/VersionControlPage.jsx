import React, { useState } from 'react';
import AppShell from '../components/AppShell';
import { History, GitBranch, RotateCcw, Eye, ChevronRight, User, CheckCircle2 } from 'lucide-react';

const MOCK_VERSIONS = [
  {
    id: 1, docTitle: 'Q1 Compliance Report 2026', versions: [
      { v: '3.0', date: '2026-05-18', author: 'Sarah Johnson', note: 'Final approved version', status: 'approved', major: true },
      { v: '2.1', date: '2026-05-15', author: 'Lead Auditor', note: 'Minor corrections to section 4', status: 'reviewed', major: false },
      { v: '2.0', date: '2026-05-10', author: 'Document Manager', note: 'Added compliance annexure', status: 'reviewed', major: true },
      { v: '1.0', date: '2026-04-28', author: 'Sarah Johnson', note: 'Initial draft', status: 'draft', major: true },
    ],
  },
  {
    id: 2, docTitle: 'HR Policy Manual', versions: [
      { v: '2.0', date: '2026-05-12', author: 'Document Manager', note: 'Updated leave policy', status: 'approved', major: true },
      { v: '1.2', date: '2026-04-20', author: 'Lead Auditor', note: 'Formatting fixes', status: 'reviewed', major: false },
      { v: '1.0', date: '2026-03-01', author: 'Sarah Johnson', note: 'Initial version', status: 'draft', major: true },
    ],
  },
];

const STATUS_COLORS = {
  approved: 'bg-emerald-500/15 text-emerald-400',
  reviewed: 'bg-blue-500/15 text-blue-400',
  draft:    'bg-amber-500/15 text-amber-400',
};

const VersionControlPage = () => {
  const [selectedDoc, setSelectedDoc] = useState(MOCK_VERSIONS[0]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  const handleRestore = (v) => {
    setActionMsg(`Version ${v} restored as the current working copy.`);
    setTimeout(() => setActionMsg(''), 3000);
  };

  return (
    <AppShell title="Version Control & History" subtitle="Track changes, compare versions, and restore previous document states">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Document list */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="text-sm font-semibold text-white">Documents</h2>
            </div>
            <div className="divide-y divide-white/5">
              {MOCK_VERSIONS.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDoc(doc); setCompareMode(false); setCompareA(null); setCompareB(null); }}
                  className={`w-full px-5 py-3 text-left transition hover:bg-white/5 ${selectedDoc.id === doc.id ? 'bg-[#0ea5e9]/10' : ''}`}
                >
                  <p className={`text-sm font-medium ${selectedDoc.id === doc.id ? 'text-[#38bdf8]' : 'text-white'}`}>{doc.docTitle}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{doc.versions.length} versions</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Version timeline */}
        <div className="lg:col-span-2">
          {actionMsg && (
            <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
              {actionMsg}
            </div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">{selectedDoc.docTitle}</h2>
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                compareMode
                  ? 'border-[#0ea5e9]/40 bg-[#0ea5e9]/15 text-[#38bdf8]'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {compareMode ? 'Exit Compare' : 'Compare Versions'}
            </button>
          </div>

          {compareMode && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="mb-3 text-xs text-slate-400">Select two versions to compare:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {['Version A', 'Version B'].map((label, i) => (
                  <div key={label}>
                    <p className="mb-1.5 text-xs font-medium text-slate-500">{label}</p>
                    <select
                      className="w-full rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-white outline-none"
                      onChange={(e) => i === 0 ? setCompareA(e.target.value) : setCompareB(e.target.value)}
                    >
                      <option value="">Select version</option>
                      {selectedDoc.versions.map((v) => (
                        <option key={v.v} value={v.v}>v{v.v} — {v.date}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {compareA && compareB && compareA !== compareB && (
                <div className="mt-4 rounded-lg border border-white/10 bg-white/3 p-4 text-xs text-slate-400">
                  <p className="mb-2 font-semibold text-white">Comparing v{compareA} → v{compareB}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded bg-red-500/10 p-3 text-red-400">
                      <p className="mb-1 font-medium">v{compareA} (older)</p>
                      <p>— Section 4.2 compliance clause missing</p>
                      <p>— Annexure not included</p>
                    </div>
                    <div className="rounded bg-emerald-500/10 p-3 text-emerald-400">
                      <p className="mb-1 font-medium">v{compareB} (newer)</p>
                      <p>+ Section 4.2 compliance clause added</p>
                      <p>+ Annexure A appended</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-white/10" />
            <div className="space-y-4">
              {selectedDoc.versions.map((ver, idx) => (
                <div key={ver.v} className="relative flex gap-4 pl-12">
                  <div className={`absolute left-3.5 top-3 h-3 w-3 rounded-full border-2 ${
                    idx === 0 ? 'border-[#0ea5e9] bg-[#0ea5e9]' : 'border-white/20 bg-[#0d1117]'
                  }`} />
                  <div className="flex-1 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">v{ver.v}</span>
                          {ver.major && (
                            <span className="rounded-full border border-[#0ea5e9]/30 bg-[#0ea5e9]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#38bdf8]">
                              Major
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[ver.status]}`}>
                            {ver.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{ver.note}</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {ver.author}
                        </div>
                        <p className="mt-0.5">{ver.date}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="flex items-center gap-1 rounded px-2 py-1 text-[10px] bg-white/5 text-slate-400 hover:text-white">
                        <Eye className="h-3 w-3" /> View
                      </button>
                      {idx !== 0 && (
                        <button
                          onClick={() => handleRestore(ver.v)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                        >
                          <RotateCcw className="h-3 w-3" /> Restore
                        </button>
                      )}
                      {idx === 0 && (
                        <span className="flex items-center gap-1 rounded px-2 py-1 text-[10px] bg-emerald-500/15 text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Current
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default VersionControlPage;
