import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Edit2, Shield, Trash2 } from 'lucide-react';
import AppShell from '../components/AppShell';
import { authAPI } from '../api/auth';
import useAuthStore from '../store/authStore';
import { formatRoleLabel } from '../config/roles';

const ROLES = ['administrator', 'auditor', 'document_manager', 'client'];

const ROLE_COLORS = {
  administrator:    'bg-blue-600/15 text-blue-400',
  auditor:          'bg-blue-600/15 text-blue-400',
  document_manager: 'bg-blue-600/15 text-blue-400',
  client:           'bg-blue-600/15 text-blue-400',
};

const PERMISSIONS = {
  administrator:    ['Full system access', 'Manage all users', 'Generate login activity reports', 'Generate & export reports', 'Configure policies', 'View audit logs'],
  auditor:          ['Read & flag documents', 'Run AI analysis', 'Generate audit reports', 'View compliance data'],
  document_manager: ['View all documents', 'Track audit status', 'Notify auditors', 'View workflow (read-only)', 'View audit reports'],
  client: ['Upload logistics documents', 'Track audit status', 'View own reports'],
};

export default function UsersPage() {
  const { user: me, isDarkMode } = useAuthStore();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editUser, setEditUser]   = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [editRole, setEditRole]   = useState('');
  const [msg, setMsg]             = useState('');
  const [showPerms, setShowPerms] = useState(true);

  const card    = isDarkMode ? 'bg-[#122a45] border-white/8'  : 'bg-white border-gray-200 shadow-sm';
  const text    = isDarkMode ? 'text-white'    : 'text-gray-900';
  const sub     = isDarkMode ? 'text-slate-500': 'text-gray-500';
  const divider = isDarkMode ? 'divide-white/5': 'divide-gray-100';
  const inputCls = isDarkMode
    ? 'border-white/10 bg-[#0b1a2e] text-white outline-none'
    : 'border-gray-300 bg-white text-gray-900 outline-none';
  const modalBg = isDarkMode ? 'bg-[#122a45] border-white/10' : 'bg-white border-gray-200';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authAPI.listUsers({ limit: 50 });
      setUsers(res?.users || []);
    } catch { setUsers([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpdateRole = async () => {
    if (!editUser || !editRole) return;
    try {
      await authAPI.updateUserRole(editUser.id, editRole);
      setMsg(`Role updated for ${editUser.fullName}`);
      setEditUser(null);
      load();
    } catch (e) { setMsg(e?.response?.data?.error || 'Update failed'); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleToggle = async (u) => {
    try {
      await authAPI.updateUserStatus(u.id, !u.isActive);
      setMsg(`${u.fullName} ${u.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch { setMsg('Status update failed'); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await authAPI.deleteUser(deleteUser.id);
      setMsg(`${deleteUser.fullName || deleteUser.email} deleted permanently`);
      setDeleteUser(null);
      load();
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(false);
    }
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <AppShell title="Users & Auth">
      {/* Role permissions */}
      <div className={`mb-5 rounded-2xl border ${card}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <h2 className={`text-sm font-semibold ${text}`}>Role Permissions</h2>
          </div>
          <button onClick={() => setShowPerms(p => !p)} className={`text-xs ${sub} hover:${text}`}>
            {showPerms ? 'Hide' : 'Show'}
          </button>
        </div>
        {showPerms && (
          <div className="p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map(role => (
              <div key={role} className={`rounded-xl border p-3 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold mb-2 ${ROLE_COLORS[role]}`}>
                  {formatRoleLabel(role)}
                </span>
                <ul className="space-y-1">
                  {PERMISSIONS[role].map(p => (
                    <li key={p} className={`text-[11px] flex items-start gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users table */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
          <h2 className={`text-sm font-semibold ${text}`}>System Users ({users.length})</h2>
          <button onClick={load} className={`rounded-lg border p-1.5 transition-colors ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-400 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {msg && (
          <div className="mx-5 mt-3 rounded-lg bg-blue-600/10 border border-blue-400/30 px-3 py-2 text-xs text-blue-400">
            {msg}
          </div>
        )}

        {loading ? (
          <div className={`p-10 text-center text-sm ${sub}`}>Loading users...</div>
        ) : users.length === 0 ? (
          <div className={`p-10 text-center text-sm ${sub}`}>No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
                  {['Name', 'Email', 'Role', 'Status', 'Approval', 'Last Login', me?.role === 'administrator' ? 'Actions' : ''].filter(Boolean).map(h => (
                    <th key={h} className={`px-5 py-3 text-left font-medium ${sub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${divider}`}>
                {users.map(u => (
                  <tr key={u.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400 flex-shrink-0">
                          {(u.fullName || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className={`font-medium ${text}`}>{u.fullName}</span>
                      </div>
                    </td>
                    <td className={`px-5 py-3 text-xs ${sub}`}>{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[u.role] || ROLE_COLORS.client}`}>
                        {formatRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {u.isActive
                        ? <span className="flex items-center gap-1 text-xs text-blue-400"><CheckCircle2 className="h-3 w-3" /> Active</span>
                        : <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="h-3 w-3" /> Inactive</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        u.approvalStatus === 'pending' ? 'bg-blue-600/15 text-blue-400'
                        : u.approvalStatus === 'rejected' ? 'bg-red-500/15 text-red-400'
                        : 'bg-blue-600/15 text-blue-400'
                      }`}>
                        {u.approvalStatus || 'approved'}
                      </span>
                    </td>
                    <td className={`px-5 py-3 text-xs ${sub}`}>
                      {u.lastLogin
                        ? new Date(u.lastLogin).toLocaleString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                        : 'Never'}
                    </td>
                    {me?.role === 'administrator' && (
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditUser(u); setEditRole(u.role); }}
                            className={`rounded-lg border px-2 py-1 text-[10px] flex items-center gap-1 transition-colors ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-300 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                            <Edit2 className="h-3 w-3" /> Role
                          </button>
                          <button onClick={() => handleToggle(u)}
                            className={`rounded-lg px-2 py-1 text-[10px] font-medium border transition-colors ${u.isActive
                              ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                              : 'bg-blue-600/10 border-blue-400/30 text-blue-400 hover:bg-blue-600/20'}`}>
                            {u.isActive ? 'Deactivate' : u.approvalStatus === 'pending' ? 'Approve' : 'Activate'}
                          </button>
                          {u.id !== me?.id && u.role !== 'administrator' && (
                            <button onClick={() => setDeleteUser(u)}
                              className="rounded-lg px-2 py-1 text-[10px] font-medium border bg-red-600/10 border-red-600/20 text-red-400 hover:bg-red-600/20 transition-colors">
                              <span className="inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete user confirmation */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`no-card-lift w-full max-w-md rounded-2xl border p-6 shadow-2xl ${modalBg}`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/15">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  AI Audit Document System
                </p>
                <h3 className={`text-base font-semibold ${text}`}>Delete User</h3>
              </div>
            </div>
            <p className={`text-sm leading-relaxed ${text}`}>
              Do you want to delete this user?
            </p>
            <div className={`mt-3 rounded-xl border px-4 py-3 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
              <p className={`text-sm font-semibold ${text}`}>{deleteUser.fullName}</p>
              <p className={`text-xs ${sub}`}>{deleteUser.email}</p>
              <p className={`mt-1 text-[10px] capitalize ${sub}`}>{formatRoleLabel(deleteUser.role)}</p>
            </div>
            <p className={`mt-3 text-xs leading-relaxed ${sub}`}>
              This action is permanent and cannot be undone. The user will be removed from the system.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDeleteUser(null)}
                disabled={deleting}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-400 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit role modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${modalBg}`}>
            <h3 className={`text-base font-semibold mb-1 ${text}`}>Update Role</h3>
            <p className={`text-xs mb-4 ${sub}`}>{editUser.fullName} · {editUser.email}</p>
            <select value={editRole} onChange={e => setEditRole(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm mb-4 ${inputCls}`}>
              {ROLES.map(r => <option key={r} value={r}>{formatRoleLabel(r)}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={handleUpdateRole} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-600">Update</button>
              <button onClick={() => setEditUser(null)} className={`flex-1 rounded-xl border py-2.5 text-sm transition-colors ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-400 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
