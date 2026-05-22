import React, { useState } from 'react';
import AppShell from '../components/AppShell';
import { Archive, Clock, AlertTriangle, CheckCircle2, Lock, Trash2, RotateCcw } from 'lucide-react';

const RETENTION_POLICIES = [
  { id: 1, name: 'Financial Records', type: 'Finance', period: '7 years', autoArchive: true, legalHold: false, count: 34 },
  { id: 2, name: 'HR Documents', type: 'HR', period: '5 years', autoArchive: true, legalHold: false, count: 67 },
  { id: 3, name: 'Contracts & Agreements', type: 'Legal', period: '10 years', autoArchive: false, legalHold: true, count: 22 },
  { id: 4, name: 'IT Security Logs', type: 'IT', period: '3 years', autoArchive: true, legalHold: false, count: 89 },
  { id: 5, name: 'Compliance Reports', type: 'Compliance', period: '5 years', autoArchive: true, legalHold: false, count: 41 },
];

const EXPIRING_DOCS = [
  { id: 1, title: 'Vendor Contract 2019', type: 'Legal', expires: '2026-06-01', daysLeft: 12, status: 'expiring' },
  { id: 2, title: 'Finance Audit 2019', type: 'Finance', expires: '2026-06-15', daysLeft: 26, status: 'expiring' },
  { id: 3, title: 'HR Records Batch A', type: 'HR', expires: '2026-07-01', daysLeft: 42, status: 'scheduled' },
  { id: 4, title: 'IT Incident Log 2023', type: 'IT', expires: '2026-05-25', daysLeft: 5, status: 'critical' },
];

const ARCHIVED = [
  { id: 1, title: 'Annual Report 2020', archivedOn: '2025-01-10', size: '4.2 MB', canRestore: true },
  { id: 2, title: 'Q3 Compliance 2021', archivedOn: '2024-10-05', size: '1.8 MB', canRestore: true },
  { id: 3, title: 'HR Policy v1', archivedOn: '2024-06-20', size: '0.6 MB', canRestore: false },
];

const STATUS_COLORS = {
  critical:  'bg-red-500/15 text-red-400 border-red-500/20',
  expiring:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
  scheduled: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

const RetentionPage = () => {
  const [actionMsg, setActionMsg] = useState('');

  const handleAction = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3000);
  };

  return (
    <AppShell title="Retention & Archival" subtitle="Retention policies, legal hold, archiving, and disposition workflows">
      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Active Policies', value: RETENTION_POLICIES.length, icon: Archive, color: 'text-blue-400' },
          { label: 'Expiring Soon', value: EXPIRING_DOCS.filter((d) => d.status !== 'scheduled').length, icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'On Legal Hold', value: RETENTION_POLICIES.filter((p) => p.legalHold).length, icon: Lock, color: 'text-red-400' },
          { label: 'Archived Docs', value: ARCHIVED.length, icon: CheckCircle2, color: 'text-emerald-400' },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <c.icon className={`mb-2 h-4 w-4 ${c.color}`} />
            <p className="text-2xl font-bold text-white">{c.value}</p>
            <p className="text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {actionMsg && (
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
          {actionMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Retention policies */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Retention Policies</h2>
          </div>
          <div className="divide-y divide-white/5">
            {RETENTION_POLICIES.map((policy) => (
              <div key={policy.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{policy.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span>{policy.type}</span>
                    <span>·</span>
                    <span>{policy.period}</span>
                    <span>·</span>
                    <span>{policy.count} docs</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {policy.legalHold && (
                    <span className="rounded-full border border-red-500/20 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                      Legal Hold
                    </span>
                  )}
                  {policy.autoArchive && (
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                      Auto
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expiring documents */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Document Expiry Dashboard</h2>
          </div>
          <div className="divide-y divide-white/5">
            {EXPIRING_DOCS.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{doc.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span>{doc.type}</span>
                    <span>·</span>
                    <span>Expires {doc.expires}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[doc.status]}`}>
                    {doc.daysLeft}d left
                  </span>
                  <button
                    onClick={() => handleAction(`Disposition workflow started for "${doc.title}".`)}
                    className="rounded px-2 py-1 text-[10px] bg-white/5 text-slate-400 hover:text-white"
                  >
                    Dispose
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Archive browser */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden lg:col-span-2">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Archive Repository</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-500">
                  <th className="px-4 py-3 text-left">Document</th>
                  <th className="px-4 py-3 text-left">Archived On</th>
                  <th className="px-4 py-3 text-left">Size</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ARCHIVED.map((doc) => (
                  <tr key={doc.id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="px-4 py-3 text-xs text-white">{doc.title}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{doc.archivedOn}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{doc.size}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {doc.canRestore && (
                          <button
                            onClick={() => handleAction(`Restore request submitted for "${doc.title}".`)}
                            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
                          >
                            <RotateCcw className="h-3 w-3" /> Restore
                          </button>
                        )}
                        <button
                          onClick={() => handleAction(`Permanent deletion scheduled for "${doc.title}".`)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] bg-red-500/15 text-red-400 hover:bg-red-500/25"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default RetentionPage;
