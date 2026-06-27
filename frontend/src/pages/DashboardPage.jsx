import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, BarChart2, Bell, Bot, CheckCircle2,
  Clock, FileText, ShieldCheck, Upload, Users, Activity,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import PieChart from '../components/PieChart';
import { analysisAPI, dashboardAPI, documentAPI } from '../api/auth';
import useAuthStore from '../store/authStore';
import { formatRoleLabel, normalizeRole, isOwnerRole } from '../config/roles';

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

const STATUS_COLORS = {
  uploaded: '#64748b',
  in_review: '#f59e0b',
  in_progress: '#3b82f6',
  submitted: '#6366f1',
  reviewed: '#a855f7',
  approved: '#10b981',
  rejected: '#ef4444',
  changes_requested: '#f97316',
};

const STATUS_ORDER = ['uploaded', 'in_review', 'in_progress', 'changes_requested', 'approved', 'rejected'];

function useDashboardStyles() {
  const { isDarkMode } = useAuthStore();
  const card = isDarkMode
    ? 'rounded-2xl border border-white/8 bg-[#111318]'
    : 'rounded-2xl border border-gray-200 bg-white shadow-sm';
  const section = isDarkMode
    ? 'overflow-hidden rounded-2xl border border-white/8 bg-[#111318]'
    : 'overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm';
  return {
    isDarkMode,
    card,
    section,
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    sub: isDarkMode ? 'text-slate-500' : 'text-gray-500',
    label: isDarkMode ? 'text-slate-400' : 'text-gray-600',
    divider: isDarkMode ? 'divide-white/5' : 'divide-gray-100',
    headerBorder: isDarkMode ? 'border-white/8' : 'border-gray-200',
    barTrack: isDarkMode ? 'bg-white/10' : 'bg-gray-100',
    riskTrack: isDarkMode ? 'bg-white/10' : 'bg-gray-100',
    pill: isDarkMode
      ? 'rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-300'
      : 'rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-indigo-700',
    iconWrap: isDarkMode ? 'bg-white/5' : 'bg-gray-100',
    docIcon: isDarkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-100 text-indigo-600',
    quickAction: isDarkMode
      ? 'rounded-xl border border-white/8 bg-white/5 hover:bg-white/8'
      : 'rounded-xl border border-gray-200 bg-gray-50 hover:bg-white',
    quickActionIcon: isDarkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-100 text-indigo-600',
    link: isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500',
    aiColors: {
      indigo: isDarkMode ? 'text-indigo-400' : 'text-indigo-600',
      red: isDarkMode ? 'text-red-400' : 'text-red-600',
      amber: isDarkMode ? 'text-amber-400' : 'text-amber-600',
      emerald: isDarkMode ? 'text-emerald-400' : 'text-emerald-600',
    },
    statusPill: (status) => {
      const dark = {
        uploaded: 'bg-slate-500/15 text-slate-400',
        in_review: 'bg-amber-500/15 text-amber-400',
        in_progress: 'bg-blue-500/15 text-blue-400',
        submitted: 'bg-indigo-500/15 text-indigo-400',
        reviewed: 'bg-purple-500/15 text-purple-400',
        approved: 'bg-emerald-500/15 text-emerald-400',
        rejected: 'bg-red-500/15 text-red-400',
        changes_requested: 'bg-orange-500/15 text-orange-400',
      };
      const light = {
        uploaded: 'bg-slate-100 text-slate-600',
        in_review: 'bg-amber-100 text-amber-700',
        in_progress: 'bg-blue-100 text-blue-700',
        submitted: 'bg-indigo-100 text-indigo-700',
        reviewed: 'bg-purple-100 text-purple-700',
        approved: 'bg-emerald-100 text-emerald-700',
        rejected: 'bg-red-100 text-red-700',
        changes_requested: 'bg-orange-100 text-orange-700',
      };
      const map = isDarkMode ? dark : light;
      return map[status] || map.uploaded;
    },
  };
}

function roleLabel(role) {
  return formatRoleLabel(role);
}

function StatCard({ label, value, icon: Icon, tone = 'indigo', loading }) {
  const s = useDashboardStyles();
  const iconBg = {
    indigo: 'bg-indigo-600',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-600',
    red: 'bg-red-500',
    blue: 'bg-blue-600',
  };

  return (
    <div className={`${s.card} p-5`}>
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${iconBg[tone]}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className={`text-2xl font-bold ${s.text}`}>{loading ? '-' : value}</p>
      <p className={`mt-0.5 text-xs font-medium ${s.sub}`}>{label}</p>
    </div>
  );
}

function StatusPieChart({ docs, statusCounts, title = 'Document Status' }) {
  const s = useDashboardStyles();
  const chartData = STATUS_ORDER.map((status) => ({
    label: STATUS_LABEL[status],
    value: statusCounts?.[status] ?? docs.filter((doc) => doc.status === status).length,
    color: STATUS_COLORS[status],
  }));

  return (
    <div className={`${s.card} p-5`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className={`text-sm font-semibold ${s.text}`}>{title}</h2>
        <span className={`text-[10px] font-medium uppercase tracking-wider ${s.isDarkMode ? 'text-indigo-400/70' : 'text-indigo-500'}`}>
          Rotating live
        </span>
      </div>
      <PieChart
        data={chartData}
        size={240}
        rotating
        isDarkMode={s.isDarkMode}
      />
    </div>
  );
}

function RiskGraph({ aiStats }) {
  const s = useDashboardStyles();
  const values = [
    ['High', aiStats?.riskDistribution?.high ?? 0, 'bg-red-400'],
    ['Medium', aiStats?.riskDistribution?.medium ?? 0, 'bg-amber-400'],
    ['Low', aiStats?.riskDistribution?.low ?? 0, 'bg-emerald-400'],
  ];
  const total = Math.max(1, values.reduce((sum, [, value]) => sum + value, 0));

  return (
    <div className={`${s.card} p-5`}>
      <h2 className={`mb-4 text-sm font-semibold ${s.text}`}>Risk Graph</h2>
      <div className="flex h-36 items-end gap-4">
        {values.map(([label, value, color]) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-2">
            <div className={`flex h-24 w-full items-end rounded-xl p-1 ${s.riskTrack}`}>
              <div className={`w-full rounded-lg ${color}`} style={{ height: `${Math.max(8, (value / total) * 100)}%` }} />
            </div>
            <p className={`text-xs font-semibold ${s.text}`}>{value}</p>
            <p className={`text-[10px] ${s.sub}`}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentRow({ doc }) {
  const s = useDashboardStyles();
  const status = doc.status || 'uploaded';
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${s.docIcon}`}>
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${s.text}`}>{doc.title || doc.fileName}</p>
        <p className={`text-xs ${s.sub}`}>
          {doc.category || 'document'}
          {doc.createdAt ? ` - ${new Date(doc.createdAt).toLocaleDateString()}` : ''}
        </p>
        {doc.metadata?.statusReason && (
          <p className={`mt-0.5 truncate text-[11px] ${s.isDarkMode ? 'text-amber-300' : 'text-amber-600'}`}>
            Auditor note: {doc.metadata.statusReason}
          </p>
        )}
      </div>
      <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${s.statusPill(status)}`}>
        {STATUS_LABEL[status] || status}
      </span>
    </div>
  );
}

function OwnerDashboard({ user }) {
  const navigate = useNavigate();
  const s = useDashboardStyles();
  const [docs, setDocs] = useState([]);
  const [activity, setActivity] = useState({ timeline: [], summary: {} });
  const [overview, setOverview] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      documentAPI.getAll({ limit: 20 }),
      dashboardAPI.getOverview(),
      dashboardAPI.getActivity({ days: 14 }),
      dashboardAPI.getMetrics(),
    ]).then(([docsRes, overviewRes, activityRes, metricsRes]) => {
      if (docsRes.status === 'fulfilled') {
        const list = docsRes.value?.documents || docsRes.value?.data || docsRes.value || [];
        setDocs(Array.isArray(list) ? list : []);
      }
      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      if (activityRes.status === 'fulfilled') setActivity(activityRes.value || { timeline: [], summary: {} });
      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value);
    }).finally(() => setLoading(false));
  }, []);

  const statusCounts = metrics?.documentMetrics?.statusBreakdown;
  const totalDocs = metrics?.documentMetrics?.total ?? 0;
  const pending = metrics?.documentMetrics?.needsAudit ?? metrics?.taskMetrics?.pending ?? 0;
  const completedAudits = metrics?.documentMetrics?.audited ?? metrics?.taskMetrics?.completed ?? 0;
  const rejected = statusCounts?.rejected ?? 0;
  const complianceScore = metrics?.aiMetrics?.averageOverallAuditScore
    ?? overview?.summary?.complianceScore
    ?? overview?.metrics?.complianceScore
    ?? metrics?.complianceMetrics?.passRate
    ?? 0;
  const recentActivity = activity.timeline?.slice(0, 8) || [];

  return (
    <AppShell title="My Dashboard">
      <div className={`mb-6 ${s.card} p-5`}>
        <h2 className={`text-lg font-bold ${s.text}`}>
          Welcome back, {user?.fullName?.split(' ')[0] || 'User'}
          <span className={`ml-2 ${s.pill}`}>{roleLabel(user?.role)}</span>
        </h2>
        <p className={`mt-1 text-sm ${s.sub}`}>
          Your dashboard only shows documents, statuses, and reports that belong to your account.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard label="My Documents" value={totalDocs} icon={FileText} loading={loading} />
        <StatCard label="Pending Audit" value={pending} icon={Clock} tone="amber" loading={loading} />
        <StatCard label="Audited" value={completedAudits} icon={CheckCircle2} tone="emerald" loading={loading} />
        <StatCard label="Rejected" value={rejected} icon={AlertTriangle} tone="red" loading={loading} />
        <StatCard label="Compliance Score" value={`${complianceScore}%`} icon={ShieldCheck} tone="blue" loading={loading} />
      </div>

      <div className="mb-6 flex justify-center">
        <div className="w-full max-w-md">
          <StatusPieChart docs={docs} statusCounts={statusCounts} title="My Document Status" />
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <button onClick={() => navigate('/documents')} className={`flex items-center gap-4 ${s.card} p-5 text-left`}>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <Upload className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${s.text}`}>Upload Document</p>
            <p className={`text-xs ${s.sub}`}>Submit a file for auditor review</p>
          </div>
        </button>
        <button onClick={() => navigate('/audit-reports')} className={`flex items-center gap-4 ${s.card} p-5 text-left`}>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
            <BarChart2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${s.text}`}>My Audit Reports</p>
            <p className={`text-xs ${s.sub}`}>Download reports generated from your documents</p>
          </div>
        </button>
      </div>

      <div className={`mb-6 ${s.section}`}>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className={`text-sm font-semibold ${s.text}`}>My Recent Activity</h2>
          <span className={`text-[10px] ${s.sub}`}>Last 14 days</span>
        </div>
        {loading ? (
          <div className={`p-8 text-center text-sm ${s.sub}`}>Loading your activity...</div>
        ) : recentActivity.length === 0 ? (
          <div className={`p-8 text-center text-sm ${s.sub}`}>No activity yet. Upload a document to get started.</div>
        ) : (
          <div className={`divide-y ${s.divider}`}>
            {recentActivity.map((item, index) => (
              <div key={`${item.time}-${index}`} className="flex items-start gap-3 px-5 py-3.5">
                <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${s.iconWrap}`}>
                  {item.type === 'upload' ? <Upload className="h-3.5 w-3.5 text-indigo-400" />
                    : item.type === 'analysis' ? <Bot className="h-3.5 w-3.5 text-emerald-400" />
                    : item.type === 'report' ? <BarChart2 className="h-3.5 w-3.5 text-amber-400" />
                    : <Activity className="h-3.5 w-3.5 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${s.text}`}>{item.detail || item.action}</p>
                  <p className={`mt-0.5 text-[11px] ${s.sub}`}>
                    {item.time ? new Date(item.time).toLocaleString() : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={s.section}>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className={`text-sm font-semibold ${s.text}`}>My Documents & Audit Status</h2>
          <button onClick={() => navigate('/documents')} className={`flex items-center gap-1 text-xs ${s.link}`}>
            View all <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
        {loading ? (
          <div className={`p-8 text-center text-sm ${s.sub}`}>Loading your documents...</div>
        ) : docs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className={`mx-auto mb-3 h-10 w-10 ${s.isDarkMode ? 'text-slate-700' : 'text-gray-300'}`} />
            <p className={`mb-3 text-sm ${s.sub}`}>No documents uploaded yet.</p>
            <button onClick={() => navigate('/documents')} className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600">
              Upload Your First Document
            </button>
          </div>
        ) : (
          <div className={`divide-y ${s.divider}`}>
            {docs.slice(0, 8).map((doc) => <DocumentRow key={doc.id} doc={doc} />)}
          </div>
        )}
      </div>

      <div className={`mt-4 flex items-start gap-3 ${s.card} p-4`}>
        <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-400" />
        <p className={`text-xs ${s.sub}`}>
          Audit completion emails are sent to <span className={`font-semibold ${s.isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{user?.email}</span>. Log in after the email to view document status, auditor notes, and available reports.
        </p>
      </div>
    </AppShell>
  );
}

function StaffDashboard({ user }) {
  const navigate = useNavigate();
  const s = useDashboardStyles();
  const [docs, setDocs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const role = normalizeRole(user?.role);
  const isAdmin = role === 'administrator';
  const isAuditor = role === 'auditor';
  const isDocManager = role === 'document_manager';

  useEffect(() => {
    Promise.allSettled([
      documentAPI.getAll({ limit: 8 }),
      dashboardAPI.getMetrics(),
      analysisAPI.getStats(),
    ]).then(([docsRes, metricsRes, aiRes]) => {
      if (docsRes.status === 'fulfilled') {
        const list = docsRes.value?.documents || docsRes.value?.data || docsRes.value || [];
        setDocs(Array.isArray(list) ? list : []);
      }
      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value);
      if (aiRes?.status === 'fulfilled') setAiStats(aiRes.value);
      setLoading(false);
    });
  }, []);

  const totalDocuments = metrics?.documentMetrics?.total ?? 0;
  const needsAudit = metrics?.documentMetrics?.needsAudit ?? metrics?.taskMetrics?.pending ?? 0;
  const statusCounts = metrics?.documentMetrics?.statusBreakdown;
  const passRate = metrics?.complianceMetrics?.passRate ?? 0;
  const completedAudits = metrics?.taskMetrics?.completed ?? metrics?.documentMetrics?.audited ?? 0;
  const avgOverallAudit = aiStats?.averageOverallAuditScore
    ?? metrics?.aiMetrics?.averageOverallAuditScore
    ?? 0;
  const aiPanelStats = {
    totalAnalyzed: aiStats?.totalAnalyzed ?? metrics?.aiMetrics?.totalAnalyzed ?? 0,
    averageOverallAuditScore: avgOverallAudit,
    riskDistribution: aiStats?.riskDistribution ?? metrics?.aiMetrics?.riskDistribution ?? { high: 0, medium: 0, low: 0 },
  };

  const completedLabel = isAuditor ? 'Audits Completed' : 'Completed Audits';

  const actions = isAdmin
    ? [
        { label: 'Manage Users', detail: 'Approve roles', icon: Users, path: '/users' },
        { label: 'Document Hub', detail: 'View all uploads', icon: FileText, path: '/documents' },
        { label: 'Audit Reports', detail: 'View system reports', icon: BarChart2, path: '/audit-reports' },
      ]
    : isDocManager
    ? [
        { label: 'Document Management', detail: 'Track audit status', icon: FileText, path: '/document-management' },
        { label: 'Document Hub', detail: 'View all uploads', icon: Upload, path: '/documents' },
        { label: 'Audit Reports', detail: 'View system reports', icon: BarChart2, path: '/audit-reports' },
      ]
    : [
        { label: 'Run AI Audit', detail: 'Audit submitted docs', icon: Bot, path: '/ai-analysis' },
        { label: 'Update Status', detail: 'Notify owners', icon: CheckCircle2, path: '/documents' },
        { label: 'Audit Reports', detail: 'Generate reports', icon: BarChart2, path: '/audit-reports' },
      ];

  const welcomeCopy = isAdmin
    ? 'Organization-wide document counts, completed audits, and AI health across the full system.'
    : isDocManager
    ? 'View all uploaded documents, track which still need audit, and monitor completed audits system-wide.'
    : 'Audit uploaded documents, update their progress, and notify document owners when reviews are complete.';

  return (
    <AppShell title="Dashboard">
      <div className={`mb-6 ${s.card} p-5`}>
        <h2 className={`text-lg font-bold ${s.text}`}>
          Welcome back, {user?.fullName?.split(' ')[0] || 'User'}
          <span className={`ml-2 ${s.pill}`}>{roleLabel(user?.role)}</span>
        </h2>
        <p className={`mt-1 text-sm ${s.sub}`}>{welcomeCopy}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard label="Total Documents" value={totalDocuments} icon={FileText} loading={loading} />
        <StatCard label="Needs Audit" value={needsAudit} icon={Clock} tone="amber" loading={loading} />
        <StatCard label={completedLabel} value={completedAudits} icon={CheckCircle2} tone="emerald" loading={loading} />
        <StatCard label="Avg Audit Health" value={loading ? '-' : `${avgOverallAudit}%`} icon={Bot} tone="indigo" loading={loading} />
        <StatCard label="Compliance Pass Rate" value={`${passRate}%`} icon={ShieldCheck} tone="blue" loading={loading} />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <StatusPieChart docs={docs} statusCounts={statusCounts} />
        <RiskGraph aiStats={aiPanelStats} />
        <div className={`${s.card} p-5`}>
          <h2 className={`mb-4 text-sm font-semibold ${s.text}`}>AI Analysis Engine</h2>
          <div className="space-y-3">
            {[
              ['Analyzed', aiPanelStats.totalAnalyzed, s.aiColors.indigo],
              ['Avg Health', `${aiPanelStats.averageOverallAuditScore}%`, s.aiColors.indigo],
              ['High Risk', aiPanelStats.riskDistribution?.high ?? 0, s.aiColors.red],
              ['Medium Risk', aiPanelStats.riskDistribution?.medium ?? 0, s.aiColors.amber],
              ['Low Risk', aiPanelStats.riskDistribution?.low ?? 0, s.aiColors.emerald],
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center justify-between">
                <span className={`text-xs ${s.sub}`}>{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${s.card} p-5 lg:col-span-1`}>
          <h2 className={`mb-4 text-sm font-semibold ${s.text}`}>Quick Actions</h2>
          <div className="grid gap-2.5">
            {actions.map(({ label, detail, icon: Icon, path }) => (
              <button key={label} onClick={() => navigate(path)} className={`flex items-center gap-3 p-3 text-left transition-colors ${s.quickAction}`}>
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${s.quickActionIcon}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className={`text-xs font-semibold ${s.text}`}>{label}</p>
                  <p className={`text-[10px] ${s.sub}`}>{detail}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={`${s.card} p-5`}>
          <h2 className={`mb-4 text-sm font-semibold ${s.text}`}>Audit Progress</h2>
          <div className="space-y-2.5">
            {[
              ['Needs audit', needsAudit],
              ['Completed audits', completedAudits],
              ['Total documents', totalDocuments],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-3">
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500" />
                <span className={`flex-1 text-xs ${s.sub}`}>{label}</span>
                <span className={`text-sm font-bold ${s.text}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={s.section}>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className={`text-sm font-semibold ${s.text}`}>Recent Documents</h2>
          <button onClick={() => navigate('/documents')} className={`flex items-center gap-1 text-xs ${s.link}`}>
            View all <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
        {loading ? (
          <div className={`p-8 text-center text-sm ${s.sub}`}>Loading...</div>
        ) : docs.length === 0 ? (
          <div className={`p-8 text-center text-sm ${s.sub}`}>No documents yet.</div>
        ) : (
          <div className={`divide-y ${s.divider}`}>
            {docs.map((doc) => <DocumentRow key={doc.id} doc={doc} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const role = normalizeRole(user?.role);

  if (isOwnerRole(role)) {
    return <OwnerDashboard user={user} />;
  }

  return <StaffDashboard user={user} />;
}
