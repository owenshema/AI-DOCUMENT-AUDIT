import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Plus, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import AppShell from '../components/AppShell';
import { complianceAPI, documentAPI } from '../api/auth';

const CompliancePage = () => {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('check');
  const [policies, setPolicies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkState, setCheckState] = useState({ documentId: '', result: null, busy: false, error: '' });
  const [showNewPolicy, setShowNewPolicy] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ name: '', description: '', policyType: 'organizational', department: '' });
  const [policyMsg, setPolicyMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [polRes, docRes] = await Promise.allSettled([
      complianceAPI.getPolicies({ limit: 50 }),
      documentAPI.getAll({ limit: 50 }),
    ]);
    if (polRes.status === 'fulfilled') setPolicies(polRes.value?.policies || []);
    if (docRes.status === 'fulfilled') {
      const d = docRes.value?.documents || docRes.value || [];
      setDocuments(Array.isArray(d) ? d : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCheck = async () => {
    if (!checkState.documentId) return setCheckState(p => ({ ...p, error: 'Select a document.' }));
    setCheckState(p => ({ ...p, busy: true, error: '', result: null }));
    try {
      const res = await complianceAPI.checkDocument({ documentId: checkState.documentId });
      setCheckState(p => ({ ...p, busy: false, result: res }));
    } catch (err) {
      setCheckState(p => ({ ...p, busy: false, error: err?.response?.data?.error || 'Check failed.' }));
    }
  };

  const handleCreatePolicy = async () => {
    if (!newPolicy.name || !newPolicy.policyType) return setPolicyMsg('Name and type are required.');
    try {
      await complianceAPI.createPolicy(newPolicy);
      setPolicyMsg('Policy created successfully.');
      setShowNewPolicy(false);
      setNewPolicy({ name: '', description: '', policyType: 'organizational', department: '' });
      load();
    } catch (err) {
      setPolicyMsg(err?.response?.data?.error || 'Failed to create policy.');
    }
  };

  const result = checkState.result;

  return (
    <AppShell title="Compliance & Policy" subtitle="Automated policy validation and remediation">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {['check', 'policies'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? 'bg-[#0ea5e9] text-white' : 'text-slate-400 hover:text-white'}`}>
              {t === 'check' ? 'Run Check' : 'Policies'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white"><RefreshCw className="h-4 w-4" /></button>
          {(user?.role === 'administrator' || user?.role === 'document_manager') && (
            <button onClick={() => setShowNewPolicy(true)} className="flex items-center gap-2 rounded-lg bg-[#0ea5e9] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0284c7]">
              <Plus className="h-4 w-4" /> New Policy
            </button>
          )}
        </div>
      </div>

      {policyMsg && <p className="mb-4 text-sm text-[#38bdf8]">{policyMsg}</p>}

      {tab === 'check' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">Document Compliance Check</h2>
            <div className="flex flex-wrap gap-3">
              <select value={checkState.documentId} onChange={e => setCheckState(p => ({ ...p, documentId: e.target.value }))}
                className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-white outline-none">
                <option value="">Select a document...</option>
                {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <button onClick={handleCheck} disabled={checkState.busy}
                className="rounded-lg bg-[#0ea5e9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60">
                {checkState.busy ? 'Checking...' : 'Run Compliance Check'}
              </button>
            </div>
            {checkState.error && <p className="mt-2 text-sm text-red-400">{checkState.error}</p>}

            {result && (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/3 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${result.complianceCheck?.complianceScore >= 70 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    {result.complianceCheck?.complianceScore >= 70
                      ? <CheckCircle className="h-5 w-5 text-emerald-400" />
                      : <XCircle className="h-5 w-5 text-red-400" />}
                  </div>
                  <div>
                    <p className="font-semibold text-white">Compliance Score: {result.complianceCheck?.complianceScore ?? 0}%</p>
                    <p className="text-xs text-slate-500">{result.policies} polic{result.policies === 1 ? 'y' : 'ies'} checked</p>
                  </div>
                </div>
                {result.findings?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400">Findings:</p>
                    {result.findings.map((f, i) => (
                      <div key={i} className={`rounded-lg p-3 text-xs ${f.compliant ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                        <div className="flex items-center gap-2">
                          {f.compliant ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-red-400" />}
                          <span className={`font-medium ${f.compliant ? 'text-emerald-300' : 'text-red-300'}`}>{f.policyName}</span>
                          <span className={`ml-auto font-semibold ${f.compliant ? 'text-emerald-400' : 'text-red-400'}`}>{f.compliant ? 'PASSED' : 'FAILED'}</span>
                        </div>
                        {!f.compliant && f.findings?.length > 0 && (
                          <ul className="mt-1 list-disc list-inside text-slate-400">
                            {f.findings.map((issue, j) => <li key={j}>{issue}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'policies' && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Active Policies ({policies.length})</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading policies...</div>
          ) : policies.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No policies configured yet.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {policies.map(p => (
                <div key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#0ea5e9]/15 px-2 py-0.5 text-[10px] text-[#38bdf8]">{p.policyType}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>{p.status}</span>
                        {p.regulatoryFrameworks?.map(f => (
                          <span key={f} className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] text-purple-400">{f}</span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">v{p.version}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Policy Modal */}
      {showNewPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0d1117] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Create Policy</h2>
              <button onClick={() => setShowNewPolicy(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Policy Name *</label>
                <input value={newPolicy.name} onChange={e => setNewPolicy(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-[#0ea5e9]/50" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Type *</label>
                <select value={newPolicy.policyType} onChange={e => setNewPolicy(p => ({ ...p, policyType: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none">
                  {['organizational', 'regulatory', 'departmental', 'security'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Department</label>
                <input value={newPolicy.department} onChange={e => setNewPolicy(p => ({ ...p, department: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-[#0ea5e9]/50" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Description</label>
                <textarea value={newPolicy.description} onChange={e => setNewPolicy(p => ({ ...p, description: e.target.value }))}
                  rows={2} className="w-full rounded-lg border border-white/10 bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-[#0ea5e9]/50" />
              </div>
              <button onClick={handleCreatePolicy} className="w-full rounded-lg bg-[#0ea5e9] py-2.5 text-sm font-semibold text-white hover:bg-[#0284c7]">
                Create Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default CompliancePage;
