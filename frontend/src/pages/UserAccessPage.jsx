import React, { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, CheckCircle, XCircle, Edit } from 'lucide-react';
import useAuthStore from '../store/authStore';
import AppShell from '../components/AppShell';
import { authAPI } from '../api/auth';

const ROLES = ['administrator', 'auditor', 'document_manager', 'viewer'];

const UserAccessPage = () => {
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [msg, setMsg] = useState('');
  const [searchQ, setSearchQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authAPI.listUsers({ limit: 100 });
      setUsers(res?.users || []);
    } catch { setUsers([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpdateRole = async () => {
    if (!editUser || !editRole) return;
    try {
      await authAPI.updateUserRole(editUser.id, editRole);
      setMsg(`Role updated for ${editUser.fullName}.`);
      setEditUser(null);
      load();
    } catch (err) { setMsg(err?.response?.data?.error || 'Update failed.'); }
  };

  const handleToggleStatus = async (u) => {
    try {
      await authAPI.updateUserStatus(u.id, !u.isActive);
      setMsg(`User ${u.isActive ? 'deactivated' : 'activated'}.`);
      load();
    } catch (err) { setMsg(err?.response?.data?.error || 'Status update failed.'); }
  };

  const filtered = users.filter(u =>
    !searchQ || u.fullName?.toLowerCase().includes(searchQ.toLowerCase()) || u.email?.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <AppShell title="User Access Management" subtitle="Manage user roles and access rights">
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#0ea5e9]/50"
            placeholder="Search users..." />
        </div>
        <button onClick={load} className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {msg && <p className="mb-4 text-sm text-[#38bdf8]">{msg}</p>}

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">System Users ({filtered.length})</h2>
        </div>
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-500">
                  {['Name', 'Email', 'Department', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="px-4 py-3 text-sm font-medium text-white">{u.fullName}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{u.email}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{u.department}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#0ea5e9]/15 px-2 py-0.5 text-[10px] font-semibold text-[#38bdf8] capitalize">{u.role?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="h-3 w-3" /> Active</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="h-3 w-3" /> Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                    <td className="px-4 py-3">
                      {user?.role === 'administrator' && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditUser(u); setEditRole(u.role); }}
                            className="rounded p-1 text-[#38bdf8] hover:bg-[#0ea5e9]/10"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleToggleStatus(u)}
                            className={`rounded px-2 py-1 text-[10px] font-medium ${u.isActive ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25' : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'}`}>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0d1117] p-6 shadow-xl">
            <h2 className="mb-4 text-base font-bold text-white">Update Role</h2>
            <p className="mb-3 text-sm text-slate-400">User: {editUser.fullName}</p>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-slate-400">New Role</label>
              <select value={editRole} onChange={e => setEditRole(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none">
                {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleUpdateRole} className="flex-1 rounded-lg bg-[#0ea5e9] py-2 text-sm font-semibold text-white hover:bg-[#0284c7]">Update</button>
              <button onClick={() => setEditUser(null)} className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default UserAccessPage;
