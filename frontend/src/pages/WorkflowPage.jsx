import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  GitBranch,
  MessageSquare,
  RefreshCw,
  Send,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import { documentAPI, taskAPI, workflowAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

const PIPELINE = ['uploaded', 'in_review', 'in_progress', 'changes_requested', 'approved', 'rejected'];

const STATUS_STYLE = {
  uploaded: { pill: 'bg-slate-500/15 text-slate-400', label: 'Uploaded', tone: 'text-slate-400' },
  pending: { pill: 'bg-slate-500/15 text-slate-400', label: 'Pending', tone: 'text-slate-400' },
  in_review: { pill: 'bg-blue-500/15 text-blue-400', label: 'In Review', tone: 'text-blue-400' },
  in_progress: { pill: 'bg-indigo-500/15 text-indigo-400', label: 'In Progress', tone: 'text-indigo-400' },
  changes_requested: { pill: 'bg-amber-500/15 text-amber-400', label: 'Changes Needed', tone: 'text-amber-400' },
  rejected: { pill: 'bg-red-500/15 text-red-400', label: 'Rejected', tone: 'text-red-400' },
  approved: { pill: 'bg-emerald-500/15 text-emerald-400', label: 'Approved', tone: 'text-emerald-400' },
  completed: { pill: 'bg-emerald-500/15 text-emerald-400', label: 'Completed', tone: 'text-emerald-400' },
};

const PRIORITY_STYLE = {
  high: 'bg-red-500/15 text-red-400',
  medium: 'bg-amber-500/15 text-amber-400',
  normal: 'bg-blue-500/15 text-blue-400',
  low: 'bg-slate-500/15 text-slate-400',
};

function nextDocumentStatus(status) {
  const current = status || 'uploaded';
  if (current === 'rejected' || current === 'approved') return current;
  if (current === 'changes_requested') return 'in_review';
  const idx = PIPELINE.indexOf(current);
  return PIPELINE[Math.min(idx + 1, PIPELINE.indexOf('approved'))] || 'in_review';
}

function visiblePipeline(status) {
  if (status === 'rejected') return ['uploaded', 'in_review', 'in_progress', 'rejected'];
  return ['uploaded', 'in_review', 'in_progress', 'changes_requested', 'approved'];
}

function documentToWorkflowItem(doc) {
  const uploaderName = doc.uploader?.fullName || doc.uploader?.email || doc.metadata?.uploadedByName || 'Unknown uploader';
  return {
    id: `document:${doc.id}`,
    itemType: 'document',
    documentId: doc.id,
    title: doc.title || doc.fileName,
    description: doc.metadata?.latestAuditSummary || doc.description || 'Uploaded document awaiting audit workflow.',
    status: doc.status || 'uploaded',
    auditMade: Boolean(doc.metadata?.latestAuditDecision || doc.metadata?.latestAuditSummary),
    priority: doc.status === 'rejected' ? 'high' : doc.status === 'changes_requested' ? 'medium' : 'normal',
    assignee: 'Audit team',
    assigneeEmail: null,
    owner: uploaderName,
    uploadedBy: doc.uploadedBy || null,
    uploadedByName: uploaderName,
    uploaderName,
    uploaderEmail: doc.uploader?.email || null,
    uploadedAt: doc.uploadedAt || doc.createdAt,
    dueDate: doc.expiryDate || doc.updatedAt || doc.createdAt,
    comments: [
      doc.metadata?.statusReason,
      doc.metadata?.latestAuditDecision?.reason,
      doc.metadata?.latestAuditSummary,
    ].filter(Boolean),
    complianceScore: doc.metadata?.latestComplianceScore ?? null,
    aiGeneratedPercentage: doc.metadata?.latestAiGeneratedPercentage ?? null,
    riskLevel: doc.metadata?.latestAuditDecision?.riskLevel || null,
    missingFieldsCount: 0,
    violationsCount: 0,
    recommendations: [],
    analyzedAt: doc.metadata?.latestAuditDecision ? (doc.lastModifiedAt || doc.updatedAt) : null,
    actionUrl: `/documents?documentId=${doc.id}`,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt || doc.createdAt,
  };
}

export default function WorkflowPage() {
  const { user, isDarkMode } = useAuthStore();
  const role = user?.role || 'viewer';
  const canUpdate = role === 'auditor' || role === 'administrator';
  const card = isDarkMode ? 'bg-[#111318] border-white/8' : 'bg-white border-gray-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-gray-900';
  const sub = isDarkMode ? 'text-slate-500' : 'text-gray-500';
  const divider = isDarkMode ? 'divide-white/5' : 'divide-gray-100';

  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const selected = items.find(item => item.id === selectedId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await workflowAPI.getTaskQueue();
      let list = Array.isArray(res?.items) ? res.items : [];
      if (list.length === 0) {
        const docRes = await documentAPI.getAll({ limit: 50 });
        const docs = docRes?.documents || docRes?.data || docRes || [];
        list = Array.isArray(docs) ? docs.map(documentToWorkflowItem) : [];
      }
      setItems(list);
    } catch (e) {
      try {
        const docRes = await documentAPI.getAll({ limit: 50 });
        const docs = docRes?.documents || docRes?.data || docRes || [];
        const fallbackItems = Array.isArray(docs) ? docs.map(documentToWorkflowItem) : [];
        setItems(fallbackItems);
        setErr(fallbackItems.length > 0 ? '' : (e?.response?.data?.error || 'Workflow could not be loaded.'));
      } catch {
        setErr(e?.response?.data?.error || 'Workflow could not be loaded.');
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const base = { uploaded: 0, in_review: 0, in_progress: 0, changes_requested: 0, approved: 0, rejected: 0 };
    items.forEach(item => {
      const key = item.status || 'uploaded';
      base[key] = (base[key] || 0) + 1;
    });
    return base;
  }, [items]);

  const showMsg = (message) => {
    setMsg(message);
    setTimeout(() => setMsg(''), 2500);
  };

  const updateSelectedInList = (id, patch) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const advance = async (item) => {
    if (!item || busy) return;
    setBusy(true);
    setErr('');
    try {
      if (item.itemType === 'document') {
        const next = nextDocumentStatus(item.status);
        const note = comment.trim() || `Workflow moved document to ${next.replace(/_/g, ' ')}.`;
        await documentAPI.updateStatus(item.documentId, { status: next, reason: note });
        updateSelectedInList(item.id, {
          status: next,
          comments: [...(item.comments || []), note],
        });
        setComment('');
        showMsg('Document workflow updated and owner notified.');
      } else {
        const next = item.status === 'pending' ? 'in_progress' : 'completed';
        const note = comment.trim();
        await taskAPI.updateStatus(item.taskId, next);
        if (note) {
          await taskAPI.update(item.taskId, { comments: [...(item.comments || []), note] });
        }
        updateSelectedInList(item.id, {
          status: next,
          comments: note ? [...(item.comments || []), note] : item.comments,
        });
        setComment('');
        showMsg('Task workflow updated.');
      }
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Workflow update failed.');
    } finally {
      setBusy(false);
    }
  };

  const requestChangesOrReject = async (item, status) => {
    if (!item || item.itemType !== 'document' || busy) return;
    const reason = comment.trim();
    if (!reason) {
      setErr('Add a reason before requesting changes or rejecting a document.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await documentAPI.updateStatus(item.documentId, { status, reason });
      updateSelectedInList(item.id, { status, comments: [...(item.comments || []), reason] });
      setComment('');
      showMsg(status === 'rejected' ? 'Document rejected and owner notified.' : 'Changes requested and owner notified.');
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Workflow update failed.');
    } finally {
      setBusy(false);
    }
  };

  const addComment = async (item) => {
    const note = comment.trim();
    if (!item || !note || busy) return;
    setBusy(true);
    setErr('');
    try {
      if (item.itemType === 'document') {
        await documentAPI.updateStatus(item.documentId, { status: item.status || 'in_review', reason: note });
        showMsg('Comment saved and owner notified.');
      } else {
        await taskAPI.update(item.taskId, { comments: [...(item.comments || []), note] });
        showMsg('Comment saved.');
      }
      updateSelectedInList(item.id, { comments: [...(item.comments || []), note] });
      setComment('');
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Could not save comment.');
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = status => STATUS_STYLE[status]?.label || String(status || 'Uploaded').replace(/_/g, ' ');

  return (
    <AppShell title="Workflow">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className={`text-sm ${sub}`}>
            {canUpdate
              ? 'Live audit workflow for uploaded documents and assigned tasks.'
              : 'Track the review status, auditor notes, and decisions for your uploaded documents.'}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className={`rounded-xl border p-2 transition-colors ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-400 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
        {['uploaded', 'in_review', 'in_progress', 'changes_requested', 'approved', 'rejected'].map(status => (
          <div key={status} className={`rounded-2xl border p-4 text-center ${card}`}>
            <p className={`text-2xl font-bold ${STATUS_STYLE[status]?.tone || 'text-slate-400'}`}>{counts[status] || 0}</p>
            <p className={`mt-1 text-xs capitalize ${sub}`}>{statusLabel(status)}</p>
          </div>
        ))}
      </div>

      {msg && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-400">{msg}</div>}
      {err && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-400">{err}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`overflow-hidden rounded-2xl border ${card}`}>
          <div className={`border-b px-5 py-4 ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
            <h2 className={`text-sm font-semibold ${text}`}>Workflow Items ({items.length})</h2>
          </div>
          {loading ? (
            <div className={`p-10 text-center text-sm ${sub}`}>Loading workflow...</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <GitBranch className={`mx-auto mb-3 h-10 w-10 ${isDarkMode ? 'text-slate-700' : 'text-gray-300'}`} />
              <p className={`text-sm ${sub}`}>No workflow items yet. Upload a document to start review.</p>
            </div>
          ) : (
            <div className={`divide-y ${divider}`}>
              {items.map(item => (
                <button key={item.id} onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                  className={`w-full px-5 py-3.5 text-left transition-colors ${selectedId === item.id ? 'border-l-2 border-indigo-500 bg-indigo-500/5' : isDarkMode ? 'hover:bg-white/2' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${item.itemType === 'document' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                      {item.itemType === 'document' ? <FileText className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${text}`}>{item.title}</p>
                      <p className={`mt-0.5 text-xs ${sub}`}>
                        {item.itemType === 'document' ? `Uploaded by: ${item.uploadedByName || item.uploaderName || item.owner}` : `Assigned: ${item.assignee}`}
                        {item.dueDate ? ` - ${new Date(item.dueDate).toLocaleDateString()}` : ''}
                      </p>
                      {item.auditMade && (
                        <p className="mt-1 text-[10px] font-semibold text-emerald-400">
                          Audit completed{item.analyzedAt ? ` - ${new Date(item.analyzedAt).toLocaleDateString()}` : ''}
                        </p>
                      )}
                      {item.comments?.length > 0 && (
                        <p className={`mt-1 flex items-center gap-1 text-[10px] ${sub}`}>
                          <MessageSquare className="h-3 w-3" /> {item.comments.length} note{item.comments.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.normal}`}>
                        {item.priority || 'normal'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[item.status]?.pill || STATUS_STYLE.uploaded.pill}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`rounded-2xl border p-5 ${card}`}>
          {!selected ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <GitBranch className={`mb-3 h-10 w-10 ${isDarkMode ? 'text-slate-700' : 'text-gray-300'}`} />
              <p className={`text-sm ${sub}`}>Select a workflow item to view audit progress, notes, and actions.</p>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className={`text-base font-semibold ${text}`}>{selected.title}</h3>
                  <p className={`mt-1 text-xs ${sub}`}>{selected.description}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[selected.status]?.pill || STATUS_STYLE.uploaded.pill}`}>
                  {statusLabel(selected.status)}
                </span>
              </div>

              {selected.itemType === 'document' && (
                <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                  <div className={`rounded-xl border p-2.5 ${selected.auditMade ? 'border-emerald-500/20 bg-emerald-500/10' : isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`mb-0.5 ${selected.auditMade ? 'text-emerald-300' : sub}`}>Audit Result</p>
                    <p className={`font-semibold ${selected.auditMade ? 'text-emerald-300' : text}`}>
                      {selected.auditMade ? 'Audit made' : 'Not audited yet'}
                    </p>
                  </div>
                  <div className={`rounded-xl border p-2.5 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`mb-0.5 ${sub}`}>Risk Level</p>
                    <p className={`font-semibold capitalize ${selected.riskLevel === 'high' ? 'text-red-400' : selected.riskLevel === 'medium' ? 'text-amber-400' : selected.riskLevel ? 'text-emerald-400' : text}`}>
                      {selected.riskLevel || '-'}
                    </p>
                  </div>
                  <div className={`rounded-xl border p-2.5 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`mb-0.5 ${sub}`}>Compliance Score</p>
                    <p className={`font-semibold ${text}`}>{selected.complianceScore ?? '-'} / 100</p>
                  </div>
                  <div className={`rounded-xl border p-2.5 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`mb-0.5 ${sub}`}>AI-written Content</p>
                    <p className={`font-semibold ${(selected.aiGeneratedPercentage || 0) > 25 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {selected.aiGeneratedPercentage ?? 0}% / 25%
                    </p>
                  </div>
                  <div className={`rounded-xl border p-2.5 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`mb-0.5 ${sub}`}>Findings</p>
                    <p className={`font-semibold ${text}`}>
                      {selected.missingFieldsCount ?? 0} missing, {selected.violationsCount ?? 0} violations
                    </p>
                  </div>
                  <div className={`rounded-xl border p-2.5 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`mb-0.5 ${sub}`}>Analyzed At</p>
                    <p className={`font-semibold ${text}`}>{selected.analyzedAt ? new Date(selected.analyzedAt).toLocaleString() : '-'}</p>
                  </div>
                </div>
              )}

              <div className="mb-5 flex items-center gap-1">
                {visiblePipeline(selected.status).map((status, i, arr) => {
                  const activeIndex = arr.indexOf(selected.status);
                  const done = activeIndex >= i;
                  return (
                    <React.Fragment key={status}>
                      <div className={`h-1.5 flex-1 rounded-full ${done ? 'bg-indigo-500' : isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} title={statusLabel(status)} />
                      {i < arr.length - 1 && <ChevronRight className={`h-3 w-3 flex-shrink-0 ${sub}`} />}
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                {[
                  ['Type', selected.itemType],
                  ['Uploaded By / Assignee', selected.itemType === 'document' ? (selected.uploadedByName || selected.uploaderName || selected.owner) : selected.assignee],
                  ...(selected.itemType === 'document' ? [['Uploader Email', selected.uploaderEmail || '-']] : []),
                  ['Priority', selected.priority || 'normal'],
                  [selected.itemType === 'document' ? 'Uploaded At' : 'Last Update', selected.itemType === 'document' && selected.uploadedAt ? new Date(selected.uploadedAt).toLocaleDateString() : selected.updatedAt ? new Date(selected.updatedAt).toLocaleDateString() : '-'],
                ].map(([k, v]) => (
                  <div key={k} className={`rounded-xl border p-2.5 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`mb-0.5 ${sub}`}>{k}</p>
                    <p className={`truncate font-medium capitalize ${text}`}>{v}</p>
                  </div>
                ))}
              </div>

              {selected.status === 'rejected' && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  This item was rejected. Review the notes and upload a corrected document if needed.
                </div>
              )}

              {selected.recommendations?.length > 0 && (
                <div className={`mb-4 rounded-xl border p-3 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                  <p className="mb-2 text-xs font-semibold text-indigo-300">Audit Recommendations</p>
                  <ul className="space-y-1.5">
                    {selected.recommendations.slice(0, 4).map((rec, index) => (
                      <li key={`${rec}-${index}`} className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {canUpdate && (
                <div className="mb-4 grid gap-2 sm:grid-cols-3">
                  {selected.status !== 'approved' && selected.status !== 'rejected' && (
                    <button onClick={() => advance(selected)} disabled={busy}
                      className="rounded-xl bg-indigo-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60">
                      Advance
                    </button>
                  )}
                  {selected.itemType === 'document' && selected.status !== 'approved' && (
                    <button onClick={() => requestChangesOrReject(selected, 'changes_requested')} disabled={busy}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-60">
                      Request Changes
                    </button>
                  )}
                  {selected.itemType === 'document' && selected.status !== 'rejected' && (
                    <button onClick={() => requestChangesOrReject(selected, 'rejected')} disabled={busy}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-60">
                      Reject
                    </button>
                  )}
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold text-slate-400">Workflow Notes</p>
                <div className="mb-3 max-h-36 space-y-2 overflow-y-auto">
                  {selected.comments?.length === 0 && <p className={`text-xs ${sub}`}>No notes yet.</p>}
                  {selected.comments?.map((note, i) => (
                    <div key={`${note}-${i}`} className={`rounded-xl border px-3 py-2 text-xs ${isDarkMode ? 'border-white/8 bg-white/3 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                      {note}
                    </div>
                  ))}
                </div>
                {canUpdate ? (
                  <div className="flex gap-2">
                    <input value={comment} onChange={e => setComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addComment(selected)}
                      placeholder="Add reason or workflow note..."
                      className={`flex-1 rounded-xl border px-3 py-2 text-xs outline-none focus:border-indigo-500/50 ${isDarkMode ? 'border-white/10 bg-[#0d0f14] text-white' : 'border-gray-300 bg-white text-gray-900'}`} />
                    <button onClick={() => addComment(selected)} disabled={busy || !comment.trim()}
                      className="rounded-xl border border-indigo-500/30 bg-indigo-500/20 px-3 py-2 text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-40">
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${isDarkMode ? 'border-white/8 bg-white/3 text-slate-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                    <Clock className="h-3.5 w-3.5" />
                    Auditor updates and email notifications will appear here after review.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
