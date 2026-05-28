import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, BarChart2, Bell, Bot, CheckCircle2,
  Clock, FileText, ShieldCheck, Upload, Users,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import { analysisAPI, dashboardAPI, documentAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

const STATUS_LABEL = {
  uploaded: 'Uploaded',
  in_review: 'In Review',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes Needed',
};

const STATUS_PILL = {
  uploaded: 'bg-slate-500/15 text-slate-400',
  in_review: 'bg-amber-500/15 text-amber-400',
  in_progress: 'bg-blue-500/15 text-blue-400',
  submitted: 'bg-indigo-500/15 text-indigo-400',
  reviewed: 'bg-purple-500/15 text-purple-400',
  approved: 'bg-emerald-500/15 text-emerald-400',
  rejected: 'bg-red-500/15 text-red-400',
  changes_requested: 'bg-orange-500/15 text-orange-400',
};

function roleLabel(role) {
  return (role || 'viewer').replace(/_/g, ' ');
}

function StatCard({ label, value, icon: Icon, tone = 'indigo', loading }) {
  const tones = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    amber: 'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    red: 'bg-red-500/10 text-red-400',
    blue: 'bg-blue-500/10 text-blue-400',
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-[#111318] p-5">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-white">{loading ? '-' : value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-400">{label}</p>
    </div>
  );
}

function StatusBarChart({ docs, title = 'Document Status Graph' }) {
  const statuses = ['uploaded', 'in_review', 'in_progress', 'changes_requested', 'approved', 'rejected'];
  const counts = statuses.map(status => ({ status, count: docs.filter(doc => doc.status === status).length }));
  const max = Math.max(1, ...counts.map(item => item.count));

  return (
    <div className="rounded-2xl border border-white/8 bg-[#111318] p-5">
      <h2 className="mb-4 text-sm font-semibold text-white">{title}</h2>
      <div className="space-y-3">
        {counts.map(({ status, count }) => (
          <div key={status}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">{STATUS_LABEL[status]}</span>
              <span className="font-semibold text-white">{count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(5, (count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskGraph({ aiStats }) {
  const values = [
    ['High', aiStats?.riskDistribution?.high ?? 0, 'bg-red-400'],
    ['Medium', aiStats?.riskDistribution?.medium ?? 0, 'bg-amber-400'],
    ['Low', aiStats?.riskDistribution?.low ?? 0, 'bg-emerald-400'],
  ];
  const total = Math.max(1, values.reduce((sum, [, value]) => sum + value, 0));

  return (
    <div className="rounded-2xl border border-white/8 bg-[#111318] p-5">
      <h2 className="mb-4 text-sm font-semibold text-white">Risk Graph</h2>
      <div className="flex h-36 items-end gap-4">
        {values.map(([label, value, color]) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-24 w-full items-end rounded-xl bg-white/5 p-1">
              <div className={`w-full rounded-lg ${color}`} style={{ height: `${Math.max(8, (value / total) * 100)}%` }} />
            </div>
            <p className="text-xs font-semibold text-white">{value}</p>
            <p className="text-[10px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentRow({ doc }) {
  const status = doc.status || 'uploaded';
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/15">
        <FileText className="h-4 w-4 text-indigo-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{doc.title || doc.fileName}</p>
        <p className="text-xs text-slate-500">
          {doc.category || 'document'} - {doc.department || 'General'}
          {doc.createdAt ? ` - ${new Date(doc.createdAt).toLocaleDateString()}` : ''}
        </p>
        {doc.metadata?.statusReason && (
          <p className="mt-0.5 truncate text-[11px] text-amber-300">Auditor note: {doc.metadata.statusReason}</p>
        )}
      </div>
      <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${STATUS_PILL[status] || STATUS_PILL.uploaded}`}>
        {STATUS_LABEL[status] || status}
      </span>
    </div>
  );
}

function OwnerDashboard({ user }) {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    documentAPI.getAll({ limit: 20 })
      .then((res) => {
        const list = res?.documents || res?.data || res || [];
        setDocs(Array.isArray(list) ? list : []);
      })
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const pending = docs.filter((d) => ['uploaded', 'in_review', 'in_progress', 'submitted'].includes(d.status)).length;
  const approved = docs.filter((d) => d.status === 'approved').length;
  const rejected = docs.filter((d) => d.status === 'rejected').length;

  return (
    <AppShell title="My Dashboard">
      <div className="mb-6 rounded-2xl border border-white/8 bg-[#111318] p-5">
        <h2 className="text-lg font-bold text-white">
          Welcome back, {user?.fullName?.split(' ')[0] || 'User'}
          <span className="ml-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-300">
            {roleLabel(user?.role)}
          </span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Your dashboard only shows documents, statuses, and reports that belong to your account.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Documents Uploaded" value={docs.length} icon={FileText} loading={loading} />
        <StatCard label="Pending Audit" value={pending} icon={Clock} tone="amber" loading={loading} />
        <StatCard label="Approved" value={approved} icon={CheckCircle2} tone="emerald" loading={loading} />
        <StatCard label="Rejected" value={rejected} icon={AlertTriangle} tone="red" loading={loading} />
      </div>

      <div className="mb-6">
        <StatusBarChart docs={docs} title="My Document Status Graph" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <button onClick={() => navigate('/documents')} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-[#111318] p-5 text-left transition-colors hover:bg-white/5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/20">
            <Upload className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Upload Document</p>
            <p className="text-xs text-slate-500">Submit a file for auditor review</p>
          </div>
        </button>
        <button onClick={() => navigate('/audit-reports')} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-[#111318] p-5 text-left transition-colors hover:bg-white/5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
            <BarChart2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">My Audit Reports</p>
            <p className="text-xs text-slate-500">Download reports generated from your documents</p>
          </div>
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#111318]">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">My Documents & Audit Status</h2>
          <button onClick={() => navigate('/documents')} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
            View all <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading your documents...</div>
        ) : docs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-700" />
            <p className="mb-3 text-sm text-slate-500">No documents uploaded yet.</p>
            <button onClick={() => navigate('/documents')} className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600">
              Upload Your First Document
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {docs.slice(0, 8).map((doc) => <DocumentRow key={doc.id} doc={doc} />)}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/8 bg-[#111318] p-4">
        <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-400" />
        <p className="text-xs text-slate-500">
          Audit completion emails are sent to <span className="font-semibold text-slate-300">{user?.email}</span>. Log in after the email to view document status, auditor notes, and available reports.
        </p>
      </div>
    </AppShell>
  );
}

function StaffDashboard({ user }) {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'administrator';

  useEffect(() => {
    const calls = [documentAPI.getAll({ limit: 8 }), dashboardAPI.getMetrics()];
    if (!isAdmin) calls.push(analysisAPI.getStats());

    Promise.allSettled(calls).then(([docsRes, metricsRes, aiRes]) => {
      if (docsRes.status === 'fulfilled') {
        const list = docsRes.value?.documents || docsRes.value?.data || docsRes.value || [];
        setDocs(Array.isArray(list) ? list : []);
      }
      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value);
      if (aiRes?.status === 'fulfilled') setAiStats(aiRes.value);
      setLoading(false);
    });
  }, [isAdmin]);

  const totalDocuments = metrics?.documentMetrics?.total ?? docs.length;
  const uploadedToday = metrics?.documentMetrics?.uploadedToday ?? 0;
  const passRate = metrics?.complianceMetrics?.passRate ?? 0;
  const completed = metrics?.taskMetrics?.completed ?? 0;
  const avgOverallAudit = aiStats?.averageOverallAuditScore ?? 0;

  const actions = isAdmin
    ? [
        { label: 'Manage Users', detail: 'Approve roles', icon: Users, path: '/users' },
        { label: 'Document Hub', detail: 'View all uploads', icon: FileText, path: '/documents' },
        { label: 'Audit Reports', detail: 'View system reports', icon: BarChart2, path: '/audit-reports' },
      ]
    : [
        { label: 'Run AI Audit', detail: 'Audit submitted docs', icon: Bot, path: '/ai-analysis' },
        { label: 'Update Status', detail: 'Notify owners', icon: CheckCircle2, path: '/documents' },
        { label: 'Audit Reports', detail: 'Generate reports', icon: BarChart2, path: '/audit-reports' },
      ];

  return (
    <AppShell title="Dashboard">
      <div className="mb-6 rounded-2xl border border-white/8 bg-[#111318] p-5">
        <h2 className="text-lg font-bold text-white">
          Welcome back, {user?.fullName?.split(' ')[0] || 'User'}
          <span className="ml-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-300">
            {roleLabel(user?.role)}
          </span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin
            ? 'Manage users, approvals, documents, and reports. Audit execution is reserved for auditors.'
            : 'Audit uploaded documents, update their progress, and notify document owners when reviews are complete.'}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard label="Total Documents" value={totalDocuments} icon={FileText} loading={loading} />
        <StatCard label="Uploaded Today" value={uploadedToday} icon={Upload} tone="blue" loading={loading} />
        <StatCard label="Avg Audit Health" value={loading ? '-' : `${avgOverallAudit}%`} icon={Bot} tone="indigo" loading={loading} />
        <StatCard label="Compliance Pass Rate" value={`${passRate}%`} icon={ShieldCheck} tone="emerald" loading={loading} />
        <StatCard label="Completed Tasks" value={completed} icon={CheckCircle2} tone="amber" loading={loading} />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <StatusBarChart docs={docs} />
        {!isAdmin && <RiskGraph aiStats={aiStats} />}
        {!isAdmin && (
          <div className="rounded-2xl border border-white/8 bg-[#111318] p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">AI Analysis Engine</h2>
            <div className="space-y-3">
              {[
                ['Analyzed', aiStats?.totalAnalyzed ?? 0, 'text-indigo-400'],
                ['Avg Health', `${aiStats?.averageOverallAuditScore ?? 0}%`, 'text-indigo-300'],
                ['High Risk', aiStats?.riskDistribution?.high ?? 0, 'text-red-400'],
                ['Medium Risk', aiStats?.riskDistribution?.medium ?? 0, 'text-amber-400'],
                ['Low Risk', aiStats?.riskDistribution?.low ?? 0, 'text-emerald-400'],
              ].map(([label, value, color]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`rounded-2xl border border-white/8 bg-[#111318] p-5 ${isAdmin ? 'lg:col-span-1' : ''}`}>
          <h2 className="mb-4 text-sm font-semibold text-white">Quick Actions</h2>
          <div className="grid gap-2.5">
            {actions.map(({ label, detail, icon: Icon, path }) => (
              <button key={label} onClick={() => navigate(path)} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-3 text-left transition-colors hover:bg-white/5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{label}</p>
                  <p className="text-[10px] text-slate-500">{detail}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#111318] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Document Status</h2>
          <div className="space-y-2.5">
            {['in_review', 'in_progress', 'approved', 'rejected'].map((status) => (
              <div key={status} className="flex items-center gap-3">
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500" />
                <span className="flex-1 text-xs text-slate-500">{STATUS_LABEL[status]}</span>
                <span className="text-sm font-bold text-white">{docs.filter((d) => d.status === status).length}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#111318]">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Recent Documents</h2>
          <button onClick={() => navigate('/documents')} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
            View all <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
        ) : docs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No documents yet.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {docs.map((doc) => <DocumentRow key={doc.id} doc={doc} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const role = user?.role || 'viewer';

  if (role === 'viewer' || role === 'document_manager') {
    return <OwnerDashboard user={user} />;
  }

  return <StaffDashboard user={user} />;
}
