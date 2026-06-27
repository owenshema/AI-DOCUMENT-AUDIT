import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, Bell, CheckCircle2, Clock, FileText, RefreshCw,
  Ship, X,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import { documentAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

const FILTERS = [
  { key: 'all', label: 'All Documents' },
  { key: 'needs_audit', label: 'Needs Audit' },
  { key: 'never_audited', label: 'Never Audited' },
  { key: 'urgent', label: 'Urgent' },
];

const AUDIT_PILL = {
  needs_audit: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  audited: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  pending: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

function AuditBadge({ state }) {
  const label = state === 'needs_audit' ? 'Needs audit' : state === 'audited' ? 'Audited' : 'Pending';
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${AUDIT_PILL[state] || AUDIT_PILL.pending}`}>
      {label}
    </span>
  );
}

export default function DocumentManagementPage() {
  const { isDarkMode } = useAuthStore();
  const [filter, setFilter] = useState('all');
  const [summary, setSummary] = useState({ total: 0, needsAudit: 0, neverAudited: 0, urgent: 0, audited: 0 });
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [notifyDoc, setNotifyDoc] = useState(null);
  const [notifyForm, setNotifyForm] = useState({ urgent: false, port: '', note: '' });
  const [busy, setBusy] = useState(false);

  const card = isDarkMode ? 'bg-[#111318] border-white/8' : 'bg-white border-gray-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-gray-900';
  const sub = isDarkMode ? 'text-slate-500' : 'text-gray-500';
  const inputCls = isDarkMode
    ? 'border-white/10 bg-[#0d0f14] text-white placeholder-slate-600'
    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400';

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await documentAPI.getManagement({ filter, limit: 100 });
      setSummary(res?.summary || { total: 0, needsAudit: 0, neverAudited: 0, urgent: 0, audited: 0 });
      setDocuments(res?.documents || []);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Could not load documents.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openNotify = (doc) => {
    if (doc.auditState === 'audited') return;
    setNotifyDoc(doc);
    setNotifyForm({
      urgent: Boolean(doc.isUrgent),
      port: doc.arrivalPort || '',
      note: doc.neverAudited
        ? 'This document has not been audited yet. Please complete the audit.'
        : '',
    });
    setMsg('');
    setErr('');
  };

  const handleNotify = async () => {
    if (!notifyDoc) return;
    setBusy(true);
    setErr('');
    try {
      const res = await documentAPI.requestAudit(notifyDoc.id, {
        urgent: notifyForm.urgent,
        port: notifyForm.port.trim() || null,
        note: notifyForm.note.trim() || null,
      });
      setMsg(res?.message || 'Auditors notified.');
      setNotifyDoc(null);
      load();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to notify auditors.');
    } finally {
      setBusy(false);
    }
  };

  const handleFlagUpdate = async (doc, patch) => {
    try {
      await documentAPI.update(doc.id, patch);
      load();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Could not update document flags.');
    }
  };

  const statCards = [
    { label: 'Total documents', value: summary.total, icon: FileText, tone: 'text-indigo-400' },
    { label: 'Needs audit', value: summary.needsAudit, icon: Clock, tone: 'text-amber-400' },
    { label: 'Never audited', value: summary.neverAudited, icon: AlertTriangle, tone: 'text-red-400' },
    { label: 'Urgent', value: summary.urgent, icon: AlertTriangle, tone: 'text-red-400' },
  ];

  const canNotifyAuditors = (doc) => doc.auditState !== 'audited';

  return (
    <AppShell title="Document Management">
      <p className={`mb-5 text-sm ${sub}`}>
        View all documents, track audit progress, and notify auditors when a document still needs review — including urgent or port-arrival cases.
      </p>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(item => (
          <div key={item.label} className={`rounded-2xl border p-4 ${card}`}>
            <div className="flex items-center justify-between">
              <item.icon className={`h-5 w-5 ${item.tone}`} />
              <p className={`text-2xl font-bold ${text}`}>{item.value}</p>
            </div>
            <p className={`mt-2 text-xs ${sub}`}>{item.label}</p>
          </div>
        ))}
      </div>

      <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${card}`}>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                filter === tab.key
                  ? 'bg-indigo-500 text-white'
                  : isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading}
          className={`rounded-xl border p-2 ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-400 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {msg && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-400">{msg}</div>}
      {err && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-400">{err}</div>}

      <div className={`overflow-hidden rounded-2xl border ${card}`}>
        <div className={`border-b px-5 py-4 ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
          <h2 className={`text-sm font-semibold ${text}`}>Documents ({documents.length})</h2>
        </div>

        {loading ? (
          <div className={`p-10 text-center text-sm ${sub}`}>Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className={`p-10 text-center text-sm ${sub}`}>No documents match this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs ${isDarkMode ? 'border-white/8 text-slate-500' : 'border-gray-200 text-gray-500'}`}>
                  {['Document', 'Uploaded by', 'Status', 'Audit', 'Port', 'Flags', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                {documents.map(doc => (
                  <tr key={doc.id} className={isDarkMode ? 'hover:bg-white/2' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3">
                      <p className={`font-medium ${text}`}>{doc.title || doc.fileName}</p>
                      <p className={`text-xs ${sub}`}>{doc.category} · {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '—'}</p>
                    </td>
                    <td className={`px-4 py-3 text-xs ${sub}`}>
                      {doc.uploader?.fullName || doc.uploader?.email || 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] capitalize text-slate-300">
                        {(doc.status || 'uploaded').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AuditBadge state={doc.auditState} />
                      {doc.neverAudited && (
                        <p className="mt-1 text-[10px] text-red-400">No auditor review yet</p>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-xs ${sub}`}>
                      {doc.arrivalPort ? (
                        <span className="inline-flex items-center gap-1 text-indigo-300">
                          <Ship className="h-3 w-3" /> {doc.arrivalPort}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {doc.isUrgent
                          ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">Urgent</span>
                          : <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">Normal</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canNotifyAuditors(doc) ? (
                          <button
                            onClick={() => openNotify(doc)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/15 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-300 hover:bg-indigo-500/25"
                          >
                            <Bell className="h-3 w-3" /> Notify auditor
                          </button>
                        ) : (
                          <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                            <CheckCircle2 className="h-3 w-3" /> Audit complete
                          </span>
                        )}
                        {canNotifyAuditors(doc) && (
                          <button
                            onClick={() => handleFlagUpdate(doc, { isUrgent: !doc.isUrgent })}
                            className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold ${doc.isUrgent ? 'bg-red-500/20 text-red-300' : 'border border-white/10 text-slate-400'}`}
                          >
                            {doc.isUrgent ? 'Mark normal' : 'Mark urgent'}
                          </button>
                        )}
                      </div>
                      {doc.lastAuditRequestAt && (
                        <p className={`mt-1 text-[10px] ${sub}`}>
                          Last notified {new Date(doc.lastAuditRequestAt).toLocaleString()}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {notifyDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDarkMode ? 'bg-[#1a1d24] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className={`text-base font-semibold ${text}`}>Notify auditors</h3>
                <p className={`mt-1 text-xs ${sub}`}>{notifyDoc.title || notifyDoc.fileName}</p>
              </div>
              <button onClick={() => setNotifyDoc(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className={`flex items-center gap-2 text-sm ${text}`}>
                <input type="checkbox" checked={notifyForm.urgent} onChange={e => setNotifyForm(p => ({ ...p, urgent: e.target.checked }))} />
                Mark as urgent — priority audit required
              </label>
              <div>
                <label className={`mb-1 block text-xs ${sub}`}>Arrival port (optional)</label>
                <input
                  value={notifyForm.port}
                  onChange={e => setNotifyForm(p => ({ ...p, port: e.target.value }))}
                  placeholder="e.g. Jebel Ali, Port of Rotterdam"
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`}
                />
              </div>
              <div>
                <label className={`mb-1 block text-xs ${sub}`}>Message to auditors</label>
                <textarea
                  value={notifyForm.note}
                  onChange={e => setNotifyForm(p => ({ ...p, note: e.target.value }))}
                  rows={3}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`}
                />
              </div>
              <div className={`rounded-xl border px-3 py-2 text-xs ${isDarkMode ? 'border-amber-500/20 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                Auditors will receive an in-app notification and email asking them to audit this document.
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleNotify} disabled={busy}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60">
                  <Bell className="h-4 w-4" /> {busy ? 'Sending...' : 'Send to auditors'}
                </button>
                <button onClick={() => setNotifyDoc(null)}
                  className={`rounded-xl border px-4 py-2.5 text-sm ${isDarkMode ? 'border-white/10 text-slate-400' : 'border-gray-200 text-gray-600'}`}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
