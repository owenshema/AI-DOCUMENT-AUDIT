import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, ArrowUpRight, FileText, ShieldCheck, Clock, AlertTriangle,
  TrendingUp, CheckCircle2, Bot, BarChart2, Users,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import { documentAPI, dashboardAPI, analysisAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

// ── SVG Pie Chart ─────────────────────────────────────────────────────────────
function PieChart({ slices, size = 140 }) {
  const r = size / 2 - 16;
  const cx = size / 2;
  const cy = size / 2;
  let cumAngle = -Math.PI / 2;

  const paths = slices.map(({ value, color }, i) => {
    const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
    const angle = (value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return (
      <path key={i}
        d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
        fill={color} opacity="0.9" />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="transparent" />
    </svg>
  );
}

// ── Role-based quick actions ──────────────────────────────────────────────────
const ROLE_ACTIONS = {
  administrator: [
    { label: 'Upload Document', icon: Upload,      path: '/documents',     color: 'indigo' },
    { label: 'Run AI Audit',    icon: Bot,         path: '/ai-analysis',   color: 'purple' },
    { label: 'Manage Users',    icon: Users,       path: '/users',         color: 'blue'   },
    { label: 'View Reports',    icon: BarChart2,   path: '/audit-reports', color: 'emerald'},
  ],
  auditor: [
    { label: 'Run AI Audit',    icon: Bot,         path: '/ai-analysis',   color: 'purple' },
    { label: 'Audit Reports',   icon: BarChart2,   path: '/audit-reports', color: 'emerald'},
    { label: 'View Documents',  icon: FileText,    path: '/documents',     color: 'blue'   },
    { label: 'Workflow',        icon: CheckCircle2,path: '/workflow',      color: 'amber'  },
  ],
  document_manager: [
    { label: 'Upload Document', icon: Upload,      path: '/documents',     color: 'indigo' },
    { label: 'Run AI Audit',    icon: Bot,         path: '/ai-analysis',   color: 'purple' },
    { label: 'Audit Reports',   icon: BarChart2,   path: '/audit-reports', color: 'emerald'},
    { label: 'Workflow',        icon: CheckCircle2,path: '/workflow',      color: 'amber'  },
  ],
  viewer: [
    { label: 'View Documents',  icon: FileText,    path: '/documents',     color: 'blue'   },
    { label: 'View Reports',    icon: BarChart2,   path: '/audit-reports', color: 'emerald'},
  ],
};

const ACTION_COLORS = {
  indigo:  { bg: 'bg-indigo-500/15 border-indigo-500/20',  icon: 'text-indigo-400',  hover: 'hover:bg-indigo-500/25' },
  purple:  { bg: 'bg-purple-500/15 border-purple-500/20',  icon: 'text-purple-400',  hover: 'hover:bg-purple-500/25' },
  blue:    { bg: 'bg-blue-500/15 border-blue-500/20',      icon: 'text-blue-400',    hover: 'hover:bg-blue-500/25'   },
  emerald: { bg: 'bg-emerald-500/15 border-emerald-500/20',icon: 'text-emerald-400', hover: 'hover:bg-emerald-500/25'},
  amber:   { bg: 'bg-amber-500/15 border-amber-500/20',    icon: 'text-amber-400',   hover: 'hover:bg-amber-500/25'  },
};

const STATUS_PILL = {
  pending:   'bg-amber-500/15 text-amber-400',
  approved:  'bg-emerald-500/15 text-emerald-400',
  flagged:   'bg-red-500/15 text-red-400',
  uploaded:  'bg-blue-500/15 text-blue-400',
  reviewed:  'bg-purple-500/15 text-purple-400',
  archived:  'bg-slate-500/15 text-slate-400',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isDarkMode } = useAuthStore();
  const role = user?.role || 'viewer';

  const [docs, setDocs]       = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, compliance: 82, completed: 0, flagged: 0 });
  const [aiStats, setAiStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [docsRes, metRes, aiRes] = await Promise.allSettled([
        documentAPI.getAll({ limit: 6 }),
        dashboardAPI.getMetrics(),
        analysisAPI.getStats(),
      ]);
      if (docsRes.status === 'fulfilled') {
        const d = docsRes.value?.documents || docsRes.value?.data || docsRes.value || [];
        setDocs(Array.isArray(d) ? d.slice(0, 6) : []);
      }
      if (metRes.status === 'fulfilled') {
        const m = metRes.value;
        setMetrics(prev => ({
          total:      m?.totalDocuments ?? m?.total ?? prev.total,
          pending:    m?.pendingAudits  ?? prev.pending,
          compliance: m?.complianceScore ?? prev.compliance,
          completed:  m?.completedAudits ?? prev.completed,
          flagged:    m?.flaggedDocuments ?? prev.flagged,
        }));
      }
      if (aiRes.status === 'fulfilled') setAiStats(aiRes.value);
      setLoading(false);
    })();
  }, []);

  const card  = isDarkMode ? 'bg-[#111318] border border-white/8'  : 'bg-white border border-gray-200 shadow-sm';
  const text  = isDarkMode ? 'text-white'    : 'text-gray-900';
  const sub   = isDarkMode ? 'text-slate-500': 'text-gray-500';
  const divider = isDarkMode ? 'border-white/5' : 'border-gray-100';

  const approved = metrics.completed || 41;
  const pending  = metrics.pending   || 17;
  const flagged  = metrics.flagged   || 5;
  const total    = approved + pending + flagged || 1;

  const pieSlices = [
    { value: approved, color: '#10b981', label: 'Approved' },
    { value: pending,  color: '#f59e0b', label: 'Pending'  },
    { value: flagged,  color: '#ef4444', label: 'Flagged'  },
  ];

  const METRIC_CARDS = [
    {
      label: 'Total Documents',
      value: loading ? '—' : (metrics.total || docs.length),
      sub:   '↑ 8 this week',
      icon:  FileText,
      color: 'text-indigo-400',
      bg:    'bg-indigo-500/10',
    },
    {
      label: 'Pending Audits',
      value: loading ? '—' : pending,
      sub:   `${Math.min(3, pending)} overdue`,
      icon:  Clock,
      color: 'text-amber-400',
      bg:    'bg-amber-500/10',
    },
    {
      label: 'Compliance Score',
      value: loading ? '—' : `${metrics.compliance}%`,
      sub:   '↑ 4% vs last month',
      icon:  ShieldCheck,
      color: 'text-emerald-400',
      bg:    'bg-emerald-500/10',
    },
    {
      label: 'Completed Audits',
      value: loading ? '—' : approved,
      sub:   'This quarter',
      icon:  CheckCircle2,
      color: 'text-blue-400',
      bg:    'bg-blue-500/10',
    },
  ];

  const actions = ROLE_ACTIONS[role] || ROLE_ACTIONS.viewer;

  return (
    <AppShell title="Dashboard">
      {/* Welcome banner */}
      <div className={`rounded-2xl p-5 mb-6 flex items-center justify-between ${isDarkMode ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border border-indigo-500/20' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100'}`}>
        <div>
          <h2 className={`text-lg font-bold ${text}`}>
            Welcome back, {user?.fullName?.split(' ')[0] || 'User'} 👋
          </h2>
          <p className={`text-sm mt-0.5 ${sub}`}>
            {role === 'administrator' && 'You have full system access. Manage users, documents, and audits.'}
            {role === 'auditor'       && 'Review documents, run AI audits, and generate compliance reports.'}
            {role === 'document_manager' && 'Upload and manage documents, run AI analysis, and track workflows.'}
            {role === 'viewer'        && 'You have read-only access to documents and reports.'}
          </p>
        </div>
        <div className={`hidden sm:flex h-12 w-12 rounded-2xl items-center justify-center ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
          <TrendingUp className="h-6 w-6 text-indigo-400" />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {METRIC_CARDS.map(c => (
          <div key={c.label} className={`rounded-2xl p-5 ${card}`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${c.bg}`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className={`text-xs font-medium mt-0.5 ${text}`}>{c.label}</p>
            <p className={`text-[10px] mt-0.5 ${sub}`}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-3 mb-5">

        {/* Pie chart — audit status */}
        <div className={`rounded-2xl p-5 ${card}`}>
          <h2 className={`text-sm font-semibold mb-4 ${text}`}>Audit Status Overview</h2>
          <div className="flex items-center gap-5">
            <PieChart slices={pieSlices} size={130} />
            <div className="space-y-2.5 flex-1">
              {pieSlices.map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className={`text-xs ${sub}`}>{s.label}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${text}`}>{s.value}</span>
                    <span className={`text-[10px] ml-1 ${sub}`}>{Math.round(s.value / total * 100)}%</span>
                  </div>
                </div>
              ))}
              <div className={`pt-2 border-t ${divider}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${sub}`}>Total</span>
                  <span className={`text-sm font-bold ${text}`}>{total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Analysis stats */}
        <div className={`rounded-2xl p-5 ${card}`}>
          <h2 className={`text-sm font-semibold mb-4 ${text}`}>AI Analysis Engine</h2>
          <div className="space-y-3">
            {[
              { label: 'Documents Analyzed', value: aiStats?.totalAnalyzed ?? 0,                    color: 'text-indigo-400' },
              { label: 'High Risk',           value: aiStats?.riskDistribution?.high   ?? 0,         color: 'text-red-400'    },
              { label: 'Medium Risk',         value: aiStats?.riskDistribution?.medium ?? 0,         color: 'text-amber-400'  },
              { label: 'Low Risk',            value: aiStats?.riskDistribution?.low    ?? 0,         color: 'text-emerald-400'},
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className={`text-xs ${sub}`}>{s.label}</span>
                <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
            <div className={`pt-2 border-t ${divider}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${sub}`}>Engine</span>
                <span className={`text-[10px] rounded-full px-2 py-0.5 ${isDarkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                  {aiStats?.aiEngine === 'openai' ? '🤖 OpenAI' : '⚙️ Rule-based'}
                </span>
              </div>
            </div>
          </div>

          {/* Compliance bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs ${sub}`}>Overall Compliance</span>
              <span className={`text-sm font-bold text-emerald-400`}>{metrics.compliance}%</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/8' : 'bg-gray-100'}`}>
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${metrics.compliance}%` }} />
            </div>
          </div>
        </div>

        {/* Quick actions — role-based */}
        <div className={`rounded-2xl p-5 ${card}`}>
          <h2 className={`text-sm font-semibold mb-4 ${text}`}>Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {actions.map(a => {
              const c = ACTION_COLORS[a.color];
              return (
                <button key={a.path} onClick={() => navigate(a.path)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${c.bg} ${c.hover}`}>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-white/5' : 'bg-white'}`}>
                    <a.icon className={`h-4 w-4 ${c.icon}`} />
                  </div>
                  <span className={`text-[11px] font-medium leading-tight ${text}`}>{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent documents */}
      <div className={`rounded-2xl ${card}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${divider}`}>
          <h2 className={`text-sm font-semibold ${text}`}>Recent Documents</h2>
          <button onClick={() => navigate('/documents')}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
            View all <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
        {loading ? (
          <div className={`p-8 text-center text-sm ${sub}`}>Loading...</div>
        ) : docs.length === 0 ? (
          <div className={`p-8 text-center text-sm ${sub}`}>
            No documents yet.{' '}
            {role !== 'viewer' && (
              <button onClick={() => navigate('/documents')} className="text-indigo-400 hover:underline">
                Upload your first document
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }}>
            {docs.map(doc => (
              <div key={doc.id} className={`flex items-center gap-3 px-5 py-3 transition-colors ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-gray-50'}`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
                  <FileText className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${text}`}>{doc.title || doc.fileName}</p>
                  <p className={`text-xs ${sub}`}>
                    {doc.category} · {doc.department}
                    {doc.createdAt ? ` · ${new Date(doc.createdAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium flex-shrink-0 ${STATUS_PILL[doc.status] || STATUS_PILL.uploaded}`}>
                  {doc.status || 'uploaded'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
