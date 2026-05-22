import React, { useState } from 'react';
import AppShell from '../components/AppShell';
import { ShieldCheck, Download, Eye, AlertTriangle, User, FileText, Settings, LogIn, Filter } from 'lucide-react';

const ACTION_ICONS = {
  login:    LogIn,
  view:     Eye,
  download: Download,
  upload:   FileText,
  modify:   Settings,
  delete:   AlertTriangle,
  share:    User,
};

const ACTION_COLORS = {
  login:    'bg-blue-500/15 text-blue-400',
  view:     'bg-slate-500/15 text-slate-400',
  download: 'bg-purple-500/15 text-purple-400',
  upload:   'bg-emerald-500/15 text-emerald-400',
  modify:   'bg-amber-500/15 text-amber-400',
  delete:   'bg-red-500/15 text-red-400',
  share:    'bg-cyan-500/15 text-cyan-400',
};

const MOCK_LOGS = [
  { id: 1, action: 'login',    user: 'sarah.johnson@sifco.local',   resource: 'System',                    ip: '10.0.1.5',   time: '2026-05-20 09:01:22', status: 'success' },
  { id: 2, action: 'upload',   user: 'doc.manager@sifco.local',     resource: 'Q1-Compliance-2026.pdf',    ip: '10.0.1.12',  time: '2026-05-20 09:15:44', status: 'success' },
  { id: 3, action: 'view',     user: 'auditor@sifco.local',         resource: 'Executive Compensation.pdf',ip: '10.0.1.8',   time: '2026-05-20 09:32:10', status: 'success' },
  { id: 4, action: 'download', user: 'viewer@sifco.local',          resource: 'Executive Compensation.pdf',ip: '10.0.1.20',  time: '2026-05-20 09:45:03', status: 'blocked' },
  { id: 5, action: 'modify',   user: 'doc.manager@sifco.local',     resource: 'HR-Policy-v3.docx',         ip: '10.0.1.12',  time: '2026-05-20 10:02:55', status: 'success' },
  { id: 6, action: 'delete',   user: 'sarah.johnson@sifco.local',   resource: 'Temp-Draft-001.pdf',        ip: '10.0.1.5',   time: '2026-05-20 10:18:30', status: 'success' },
  { id: 7, action: 'share',    user: 'auditor@sifco.local',         resource: 'Q1-Compliance-2026.pdf',    ip: '10.0.1.8',   time: '2026-05-20 10:35:12', status: 'success' },
  { id: 8, action: 'login',    user: 'unknown@external.com',        resource: 'System',                    ip: '185.22.4.1', time: '2026-05-20 11:00:00', status: 'failed' },
  { id: 9, action: 'download', user: 'doc.manager@sifco.local',     resource: 'Vendor-Contract-2026.pdf',  ip: '10.0.1.12',  time: '2026-05-20 11:22:44', status: 'success' },
  { id: 10, action: 'modify',  user: 'sarah.johnson@sifco.local',   resource: 'IT-Security-Policy.pdf',    ip: '10.0.1.5',   time: '2026-05-20 11:45:00', status: 'success' },
];

const STATUS_COLORS = {
  success: 'bg-emerald-500/15 text-emerald-400',
  blocked: 'bg-amber-500/15 text-amber-400',
  failed:  'bg-red-500/15 text-red-400',
};

const AuditLogPage = () => {
  const [filter, setFilter] = useState({ action: '', status: '', search: '' });

  const filtered = MOCK_LOGS.filter((log) => {
    const matchAction = !filter.action || log.action === filter.action;
    const matchStatus = !filter.status || log.status === filter.status;
    const matchSearch = !filter.search ||
      log.user.includes(filter.search) ||
      log.resource.toLowerCase().includes(filter.search.toLowerCase());
    return matchAction && matchStatus && matchSearch;
  });

  const anomalies = MOCK_LOGS.filter((l) => l.status === 'blocked' || l.status === 'failed');

  return (
    <AppShell title="Audit Trail & Logging" subtitle="Complete activity tracking for regulatory and forensic review">
      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Events', value: MOCK_LOGS.length, color: 'text-blue-400' },
          { label: 'Successful', value: MOCK_LOGS.filter((l) => l.status === 'success').length, color: 'text-emerald-400' },
          { label: 'Blocked', value: MOCK_LOGS.filter((l) => l.status === 'blocked').length, color: 'text-amber-400' },
          { label: 'Failed / Anomalies', value: MOCK_LOGS.filter((l) => l.status === 'failed').length, color: 'text-red-400' },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="mt-1 text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Anomaly alerts */}
      {anomalies.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-400">Anomaly Detection — {anomalies.length} Alert{anomalies.length > 1 ? 's' : ''}</h3>
          </div>
          <div className="space-y-2">
            {anomalies.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs">
                <span className="text-slate-300">{a.action.toUpperCase()} — {a.resource}</span>
                <span className="text-slate-500">{a.user} · {a.ip} · {a.time}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[a.status]}`}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search user or resource..."
          value={filter.search}
          onChange={(e) => setFilter((p) => ({ ...p, search: e.target.value }))}
          className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-[#0ea5e9]/50 min-w-[200px]"
        />
        <select
          value={filter.action}
          onChange={(e) => setFilter((p) => ({ ...p, action: e.target.value }))}
          className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-slate-300 outline-none"
        >
          <option value="">All Actions</option>
          {Object.keys(ACTION_ICONS).map((a) => (
            <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
          ))}
        </select>
        <select
          value={filter.status}
          onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}
          className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-slate-300 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="blocked">Blocked</option>
          <option value="failed">Failed</option>
        </select>
        <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 hover:text-white">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {/* Log table */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-500">
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Resource</th>
                <th className="px-4 py-3 text-left">IP Address</th>
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const Icon = ACTION_ICONS[log.action] || FileText;
                return (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${ACTION_COLORS[log.action]}`}>
                        <Icon className="h-3 w-3" />
                        {log.action}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">{log.user}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[180px] truncate">{log.resource}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{log.ip}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{log.time}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[log.status]}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-white/10 px-4 py-3 text-xs text-slate-500">
          Showing {filtered.length} of {MOCK_LOGS.length} events
        </div>
      </div>
    </AppShell>
  );
};

export default AuditLogPage;
