import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Upload, RefreshCw, Download, Trash2, Eye, Bot, X, FileText, History } from 'lucide-react';
import AppShell from '../components/AppShell';
import { documentAPI, analysisAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

const CATS = ['policy', 'contract', 'invoice', 'compliance', 'report', 'memo', 'other'];

// ── Document Viewer Modal ─────────────────────────────────────────────────────
function DocumentViewer({ doc, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const ext = (doc.fileFormat || doc.fileName?.split('.').pop() || '').toLowerCase();
  const isImage = ['png','jpg','jpeg','gif','webp','bmp'].includes(ext);
  const isPDF   = ext === 'pdf';
  const canEmbed = isPDF || isImage;

  useEffect(() => {
    if (!canEmbed) { setLoading(false); return; }
    documentAPI.download(doc.id)
      .then(res => {
        const url = URL.createObjectURL(res.data);
        setBlobUrl(url);
        setLoading(false);
      })
      .catch(() => { setErr('Could not load file preview.'); setLoading(false); });
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [doc.id]); // eslint-disable-line

  const handleDownload = async () => {
    try {
      const res = await documentAPI.download(doc.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = doc.fileName || doc.title || 'document';
      a.click(); URL.revokeObjectURL(url);
    } catch { alert('Download failed.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#111318] shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-indigo-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{doc.title || doc.fileName}</p>
              <p className="text-xs text-slate-500">{doc.category} · {doc.department} · {ext?.toUpperCase()}</p>
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
        <div className="flex-1 overflow-hidden bg-[#0d0f14] flex items-center justify-center min-h-0">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-sm text-slate-500">Loading preview...</p>
            </div>
          )}
          {err && <p className="text-sm text-red-400">{err}</p>}
          {!loading && !err && blobUrl && isPDF && (
            <iframe src={blobUrl} title={doc.title} className="w-full h-full border-0" style={{ minHeight: '60vh' }} />
          )}
          {!loading && !err && blobUrl && isImage && (
            <img src={blobUrl} alt={doc.title} className="max-w-full max-h-full object-contain p-4" />
          )}
          {!loading && !err && !canEmbed && (
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
  const [upload, setUpload]       = useState({ file: null, title: '', category: 'policy', department: '', busy: false, error: '', success: '' });
  const [analysisMsg, setAnalysisMsg] = useState({});
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
    const file = e.dataTransfer.files?.[0];
    if (file) { setUpload(p => ({ ...p, file, title: file.name })); setShowUpload(true); }
  };

  const handleUpload = async () => {
    if (!upload.file) return setUpload(p => ({ ...p, error: 'Select a file.' }));
    setUpload(p => ({ ...p, busy: true, error: '', success: '' }));
    try {
      const form = new FormData();
      form.append('file', upload.file);
      form.append('title', upload.title || upload.file.name);
      form.append('category', upload.category);
      form.append('department', upload.department || user?.department || 'General');
      await documentAPI.create(form);
      setUpload({ file: null, title: '', category: 'policy', department: '', busy: false, error: '', success: 'Uploaded!' });
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

  const handleAnalyze = async (doc) => {
    setAnalysisMsg(p => ({ ...p, [doc.id]: 'Analyzing...' }));
    try {
      const res = await analysisAPI.analyzeDocument(doc.id);
      const risk = res?.analysis?.riskLevel || res?.riskLevel || 'low';
      setAnalysisMsg(p => ({ ...p, [doc.id]: `Risk: ${risk}` }));
    } catch { setAnalysisMsg(p => ({ ...p, [doc.id]: 'Failed' })); }
  };

  const role = user?.role || 'viewer';

  return (
    <AppShell title="Document Hub">
      {/* Drop zone — hidden for viewers */}
      {role !== 'viewer' && (
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
        <p className="text-xs text-slate-600 mt-1">PDF, DOCX, XLSX, images — auto metadata extraction</p>
      </div>
      )}

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
                      {doc.category} · {doc.department}
                      {doc.createdAt ? ` · ${new Date(doc.createdAt).toLocaleDateString()}` : ''}
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
                    <button onClick={() => setExpanded(expanded === doc.id ? null : doc.id)}
                      className="rounded-lg p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10" title="Details">
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleAnalyze(doc)}
                      className="rounded-lg p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10" title="AI Analyze">
                      <Bot className="h-3.5 w-3.5" />
                    </button>
                    {(user?.role === 'administrator' || user?.role === 'document_manager') && (
                      <button onClick={() => handleDelete(doc.id)}
                        className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Expanded metadata */}
                {expanded === doc.id && (
                  <div className="px-5 pb-3 bg-white/2 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-2 pt-3 text-xs sm:grid-cols-4">
                      {[
                        ['File', doc.fileName || '—'],
                        ['Format', doc.fileFormat || '—'],
                        ['Size', doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : '—'],
                        ['OCR', doc.ocrProcessed ? 'Processed' : 'Pending'],
                        ['Classification', doc.classificationLevel || 'internal'],
                        ['Version', doc.currentVersion || 'v1'],
                        ['Uploader', doc.uploadedBy || '—'],
                        ['Department', doc.department || '—'],
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
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={e => setUpload(p => ({ ...p, file: e.target.files?.[0] || null, title: e.target.files?.[0]?.name || p.title }))}
                  className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-2 file:py-1 file:text-xs file:text-indigo-300" />
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
                  <input value={upload.department} onChange={e => setUpload(p => ({ ...p, department: e.target.value }))}
                    placeholder="e.g. Finance"
                    className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50" />
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
