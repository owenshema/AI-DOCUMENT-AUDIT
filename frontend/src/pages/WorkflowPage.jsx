import React, { useState } from 'react';
import { GitBranch, CheckCircle2, AlertTriangle, ChevronRight, MessageSquare, Send } from 'lucide-react';
import AppShell from '../components/AppShell';
import useAuthStore from '../store/authStore';

const INITIAL_TASKS = [
  { id: 1, title: 'Q3 Financial Report',  assignee: 'Lead Auditor',    due: '2026-05-25', status: 'in_review', priority: 'high',   comments: ['Flagged for missing signature — please review section 4.'] },
  { id: 2, title: 'Vendor Contract v2',   assignee: 'Sarah Johnson',   due: '2026-05-22', status: 'approved',  priority: 'medium', comments: ['Approved after revision.'] },
  { id: 3, title: 'HR Policy Update',     assignee: 'Doc Manager',     due: '2026-05-28', status: 'pending',   priority: 'low',    comments: [] },
  { id: 4, title: 'IT Security Policy',   assignee: 'Lead Auditor',    due: '2026-06-01', status: 'flagged',   priority: 'high',   comments: ['PII detected in section 2. Escalate to Admin.'] },
  { id: 5, title: 'Finance Audit Pack',   assignee: 'Sarah Johnson',   due: '2026-05-30', status: 'pending',   priority: 'medium', comments: [] },
];

const STATUSES = ['pending', 'in_review', 'flagged', 'approved'];

const STATUS_STYLE = {
  pending:   { pill: 'bg-slate-500/15 text-slate-400',   label: 'Pending'    },
  in_review: { pill: 'bg-blue-500/15 text-blue-400',     label: 'In Review'  },
  flagged:   { pill: 'bg-red-500/15 text-red-400',       label: 'Flagged'    },
  approved:  { pill: 'bg-emerald-500/15 text-emerald-400', label: 'Approved' },
};

const PRIORITY_STYLE = {
  high:   'bg-red-500/15 text-red-400',
  medium: 'bg-amber-500/15 text-amber-400',
  low:    'bg-slate-500/15 text-slate-400',
};

const PIPELINE = ['pending', 'in_review', 'flagged', 'approved'];

export default function WorkflowPage() {
  const { isDarkMode } = useAuthStore();
  const card    = isDarkMode ? 'bg-[#111318] border-white/8'   : 'bg-white border-gray-200 shadow-sm';
  const text    = isDarkMode ? 'text-white'    : 'text-gray-900';
  const sub     = isDarkMode ? 'text-slate-500': 'text-gray-500';
  const divider = isDarkMode ? 'divide-white/5': 'divide-gray-100';
  const [tasks, setTasks]       = useState(INITIAL_TASKS);
  const [selected, setSelected] = useState(null);
  const [comment, setComment]   = useState('');
  const [msg, setMsg]           = useState('');

  const advance = (id) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const idx = PIPELINE.indexOf(t.status);
      const next = PIPELINE[Math.min(idx + 1, PIPELINE.length - 1)];
      return { ...t, status: next };
    }));
    setMsg('Status updated');
    setTimeout(() => setMsg(''), 2000);
  };

  const addComment = (id) => {
    if (!comment.trim()) return;
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, comments: [...t.comments, comment.trim()] } : t
    ));
    setComment('');
  };

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: tasks.filter(t => t.status === s).length }), {});

  return (
    <AppShell title="Workflow">
      {/* Pipeline summary */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {STATUSES.map(s => (
          <div key={s} className={`rounded-2xl border p-4 text-center ${card}`}>
            <p className={`text-2xl font-bold ${s === 'approved' ? 'text-emerald-400' : s === 'flagged' ? 'text-red-400' : s === 'in_review' ? 'text-blue-400' : 'text-slate-400'}`}>
              {counts[s]}
            </p>
            <p className={`text-xs mt-1 capitalize ${sub}`}>{s.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      {msg && (
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-400">
          {msg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Task list */}
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
            <h2 className={`text-sm font-semibold ${text}`}>Tasks ({tasks.length})</h2>
          </div>
          <div className={`divide-y ${divider}`}>
            {tasks.map(task => (
              <div key={task.id}
                onClick={() => setSelected(selected?.id === task.id ? null : task)}
                className={`px-5 py-3.5 cursor-pointer transition-colors ${selected?.id === task.id ? 'bg-indigo-500/5 border-l-2 border-indigo-500' : isDarkMode ? 'hover:bg-white/2' : 'hover:bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${text}`}>{task.title}</p>
                    <p className={`text-xs mt-0.5 ${sub}`}>
                      {task.assignee} · Due {task.due}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_STYLE[task.priority]}`}>
                      {task.priority}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[task.status].pill}`}>
                      {STATUS_STYLE[task.status].label}
                    </span>
                  </div>
                </div>
                {task.comments.length > 0 && (
                  <p className={`text-[10px] mt-1 flex items-center gap-1 ${sub}`}>
                    <MessageSquare className="h-3 w-3" /> {task.comments.length} comment{task.comments.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Task detail */}
        <div className={`rounded-2xl border p-5 ${card}`}>
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <GitBranch className={`h-10 w-10 mb-3 ${isDarkMode ? 'text-slate-700' : 'text-gray-300'}`} />
              <p className={`text-sm ${sub}`}>Select a task to view details,<br />advance status, or add comments.</p>
            </div>
          ) : (
            <div>
              <h3 className={`text-base font-semibold mb-1 ${text}`}>{selected.title}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[selected.status].pill}`}>
                  {STATUS_STYLE[selected.status].label}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_STYLE[selected.priority]}`}>
                  {selected.priority} priority
                </span>
              </div>

              {/* Pipeline progress */}
              <div className="flex items-center gap-1 mb-5">
                {PIPELINE.map((s, i) => (
                  <React.Fragment key={s}>
                    <div className={`flex-1 rounded-full h-1.5 ${PIPELINE.indexOf(selected.status) >= i ? 'bg-indigo-500' : isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
                    {i < PIPELINE.length - 1 && <ChevronRight className={`h-3 w-3 flex-shrink-0 ${sub}`} />}
                  </React.Fragment>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                {[
                  ['Assignee', selected.assignee],
                  ['Due Date', selected.due],
                  ['Priority', selected.priority],
                  ['Status',   STATUS_STYLE[selected.status].label],
                ].map(([k, v]) => (
                  <div key={k} className={`rounded-xl border p-2.5 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`mb-0.5 ${sub}`}>{k}</p>
                    <p className={`font-medium capitalize ${text}`}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Advance button */}
              {selected.status !== 'approved' && (
                <button onClick={() => { advance(selected.id); setSelected(prev => ({ ...prev, status: PIPELINE[Math.min(PIPELINE.indexOf(prev.status) + 1, PIPELINE.length - 1)] })); }}
                  className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 mb-4">
                  Advance → {STATUS_STYLE[PIPELINE[Math.min(PIPELINE.indexOf(selected.status) + 1, PIPELINE.length - 1)]].label}
                </button>
              )}

              {/* Comments */}
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Comments</p>
                <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                  {selected.comments.length === 0 && (
                    <p className={`text-xs ${sub}`}>No comments yet.</p>
                  )}
                  {tasks.find(t => t.id === selected.id)?.comments.map((c, i) => (
                    <div key={i} className={`rounded-xl border px-3 py-2 text-xs ${isDarkMode ? 'border-white/8 bg-white/3 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                      {c}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={comment} onChange={e => setComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addComment(selected.id)}
                    placeholder="Add a comment..."
                    className={`flex-1 rounded-xl border px-3 py-2 text-xs outline-none focus:border-indigo-500/50 ${isDarkMode ? 'border-white/10 bg-[#0d0f14] text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
                  <button onClick={() => addComment(selected.id)}
                    className="rounded-xl bg-indigo-500/20 border border-indigo-500/30 px-3 py-2 text-indigo-400 hover:bg-indigo-500/30">
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
