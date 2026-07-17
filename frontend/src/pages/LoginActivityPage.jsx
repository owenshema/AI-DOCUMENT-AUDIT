import React, { useCallback, useEffect, useState } from 'react';
import { Download, LogIn, RefreshCw, Shield, Users } from 'lucide-react';
import AppShell from '../components/AppShell';
import { authAPI } from '../api/auth';
import useAuthStore from '../store/authStore';
import { formatRoleLabel } from '../config/roles';

const ACTION_LABELS = {
  login: 'Login',
  successful_login: 'Login',
  failed_login: 'Failed login',
  failed_otp: 'Failed OTP',
  login_blocked: 'Login blocked',
  account_locked: 'Account locked',
};

const STATUS_PILL = {
  success: 'bg-blue-600/15 text-blue-400',
  failure: 'bg-red-500/15 text-red-400',
};

function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultStartDate() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return ymdLocal(d);
}

function yesterdayYmd() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return ymdLocal(d);
}

export default function LoginActivityPage() {
  const { isDarkMode } = useAuthStore();
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(() => ymdLocal(new Date()));

  const applyPreset = (preset) => {
    if (preset === 'yesterday') {
      const y = yesterdayYmd();
      setStartDate(y);
      setEndDate(y);
      return;
    }
    if (preset === 'today') {
      const t = ymdLocal(new Date());
      setStartDate(t);
      setEndDate(t);
      return;
    }
    if (preset === 'last7') {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      setStartDate(ymdLocal(start));
      setEndDate(ymdLocal(end));
      return;
    }
    if (preset === 'last30') {
      setStartDate(defaultStartDate());
      setEndDate(ymdLocal(new Date()));
    }
  };
  const [activities, setActivities] = useState([]);
  const [userSummary, setUserSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [err, setErr] = useState('');
  const [generatedAt, setGeneratedAt] = useState(null);

  const card = isDarkMode ? 'bg-[#122a45] border-white/8' : 'bg-white border-gray-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-gray-900';
  const sub = isDarkMode ? 'text-slate-500' : 'text-gray-500';
  const divider = isDarkMode ? 'divide-white/5' : 'divide-gray-100';
  const inputCls = isDarkMode
    ? 'border-white/10 bg-[#0b1a2e] text-white outline-none'
    : 'border-gray-300 bg-white text-gray-900 outline-none';

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await authAPI.getLoginActivity({ startDate, endDate });
      setActivities(res?.activities || []);
      setUserSummary(res?.userSummary || []);
      setGeneratedAt(res?.generatedAt || new Date().toISOString());
    } catch (e) {
      setErr(e?.response?.data?.error || 'Could not generate login activity report.');
      setActivities([]);
      setUserSummary([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await authAPI.exportLoginActivity({ startDate, endDate });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `login_activity_${startDate}_to_${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErr('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const successCount = activities.filter(a => a.status === 'success').length;
  const failedCount = activities.filter(a => a.status === 'failure').length;

  return (
    <AppShell title="Login Activity">
      <p className={`mb-5 text-sm ${sub}`}>
        Generate a login activity report for all users with date, time, portal host, server name, client host, and IP address.
      </p>

      <div className={`mb-5 rounded-2xl border p-5 ${card}`}>
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'today', label: 'Today' },
            { id: 'last7', label: 'Last 7 days' },
            { id: 'last30', label: 'Last 30 days' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                isDarkMode
                  ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className={`mb-1.5 block text-xs font-medium ${sub}`}>From date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={`rounded-xl border px-3 py-2.5 text-sm ${inputCls}`}
            />
          </div>
          <div>
            <label className={`mb-1.5 block text-xs font-medium ${sub}`}>To date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={`rounded-xl border px-3 py-2.5 text-sm ${inputCls}`}
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Generate report
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || !activities.length}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
              isDarkMode ? 'border-white/10 bg-white/5 text-slate-300 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
        {generatedAt && (
          <p className={`mt-3 text-[11px] ${sub}`}>
            Last generated: {new Date(generatedAt).toLocaleString()}
          </p>
        )}
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-400">{err}</div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total events', value: activities.length, icon: LogIn, tone: 'text-blue-400' },
          { label: 'Successful logins', value: successCount, icon: Shield, tone: 'text-blue-400' },
          { label: 'Failed attempts', value: failedCount, icon: Users, tone: 'text-red-400' },
        ].map(item => (
          <div key={item.label} className={`rounded-2xl border p-4 ${card}`}>
            <div className="flex items-center justify-between">
              <item.icon className={`h-5 w-5 ${item.tone}`} />
              <p className={`text-2xl font-bold ${text}`}>{loading ? '—' : item.value}</p>
            </div>
            <p className={`mt-2 text-xs ${sub}`}>{item.label}</p>
          </div>
        ))}
      </div>

      <div className={`mb-5 overflow-hidden rounded-2xl border ${card}`}>
        <div className={`border-b px-5 py-4 ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
          <h2 className={`text-sm font-semibold ${text}`}>Latest login per user</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b text-xs ${isDarkMode ? 'border-white/8 text-slate-500' : 'border-gray-200 text-gray-500'}`}>
                {['User', 'Email', 'Role', 'Status', 'Last login date', 'Last login time'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${divider}`}>
              {loading ? (
                <tr><td colSpan={6} className={`px-4 py-8 text-center text-sm ${sub}`}>Generating report…</td></tr>
              ) : userSummary.map(u => (
                <tr key={u.userId} className={isDarkMode ? 'hover:bg-white/2' : 'hover:bg-gray-50'}>
                  <td className={`px-4 py-3 font-medium ${text}`}>{u.userName}</td>
                  <td className={`px-4 py-3 text-xs ${sub}`}>{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                      {formatRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive
                      ? <span className="text-xs text-blue-400">Active</span>
                      : <span className="text-xs text-red-400">Inactive</span>}
                  </td>
                  <td className={`px-4 py-3 text-xs ${text}`}>{u.lastLoginDate}</td>
                  <td className={`px-4 py-3 text-xs ${text}`}>{u.lastLoginTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border ${card}`}>
        <div className={`border-b px-5 py-4 ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
          <h2 className={`text-sm font-semibold ${text}`}>Login activity log ({activities.length})</h2>
        </div>
        {loading ? (
          <div className={`p-10 text-center text-sm ${sub}`}>Loading login events…</div>
        ) : activities.length === 0 ? (
          <div className={`p-10 text-center text-sm ${sub}`}>No login activity found for this date range.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs ${isDarkMode ? 'border-white/8 text-slate-500' : 'border-gray-200 text-gray-500'}`}>
                  {['Date', 'Time', 'User', 'Email', 'Role', 'Event', 'Status', 'Device', 'Portal / Host', 'Server', 'Client host', 'IP address'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${divider}`}>
                {activities.map(row => (
                  <tr key={row.id} className={isDarkMode ? 'hover:bg-white/2' : 'hover:bg-gray-50'}>
                    <td className={`px-4 py-3 text-xs font-medium ${text}`}>{row.date}</td>
                    <td className={`px-4 py-3 text-xs ${text}`}>{row.time}</td>
                    <td className={`px-4 py-3 font-medium ${text}`}>{row.userName}</td>
                    <td className={`px-4 py-3 text-xs ${sub}`}>{row.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] capitalize ${sub}`}>{formatRoleLabel(row.role)}</span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${text}`}>{ACTION_LABELS[row.action] || row.action}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_PILL[row.status] || 'bg-slate-500/15 text-slate-400'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${text}`} title={row.device}>{row.device || '—'}</td>
                    <td className={`px-4 py-3 text-xs ${text}`} title={row.portalHost}>{row.portalHost}</td>
                    <td className={`px-4 py-3 text-xs ${sub}`} title={row.serverHost}>{row.serverHost}</td>
                    <td className={`px-4 py-3 text-xs ${sub}`} title={row.clientHost}>{row.clientHost}</td>
                    <td className={`px-4 py-3 text-xs font-mono ${sub}`}>{row.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
