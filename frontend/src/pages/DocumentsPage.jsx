import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Upload, RefreshCw, Download, Trash2, Eye, Bot, X, FileText, Edit2 } from 'lucide-react';
import AppShell from '../components/AppShell';
import { documentAPI, analysisAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

const CATS = ['policy', 'contract', 'invoice', 'compliance', 'report', 'memo', 'other'];
const DEPARTMENTS = ['General', 'Finance', 'HR', 'IT', 'Compliance', 'Operations', 'Procurement', 'Logistics', 'Legal'];
const AUDIT_STATUSES = ['in_review', 'in_progress', 'changes_requested', 'approved', 'rejected'];

const getProcessingStatus = (doc) => {
  if (doc.ocrProcessed || doc.extractedText) return 'Processed';
  if (doc.metadata?.latestAuditDecision || doc.metadata?.statusReason) return 'Reviewed';
  if (['approved', 'rejected', 'changes_requested', 'reviewed'].includes(doc.status)) return 'Reviewed';
  return 'Pending';
};

const getUploaderLabel = (doc) => {
  const uploader = doc.uploader || {};
  return uploader.fullName || uploader.email || doc.metadata?.uploadedByName || 'Unknown uploader';
};

// â”€â”€ Document Viewer Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DocumentViewer({ doc, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [previewText, setPreviewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const ext = (doc.fileFormat || doc.fileName?.split('.').pop() || '').toLowerCase();
  const isImage = ['png','jpg','jpeg','gif','webp','bmp'].includes(ext);
  const isPDF   = ext === 'pdf';
  const canTextPreview = ['docx', 'txt', 'csv', 'md'].includes(ext);
  const canEmbed = isPDF || isImage;

  useEffect(() => {
    let active = true;
    let url;

    setLoading(true);
    setErr('');
    setBlobUrl(null);
    setPreviewText('');

    const loadPreview = async () => {
      try {
        if (canEmbed) {
          const res = await documentAPI.download(doc.id);
          if (!active) return;
          url = URL.createObjectURL(res.data);
          setBlobUrl(url);
        } else if (canTextPreview) {
          const res = await documentAPI.previewText(doc.id);
          if (!active) return;
          setPreviewText(res.text || '');
        }
      } catch (e) {
        if (active) {
          setErr(e?.response?.data?.error || 'Could not load file preview.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPreview();

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc.id, canEmbed, canTextPreview]);

  const handleDownload = async () => {
    try {
      const res = await documentAPI.download(doc.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = doc.fileName || doc.title || 'document';
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { alert(e?.response?.data?.error || 'Download failed.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111318] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-indigo-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{doc.title || doc.fileName}</p>
              <p className="text-xs text-slate-500">{doc.category} Â· {doc.department} Â· {ext?.toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10">
              <Download className="h-3.5 w-3.5" /> Download
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-[60vh] flex-1 items-stretch justify-center overflow-auto bg-[#0d0f14]">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-sm text-slate-500">Loading preview...</p>
            </div>
          )}
          {err && <p className="text-sm text-red-400">{err}</p>}
          {!loading && !err && blobUrl && isPDF && (
            <iframe src={blobUrl} title={doc.title} className="h-[75vh] min-h-[60vh] w-full border-0" />
          )}
          {!loading && !err && blobUrl && isImage && (
            <img src={blobUrl} alt={doc.title} className="m-auto max-w-full object-contain p-4" />
          )}
          {!loading && !err && previewText && (
            <pre className="min-h-full w-full whitespace-pre-wrap break-words p-5 text-left text-sm leading-6 text-slate-200">{previewText}</pre>
          )}
          {!loading && !err && !previewText && !canEmbed && (
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <FileText className="h-16 w-16 text-slate-700" />
              <p className="text-sm text-slate-400">Preview not available for <span className="font-semibold text-white">.{ext}</span> files.</p>
              <p className="text-xs text-slate-600">Download the file to view it in your local application.</p>
              <button onClick={handleDownload}
                className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600">
                <Download className="h-4 w-4" /> Download to View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_PILL = {
  approved:   'bg-emerald-500/15 text-emerald-400',
  in_review:  'bg-blue-500/15 text-blue-400',
  in_progress:'bg-amber-500/15 text-amber-400',
  changes_requested: 'bg-purple-500/15 text-purple-400',
  rejected:   'bg-red-500/15 text-red-400',
  uploaded:   'bg-blue-500/15 text-blue-400',
  processing: 'bg-amber-500/15 text-amber-400',
  reviewed:   'bg-purple-500/15 text-purple-400',
  archived:   'bg-slate-500/15 text-slate-400',
  flagged:    'bg-red-500/15 text-red-400',
};

export default function DocumentsPage() {
  const { user } = useAuthStore();
  const dropRef = useRef(null);
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [dragging, setDragging]   = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [upload, setUpload]       = useState({ files: [], title: '', category: 'policy', department: '', busy: false, error: '', success: '' });
  const [analysisMsg, setAnalysisMsg] = useState({});
  const [analysisDraft, setAnalysisDraft] = useState({});
  const [auditResults, setAuditResults] = useState({});
  const [auditLoading, setAuditLoading] = useState({});
  const [statusDraft, setStatusDraft] = useState({});
  const [editDraft, setEditDraft] = useState({});
  const [expanded, setExpanded]   = useState(null);
  const [viewerDoc, setViewerDoc] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentAPI.getAll({ limit: 30 });
      const d = res?.documents || res?.data || res || [];
      setDocs(Array.isArray(d) ? d : []);
    } catch { setDocs([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) { setUpload(p => ({ ...p, files, title: files.length === 1 ? files[0].name : '' })); setShowUpload(true); }
  };

  const handleUpload = async () => {
    if (!upload.files.length) return setUpload(p => ({ ...p, error: 'Select at least one file.' }));
    setUpload(p => ({ ...p, busy: true, error: '', success: '' }));
    try {
      const form = new FormData();
      form.append('category', upload.category);
      form.append('department', upload.department || user?.department || 'General');
      if (upload.files.length === 1) {
        form.append('file', upload.files[0]);
        form.append('title', upload.title || upload.files[0].name);
        await documentAPI.create(form);
      } else {
        upload.files.forEach(file => form.append('files', file));
        await documentAPI.bulkUpload(form);
      }
      setUpload({ files: [], title: '', category: 'policy', department: '', busy: false, error: '', success: 'Uploaded!' });
      setShowUpload(false);
      load();
    } catch (e) {
      setUpload(p => ({ ...p, busy: false, error: e?.response?.data?.error || 'Upload failed.' }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try { await documentAPI.delete(id); load(); } catch { alert('Delete failed.'); }
  };

  const handleEdit = async (doc) => {
    const draft = editDraft[doc.id] || {};
    try {
      await documentAPI.update(doc.id, {
        title: draft.title ?? doc.title,
        category: draft.category ?? doc.category,
        department: draft.department ?? doc.department,
        description: draft.description ?? doc.description ?? '',
      });
      setEditDraft(p => ({ ...p, [doc.id]: { editing: false } }));
      load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Update failed.');
    }
  };

  const handleReupload = async (doc, file) => {
    if (!file) return;
    try {
      const form = new FormData();
      form.append('file', file);
      await documentAPI.reupload(doc.id, form);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Re-upload failed.');
    }
  };

  const loadAuditResult = async (docId) => {
    setAuditLoading(p => ({ ...p, [docId]: true }));
    try {
      const res = await analysisAPI.getInsights(docId);
      setAuditResults(p => ({ ...p, [docId]: res }));
    } catch (e) {
      setAuditResults(p => ({ ...p, [docId]: e?.response?.status === 404 ? null : { error: e?.response?.data?.error || 'Could not load audit result.' } }));
    } finally {
      setAuditLoading(p => ({ ...p, [docId]: false }));
    }
  };

  const toggleExpanded = (doc) => {
    const next = expanded === doc.id ? null : doc.id;
    setExpanded(next);
    if (next && auditResults[doc.id] === undefined) loadAuditResult(doc.id);
  };

  const handleAnalyze = async (doc) => {
    setAnalysisMsg(p => ({ ...p, [doc.id]: 'Analyzing...' }));
    try {
      const auditorComment = analysisDraft[doc.id]?.comment || '';
      const res = await analysisAPI.analyzeDocument(doc.id, { auditorComment });
      const risk = res?.analysis?.riskLevel || res?.riskLevel || 'low';
      setAnalysisMsg(p => ({ ...p, [doc.id]: `Risk: ${risk}` }));
      setAnalysisDraft(p => ({ ...p, [doc.id]: { comment: '' } }));
      await loadAuditResult(doc.id);
      load();
    } catch { setAnalysisMsg(p => ({ ...p, [doc.id]: 'Failed' })); }
  };

  const handleStatusUpdate = async (doc) => {
    const draft = statusDraft[doc.id] || {};
    const nextStatus = draft.status || doc.status || 'in_review';
    try {
      await documentAPI.updateStatus(doc.id, { status: nextStatus, reason: draft.reason || '' });
      setStatusDraft(p => ({ ...p, [doc.id]: { status: nextStatus, reason: '' } }));
      load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Status update failed.');
    }
  };

  const role = user?.role || 'viewer';

  return (
    <AppShell title="Document Hub">
      {/* Drop zone â€” hidden for viewers */}
      <div
        ref={dropRef}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => setShowUpload(true)}
        className={`mb-5 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/10 bg-[#111318] hover:border-indigo-500/40 hover:bg-indigo-500/5'
        }`}>
        <Upload className="mx-auto mb-2 h-8 w-8 text-slate-500" />
        <p className="text-sm font-medium text-slate-300">Drag & drop files here, or click to upload</p>
        <p className="text-xs text-slate-600 mt-1">PDF, DOCX, XLSX, images â€” auto metadata extraction</p>
      </div>

      {/* Document list */}
      <div className="rounded-2xl border border-white/8 bg-[#111318] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">Documents ({docs.length})</h2>
          <button onClick={load} className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-white">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading...</div>
        ) : docs.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-700" />
            <p className="text-sm text-slate-500">No documents yet. Upload your first file above.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {docs.map(doc => (
              <div key={doc.id}>
                <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/2 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{doc.title || doc.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {doc.category} Â· {doc.department}
                      {doc.createdAt ? ` Â· ${new Date(doc.createdAt).toLocaleDateString()}` : ''}
                    </p>
                    {analysisMsg[doc.id] && (
                      <p className="text-[10px] text-indigo-400 mt-0.5">{analysisMsg[doc.id]}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${STATUS_PILL[doc.status] || STATUS_PILL.uploaded}`}>
                    {doc.status || 'uploaded'}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setViewerDoc(doc)}
                      className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5" title="View Document">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => toggleExpanded(doc)}
                      className="rounded-lg p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10" title="Details">
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    {role === 'auditor' && (
                    <button onClick={() => handleAnalyze(doc)}
                      className="rounded-lg p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10" title="AI Analyze">
                      <Bot className="h-3.5 w-3.5" />
                    </button>
                    )}
                    <button onClick={() => setEditDraft(p => ({ ...p, [doc.id]: { editing: true, title: doc.title || '', category: doc.category || 'policy', department: doc.department || 'General', description: doc.description || '' } }))}
                      className="rounded-lg p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10" title="Edit">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(doc.id)}
                      className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {/* Expanded metadata */}
                {expanded === doc.id && (
                  <div className="px-5 pb-3 bg-white/2 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-2 pt-3 text-xs sm:grid-cols-4">
                      {[
                        ['File', doc.fileName || 'â€”'],
                        ['Format', doc.fileFormat || 'â€”'],
                        ['Size', doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'â€”'],
                        ['Text extraction', getProcessingStatus(doc)],
                        ['Uploader', getUploaderLabel(doc)],
                        ['Department', doc.department || 'â€”'],
                      ].map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-white/3 border border-white/5 p-2">
                          <p className="text-slate-500 mb-0.5">{k}</p>
                          <p className="text-slate-200 font-medium truncate">{v}</p>
                        </div>
                      ))}
                    </div>
                    {doc.description && (
                      <p className="mt-2 text-xs text-slate-400 bg-white/3 rounded-lg p-2 border border-white/5">{doc.description}</p>
                    )}
                    {editDraft[doc.id]?.editing && (
                      <div className="mt-3 rounded-lg border border-white/5 bg-white/3 p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input value={editDraft[doc.id]?.title || ''} onChange={e => setEditDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), title: e.target.value } }))}
                            className="rounded-lg border border-white/10 bg-[#0d0f14] px-2 py-2 text-xs text-white outline-none" placeholder="Title" />
                          <select value={editDraft[doc.id]?.category || 'policy'} onChange={e => setEditDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), category: e.target.value } }))}
                            className="rounded-lg border border-white/10 bg-[#0d0f14] px-2 py-2 text-xs text-white outline-none">
                            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <select value={editDraft[doc.id]?.department || 'General'} onChange={e => setEditDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), department: e.target.value } }))}
                            className="rounded-lg border border-white/10 bg-[#0d0f14] px-2 py-2 text-xs text-white outline-none">
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <input value={editDraft[doc.id]?.description || ''} onChange={e => setEditDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), description: e.target.value } }))}
                            className="rounded-lg border border-white/10 bg-[#0d0f14] px-2 py-2 text-xs text-white outline-none" placeholder="Description" />
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => handleEdit(doc)} className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-600">Save Changes</button>
                          <button onClick={() => setEditDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), editing: false } }))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">Cancel</button>
                        </div>
                      </div>
                    )}
                    {['rejected', 'changes_requested'].includes(doc.status) && (
                      <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                        <label className="mb-2 block text-xs font-semibold text-amber-300">Re-upload corrected document</label>
                        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                          onChange={e => handleReupload(doc, e.target.files?.[0])}
                          className="w-full rounded-lg border border-amber-500/20 bg-[#0d0f14] px-2 py-2 text-xs text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-amber-500/20 file:px-2 file:py-1 file:text-amber-200" />
                      </div>
                    )}
                    {doc.metadata?.statusReason && (
                      <p className="mt-2 text-xs text-amber-300 bg-amber-500/10 rounded-lg p-2 border border-amber-500/20">Auditor note: {doc.metadata.statusReason}</p>
                    )}
                    {(doc.metadata?.latestComplianceScore != null || doc.metadata?.latestAiGeneratedPercentage != null) && (
                      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                        <div className="rounded-lg border border-white/5 bg-white/3 p-2">
                          <p className="mb-0.5 text-slate-500">Audit score</p>
                          <p className="font-semibold text-white">{doc.metadata?.latestComplianceScore ?? '-'} / 100</p>
                        </div>
                        <div className="rounded-lg border border-white/5 bg-white/3 p-2">
                          <p className="mb-0.5 text-slate-500">AI-written content</p>
                          <p className={`font-semibold ${(doc.metadata?.latestAiGeneratedPercentage || 0) > 25 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {doc.metadata?.latestAiGeneratedPercentage ?? 0}% / 25%
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/5 bg-white/3 p-2">
                          <p className="mb-0.5 text-slate-500">Decision</p>
                          <p className="font-semibold capitalize text-slate-200">{doc.metadata?.latestAuditDecision?.status?.replace(/_/g, ' ') || doc.status}</p>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 rounded-lg border border-white/5 bg-white/3 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-200">Audit results</p>
                        {auditLoading[doc.id] && <p className="text-[10px] text-slate-500">Loading...</p>}
                      </div>
                      {auditResults[doc.id]?.error ? (
                        <p className="text-xs text-red-400">{auditResults[doc.id].error}</p>
                      ) : auditResults[doc.id] ? (
                        <div className="space-y-3 text-xs">
                          {auditResults[doc.id].auditorComment && (
                            <p className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-200">
                              Auditor comment: {auditResults[doc.id].auditorComment}
                            </p>
                          )}
                          {auditResults[doc.id].summary && (
                            <p className="rounded-lg border border-white/5 bg-[#0d0f14] p-2 text-slate-300">{auditResults[doc.id].summary}</p>
                          )}
                          <div className="grid gap-2 sm:grid-cols-4">
                            <div className="rounded-lg border border-white/5 bg-[#0d0f14] p-2">
                              <p className="mb-0.5 text-slate-500">Score</p>
                              <p className="font-semibold text-white">{auditResults[doc.id].results?.compliance_score ?? '-'} / 100</p>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-[#0d0f14] p-2">
                              <p className="mb-0.5 text-slate-500">Risk</p>
                              <p className="font-semibold capitalize text-slate-200">{auditResults[doc.id].riskLevel || auditResults[doc.id].results?.risk_level || 'low'}</p>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-[#0d0f14] p-2">
                              <p className="mb-0.5 text-slate-500">AI-written</p>
                              <p className="font-semibold text-slate-200">{auditResults[doc.id].results?.ai_generated_percentage ?? 0}%</p>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-[#0d0f14] p-2">
                              <p className="mb-0.5 text-slate-500">Analyzed</p>
                              <p className="font-semibold text-slate-200">{auditResults[doc.id].analyzedAt ? new Date(auditResults[doc.id].analyzedAt).toLocaleDateString() : '-'}</p>
                            </div>
                          </div>
                          {auditResults[doc.id].results?.violations?.length > 0 && (
                            <div>
                              <p className="mb-1 font-semibold text-red-300">Violations</p>
                              <ul className="space-y-1 text-slate-300">
                                {auditResults[doc.id].results.violations.slice(0, 5).map((item, i) => (
                                  <li key={i}>
                                    - {typeof item === 'string' ? item : `${item.code ? `[${item.code}] ` : ''}${item.title || item.summary || 'Violation'}`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {auditResults[doc.id].results?.missing_fields?.length > 0 && (
                            <div>
                              <p className="mb-1 font-semibold text-amber-300">Missing fields</p>
                              <p className="text-slate-300">{auditResults[doc.id].results.missing_fields.join(', ')}</p>
                            </div>
                          )}
                          {auditResults[doc.id].recommendations?.length > 0 && (
                            <div>
                              <p className="mb-1 font-semibold text-emerald-300">Recommendations</p>
                              <ul className="space-y-1 text-slate-300">
                                {auditResults[doc.id].recommendations.slice(0, 5).map((item, i) => <li key={i}>- {item}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No audit result is available yet.</p>
                      )}
                    </div>
                    {role === 'auditor' && (
                      <div className="mt-3 rounded-lg border border-white/5 bg-white/3 p-3">
                        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input
                            value={analysisDraft[doc.id]?.comment || ''}
                            onChange={e => setAnalysisDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), comment: e.target.value } }))}
                            placeholder="Optional audit comment for the document owner"
                            className="rounded-lg border border-white/10 bg-[#0d0f14] px-2 py-2 text-xs text-white outline-none" />
                          <button onClick={() => handleAnalyze(doc)}
                            className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600">
                            Run Audit & Notify
                          </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                          <select
                            value={statusDraft[doc.id]?.status || doc.status || 'in_review'}
                            onChange={e => setStatusDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), status: e.target.value } }))}
                            className="rounded-lg border border-white/10 bg-[#0d0f14] px-2 py-2 text-xs text-white outline-none">
                            {AUDIT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                          </select>
                          <input
                            value={statusDraft[doc.id]?.reason || ''}
                            onChange={e => setStatusDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), reason: e.target.value } }))}
                            placeholder="Reason or note for document owner"
                            className="rounded-lg border border-white/10 bg-[#0d0f14] px-2 py-2 text-xs text-white outline-none" />
                          <button onClick={() => handleStatusUpdate(doc)}
                            className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-600">
                            Update & Notify
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1d24] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">Upload Document</h3>
              <button onClick={() => setShowUpload(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">File *</label>
                <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    setUpload(p => ({ ...p, files, title: files.length === 1 ? files[0].name : '' }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-2 file:py-1 file:text-xs file:text-indigo-300" />
                {upload.files.length > 0 && <p className="mt-1 text-[10px] text-slate-500">{upload.files.length} file{upload.files.length > 1 ? 's' : ''} selected</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Title</label>
                <input value={upload.title} onChange={e => setUpload(p => ({ ...p, title: e.target.value }))}
                  placeholder="Leave blank to use filename"
                  className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Category</label>
                  <select value={upload.category} onChange={e => setUpload(p => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-3 py-2.5 text-sm text-white outline-none">
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Department</label>
                  <select value={upload.department} onChange={e => setUpload(p => ({ ...p, department: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50">
                    <option value="">Select</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              {upload.error && <p className="text-xs text-red-400">{upload.error}</p>}
              <button onClick={handleUpload} disabled={upload.busy}
                className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60 flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" /> {upload.busy ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Document Viewer */}
      {viewerDoc && <DocumentViewer doc={viewerDoc} onClose={() => setViewerDoc(null)} />}
    </AppShell>
  );
}
