import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Archive, Bell, Lock, Plus, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import AppShell from '../components/AppShell';
import { retentionAPI, dashboardAPI } from '../api/auth';

const SettingsPage = () => {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('retention');
  const [retentionPolicies, setRetentionPolicies] = useState([]);
  const [expiringDocs, setExpiringDocs] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewRetention, setShowNewRetention] = useState(false);
  const [newRetention, setNewRetention] = useState({ name: '', documentType: '', retentionDays: 365, action: 'archive' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [retRes, expRes, healthRes] = await Promise.allSettled([
      retentionAPI.getPolicies(),
      retentionAPI.getExpiring(),
      dashboardAPI.getSystemHealth(),
    ]);
    if (retRes.status === 'fulfilled') setRetentionPolicies(retRes.value?.policies || retRes.value || []);
    if (expRes.status === 'fulfilled') {
      const d = expRes.value?.documents || expRes.value || [];
      setExpiringDocs(Array.isArray(d) ? d : []);
    }
    if (healthRes.status === 'fulfilled') setSystemHealth(healthRes.value);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateRetention = async () => {
    if (!newRetention.name || !newRetention.documentType) return setMsg('Name and document type are required.');
    try {
      await retentionAPI.createPolicy({
        name: newRetention.name,
        documentTypes: [newRetention.documentType],
        retentionDays: newRetention.retentionDays,
        automationRules: { action: newRetention.action },
      });
      setMsg('Retention policy created.');
      setShowNewRetention(false);
      setNewRetention({ name: '', documentType: '', retentionDays: 365, action: 'archive' });
      load();
    } catch (err) { setMsg(err?.response?.data?.error || 'Failed to create policy.'); }
  };

  const handleLegalHold = async (docId) => {
    try {
      await retentionAPI.setLegalHold({ documentIds: [docId], reason: 'Legal hold applied from settings' });
      setMsg('Legal hold applied.');
    } catch { setMsg('Failed to apply legal hold.'); }
  };

  return (
    <AppShell title="System Settings" subtitle="Retention policies, legal hold, and platform governance">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {[
            { key: 'retention', icon: Archive, label: 'Retention' },
            { key: 'expiring', icon: Bell, label: 'Expiring Docs' },
            { key: 'system', icon: Lock, label: 'System Health' },
          ].map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === key ? 'bg-[#0ea5e9] text-white' : 'text-slate-400 hover:text-white'}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <button onClick={load} className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {msg && <p className="mb-4 text-sm text-[#38bdf8]">{msg}</p>}

      {tab === 'retention' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setShowNewRetention(true)} className="flex items-center gap-2 rounded-lg bg-[#0ea5e9] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0284c7]">
              <Plus className="h-4 w-4" /> New Retention Policy
            </button>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="border-b border-white/10 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Retention Policies ({retentionPolicies.length})</h2>
            </div>
            {loading ? (
              <div className="p-12 text-center text-slate-500">Loading...</div>
            ) : retentionPolicies.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No retention policies configured.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {retentionPolicies.map((p, i) => (
                  <div key={p.id || i} className="flex items-start justify-between p-4">
                    <div>
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-slate-500">Type: {p.documentType} · {p.retentionDays} days · Action: {p.action}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'expiring' && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Expiring Documents ({expiringDocs.length})</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading...</div>
          ) : expiringDocs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No documents expiring soon.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {expiringDocs.map(d => (
                <div key={d.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-white">{d.title}</p>
                    <p className="text-xs text-slate-500">Expires: {d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                  <button onClick={() => handleLegalHold(d.id)}
                    className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20">
                    Apply Legal Hold
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'system' && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">System Health</h2>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : systemHealth ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: 'Status', value: systemHealth.status },
                { label: 'Version', value: systemHealth.version },
                { label: 'Uptime', value: `${Math.round((systemHealth.uptime || 0) / 60)} min` },
                { label: 'Timestamp', value: systemHealth.timestamp ? new Date(systemHealth.timestamp).toLocaleTimeString() : '-' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/3 p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-white capitalize">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">Unable to fetch system health.</p>
          )}
        </div>
      )}

      {showNewRetention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0d1117] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">New Retention Policy</h2>
              <button onClick={() => setShowNewRetention(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Policy Name *</label>
                <input value={newRetention.name} onChange={e => setNewRetention(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-[#0ea5e9]/50" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Document Type *</label>
                <input value={newRetention.documentType} onChange={e => setNewRetention(p => ({ ...p, documentType: e.target.value }))}
                  placeholder="e.g. contract, invoice, policy"
                  className="w-full rounded-lg border border-white/10 bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-[#0ea5e9]/50" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Retention Period (days)</label>
                <input type="number" value={newRetention.retentionDays} onChange={e => setNewRetention(p => ({ ...p, retentionDays: parseInt(e.target.value) || 365 }))}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Action After Retention</label>
                <select value={newRetention.action} onChange={e => setNewRetention(p => ({ ...p, action: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none">
                  {['archive', 'delete', 'review', 'notify'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <button onClick={handleCreateRetention} className="w-full rounded-lg bg-[#0ea5e9] py-2.5 text-sm font-semibold text-white hover:bg-[#0284c7]">
                Create Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default SettingsPage;
