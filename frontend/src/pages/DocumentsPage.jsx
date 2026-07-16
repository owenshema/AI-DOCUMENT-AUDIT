import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Upload, RefreshCw, Download, Trash2, Eye, Bot, X, FileText, Edit2, Ship, Package, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import AppShell from '../components/AppShell';
import { documentAPI, analysisAPI } from '../api/auth';
import useAuthStore from '../store/authStore';
import { normalizeRole, isOwnerRole } from '../config/roles';
import { getAppTheme, statusPill } from '../utils/uiTheme';

const CATS = ['policy', 'contract', 'invoice', 'compliance', 'report', 'memo', 'other'];
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
function DocumentViewer({ doc, onClose, onNotify }) {
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
      const res = await documentAPI.download(doc.id, { attachment: true });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = doc.fileName || doc.title || 'document';
      a.click(); URL.revokeObjectURL(url);
    } catch (e) {
      if (onNotify) onNotify('error', e?.response?.data?.error || 'Download failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 dark:bg-[#0b1a2e]/70">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-2xl dark:border-blue-400/30 dark:bg-[#122a45]">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-blue-100 px-5 py-4 dark:border-blue-400/20">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-300" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{doc.title || doc.fileName}</p>
              <p className="text-xs text-slate-600 dark:text-blue-200/70">{doc.category} · {ext?.toUpperCase()}</p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-800 hover:bg-blue-100 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-100 dark:hover:bg-blue-500/25">
              <Download className="h-3.5 w-3.5" /> Download
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-600 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-500/20">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex min-h-[60vh] flex-1 items-stretch justify-center overflow-auto bg-blue-50 dark:bg-[#0b1a2e]">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="text-sm text-slate-600 dark:text-blue-200/70">Loading preview...</p>
            </div>
          )}
          {err && <p className="text-sm text-blue-900 dark:text-blue-100">{err}</p>}
          {!loading && !err && blobUrl && isPDF && (
            <iframe src={blobUrl} title={doc.title} className="h-[75vh] min-h-[60vh] w-full border-0" />
          )}
          {!loading && !err && blobUrl && isImage && (
            <img src={blobUrl} alt={doc.title} className="m-auto max-w-full object-contain p-4" />
          )}
          {!loading && !err && previewText && (
            <pre className="min-h-full w-full whitespace-pre-wrap break-words p-5 text-left text-sm leading-6 text-slate-800 dark:text-blue-50">{previewText}</pre>
          )}
          {!loading && !err && !previewText && !canEmbed && (
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <FileText className="h-16 w-16 text-blue-300 dark:text-blue-500" />
              <p className="text-sm text-slate-700 dark:text-blue-100">Preview not available for <span className="font-semibold">.{ext}</span> files.</p>
              <p className="text-xs text-slate-500 dark:text-blue-200/70">Download the file to view it in your local application.</p>
              <button onClick={handleDownload}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                <Download className="h-4 w-4" /> Download to View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


const getMainScrollEl = () => document.querySelector('main');

export default function DocumentsPage() {
  const { user, isDarkMode } = useAuthStore();
  const t = getAppTheme(isDarkMode);
  const [searchParams, setSearchParams] = useSearchParams();
  const dropRef = useRef(null);
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [dragging, setDragging]   = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [upload, setUpload]       = useState({ files: [], title: '', category: 'policy', priority: 'normal', busy: false, error: '', success: '' });
  const [analysisMsg, setAnalysisMsg] = useState({});
  const [analysisDraft, setAnalysisDraft] = useState({});
  const [auditResults, setAuditResults] = useState({});
  const [auditLoading, setAuditLoading] = useState({});
  const [statusDraft, setStatusDraft] = useState({});
  const [editDraft, setEditDraft] = useState({});
  const [expanded, setExpanded]   = useState(null);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [auditFilter, setAuditFilter] = useState('needs_audit');
  const [clientSourceFilter, setClientSourceFilter] = useState('all');
  const [exportingReportId, setExportingReportId] = useState(null);
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [requestDoc, setRequestDoc] = useState(null);
  const [requestForm, setRequestForm] = useState({ port: '', note: '' });
  const [requestingDocId, setRequestingDocId] = useState(null);
  const [requestMsg, setRequestMsg] = useState({});
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newRequestForm, setNewRequestForm] = useState({ title: '', description: '', category: 'other', port: '', note: '' });
  const [submittingNewRequest, setSubmittingNewRequest] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'success'|'error', message }
  const noticeTimer = useRef(null);

  const showNotice = useCallback((type, message) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ type, message });
    noticeTimer.current = setTimeout(() => setNotice(null), 6000);
  }, []);

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const isAuditorView = user?.role === 'auditor' || user?.role === 'administrator';

  const load = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) setLoading(true);
    try {
      const params = { limit: 50 };
      const r = user?.role;
      if ((r === 'auditor' || r === 'administrator') && auditFilter !== 'all') {
        params.auditState = auditFilter;
      }
      if (r === 'client' && clientSourceFilter !== 'all' && clientSourceFilter !== 'requests') {
        params.source = clientSourceFilter;
      }
      const res = await documentAPI.getAll(params);
      const d = res?.documents || res?.data || res || [];
      setDocs(Array.isArray(d) ? d : []);
    } catch { setDocs([]); }
    if (!silent) setLoading(false);
  }, [user, auditFilter, clientSourceFilter]);

  const refreshDocument = useCallback(async (docId) => {
    try {
      const res = await documentAPI.getById(docId);
      const updated = res?.document || res;
      if (!updated?.id) return;
      setDocs(prev => prev.map(d => (d.id === docId ? { ...d, ...updated } : d)));
    } catch {
      await load({ silent: true });
    }
  }, [load]);

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
      form.append('department', 'General');
      if (isDocumentManager) {
        form.append('isUrgent', upload.priority === 'urgent' ? 'true' : 'false');
      }
      if (upload.files.length === 1) {
        form.append('file', upload.files[0]);
        form.append('title', upload.title || upload.files[0].name);
        await documentAPI.create(form);
      } else {
        upload.files.forEach(file => form.append('files', file));
        await documentAPI.bulkUpload(form);
      }
      setUpload({ files: [], title: '', category: 'policy', priority: 'normal', busy: false, error: '', success: '' });
      setShowUpload(false);
      load();
      if (role === 'client') {
        showNotice(
          'success',
          'Document uploaded successfully. An auditor will review it, then your document manager will assign it back to you when ready for port clearance.'
        );
      } else {
        showNotice('success', 'Document uploaded successfully.');
      }
    } catch (e) {
      setUpload(p => ({ ...p, busy: false, error: e?.response?.data?.error || 'Upload failed.' }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try { await documentAPI.delete(id); load(); showNotice('success', 'Document deleted.'); }
    catch { showNotice('error', 'Delete failed.'); }
  };

  const handleEdit = async (doc) => {
    const draft = editDraft[doc.id] || {};
    try {
      await documentAPI.update(doc.id, {
        title: draft.title ?? doc.title,
        category: draft.category ?? doc.category,
        description: draft.description ?? doc.description ?? '',
      });
      setEditDraft(p => ({ ...p, [doc.id]: { editing: false } }));
      load();
      showNotice('success', 'Document updated.');
    } catch (e) {
      showNotice('error', e?.response?.data?.error || 'Update failed.');
    }
  };

  const handleReupload = async (doc, file) => {
    if (!file) return;
    try {
      const form = new FormData();
      form.append('file', file);
      await documentAPI.reupload(doc.id, form);
      load();
      showNotice('success', 'File re-uploaded successfully.');
    } catch (e) {
      showNotice('error', e?.response?.data?.error || 'Re-upload failed.');
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
    if (next && !isClient && auditResults[doc.id] === undefined) loadAuditResult(doc.id);
  };

  const handleAnalyze = async (doc) => {
    const scrollEl = getMainScrollEl();
    const scrollTop = scrollEl?.scrollTop ?? 0;

    setExpanded(doc.id);
    setAnalysisMsg(p => ({ ...p, [doc.id]: 'Analyzing...' }));
    try {
      const auditorComment = analysisDraft[doc.id]?.comment || '';
      const res = await analysisAPI.analyzeDocument(doc.id, { auditorComment });
      const risk = res?.analysis?.riskLevel || res?.riskLevel || 'low';
      setAnalysisMsg(p => ({ ...p, [doc.id]: `Audit complete · Risk: ${risk}` }));
      setAnalysisDraft(p => ({ ...p, [doc.id]: { comment: '' } }));
      await loadAuditResult(doc.id);
      await refreshDocument(doc.id);
    } catch {
      setAnalysisMsg(p => ({ ...p, [doc.id]: 'Failed' }));
    } finally {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollEl) scrollEl.scrollTop = scrollTop;
        });
      });
    }
  };

  const handleStatusUpdate = async (doc) => {
    const draft = statusDraft[doc.id] || {};
    const nextStatus = draft.status || doc.status || 'in_review';
    try {
      await documentAPI.updateStatus(doc.id, { status: nextStatus, reason: draft.reason || '' });
      setStatusDraft(p => ({ ...p, [doc.id]: { status: nextStatus, reason: '' } }));
      load();
    } catch (e) {
      showNotice('error', e?.response?.data?.error || 'Status update failed.');
    }
  };

  const hasAuditComplete = (doc) => Boolean(
    doc.metadata?.latestAuditDecision?.updatedBy
    || doc.metadata?.latestComplianceScore != null
    || ['reviewed', 'changes_requested', 'approved', 'rejected'].includes(doc.status)
  );

  const handleDownloadReport = async (doc) => {
    setExportingReportId(doc.id);
    try {
      const res = await analysisAPI.exportReport(doc.id, 'PDF');
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_analysis_${(doc.title || doc.fileName || 'document').replace(/[^a-z0-9_-]+/gi, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showNotice('error', e?.response?.data?.error || 'Could not download analysis report.');
    } finally {
      setExportingReportId(null);
    }
  };

  const handleCreateDocumentRequest = async () => {
    if (!newRequestForm.title.trim()) {
      showNotice('error', 'Please enter a title for your document request.');
      return;
    }
    setSubmittingNewRequest(true);
    try {
      const res = await documentAPI.createClientDocumentRequest({
        title: newRequestForm.title.trim(),
        description: newRequestForm.description.trim() || null,
        category: newRequestForm.category,
        port: newRequestForm.port.trim() || null,
        note: newRequestForm.note.trim() || null,
      });
      setShowNewRequest(false);
      setNewRequestForm({ title: '', description: '', category: 'other', port: '', note: '' });
      setClientSourceFilter('requests');
      showNotice('success', res?.message || 'Document request submitted.');
      load();
    } catch (e) {
      showNotice('error', e?.response?.data?.error || 'Could not submit document request.');
    } finally {
      setSubmittingNewRequest(false);
    }
  };

  const openDocumentRequest = (doc) => {
    setRequestDoc(doc);
    setRequestForm({
      port: doc.magerwaRequestPort || doc.cargoPort || doc.arrivalPort || '',
      note: '',
    });
  };

  const handleDocumentRequest = async () => {
    if (!requestDoc) return;
    setRequestingDocId(requestDoc.id);
    try {
      const res = await documentAPI.requestDocument(requestDoc.id, {
        port: requestForm.port.trim() || null,
        note: requestForm.note.trim() || null,
      });
      setRequestMsg(p => ({ ...p, [requestDoc.id]: res?.message || 'Document request sent.' }));
      setRequestDoc(null);
      load();
    } catch (e) {
      showNotice('error', e?.response?.data?.error || 'Could not submit document request.');
    } finally {
      setRequestingDocId(null);
    }
  };

  const handleDownloadFile = async (doc) => {
    setDownloadingFileId(doc.id);
    try {
      const res = await documentAPI.download(doc.id, { attachment: true });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || doc.title || 'document';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showNotice('error', e?.response?.data?.error || 'Could not download document.');
    } finally {
      setDownloadingFileId(null);
    }
  };

  const role = normalizeRole(user?.role);
  const isOwnerPortal = isOwnerRole(role);
  const isDocumentManager = role === 'document_manager';
  const isClient = role === 'client';
  const isAssignedCargoDoc = (doc) =>
    doc.documentSource === 'assigned'
    || (doc.isAssignedToMe && doc.clientReleasedAt)
    || (doc.isAssignedToMe && !doc.isOwnUpload);
  const isOpenClientRequest = (doc) => {
    if (doc.requestFulfilled || doc.magerwaRequestStatus === 'fulfilled' || doc.clientReleasedAt) return false;
    return Boolean(
      doc.isRequestOnly
      || doc.status === 'requested'
      || doc.needsManagerPreparation
      || (doc.magerwaRequested && !doc.clientReleasedAt)
    );
  };
  const isClientOwnUpload = (doc) => isClient && (doc.documentSource === 'own' || doc.isOwnUpload) && !isAssignedCargoDoc(doc);
  const canRequestDocument = (doc) =>
    isClientOwnUpload(doc) && !doc.clientReleasedAt && doc.magerwaRequestStatus !== 'fulfilled' && !doc.requestFulfilled;
  const clientCanDownload = (doc) =>
    !isClient || (isAssignedCargoDoc(doc) && doc.clientReleasedAt);
  const clientCanEdit = (doc) => !isClient || doc.documentSource !== 'assigned';
  const requestOnlyStatusLabel = (doc) => {
    if (isAssignedCargoDoc(doc) && doc.clientReleasedAt) {
      return { title: 'Document request — ready for cargo', detail: 'Your document has been assigned. Download from Assigned for cargo.', badge: 'Ready', tone: 'emerald' };
    }
    if (doc.needsManagerPreparation) {
      return { title: 'Document request — awaiting preparation', detail: 'Your document manager will prepare this document, send it to the auditor, and assign it to you when approved.', badge: 'Pending prep', tone: 'amber' };
    }
    if (doc.auditState === 'needs_audit' || doc.status === 'in_review') {
      return { title: 'Document request — under audit', detail: 'Your document manager prepared the file and sent it to the auditor. You will be notified when it is assigned to you.', badge: 'Auditing', tone: 'indigo' };
    }
    if (doc.awaitingClientAssignment || doc.managerReviewStatus === 'ready_for_client') {
      return { title: 'Document request — awaiting assignment', detail: 'Audit is complete. Your document manager will assign it to you shortly.', badge: 'Almost ready', tone: 'violet' };
    }
    return { title: 'Document request — in progress', detail: 'Your request is being processed by the document manager and auditor.', badge: 'In progress', tone: 'amber' };
  };
  const assignedCount = docs.filter(isAssignedCargoDoc).length;
  const requestCount = docs.filter(isOpenClientRequest).length;
  const displayDocs = isClient && clientSourceFilter === 'requests'
    ? docs.filter(isOpenClientRequest)
    : isClient && clientSourceFilter === 'assigned'
    ? docs.filter(isAssignedCargoDoc)
    : isClient && clientSourceFilter === 'own'
    ? docs.filter(d => d.documentSource === 'own' && !d.isRequestOnly && !isAssignedCargoDoc(d))
    : docs;
  const pageTitle = isClient ? 'My Documents & Cargo' : isOwnerPortal ? 'My Documents' : 'Document Hub';

  useEffect(() => {
    const documentId = searchParams.get('documentId');
    if (!documentId || loading) return;
    const match = docs.find(d => d.id === documentId);
    if (match) {
      setExpanded(match.id);
      if (match.documentSource === 'assigned' || (match.isAssignedToMe && !match.isOwnUpload)) {
        setClientSourceFilter('assigned');
      }
      const next = new URLSearchParams(searchParams);
      next.delete('documentId');
      setSearchParams(next, { replace: true });
    }
  }, [docs, loading, searchParams, setSearchParams]);

  return (
    <AppShell title={pageTitle}>
      {notice && (
        <div
          className={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm ${
            notice.type === 'success' ? t.success : t.error
          }`}
          role="status"
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className={`mt-0.5 h-5 w-5 flex-shrink-0 ${t.icon}`} />
          ) : (
            <AlertCircle className={`mt-0.5 h-5 w-5 flex-shrink-0 ${t.icon}`} />
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${notice.type === 'success' ? t.successText : t.errorText}`}>
              {notice.type === 'success' ? 'Success' : 'Something went wrong'}
            </p>
            <p className={`mt-0.5 text-xs leading-relaxed ${t.bannerBody}`}>
              {notice.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className={`rounded-lg p-1 ${t.muted} hover:${t.text}`}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {isClient && (
        <div className={`mb-4 rounded-2xl px-5 py-4 ${t.banner}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className={`text-sm font-semibold ${t.bannerTitle}`}>Need a document?</p>
              <p className={`mt-1 text-xs ${t.bannerBody}`}>
                Request a document without uploading. Your document manager will prepare it, send it to the auditor, and assign it to you when ready.
              </p>
            </div>
            <button
              onClick={() => setShowNewRequest(true)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${t.btn}`}
            >
              <Send className="h-4 w-4" /> Request Document
            </button>
          </div>
        </div>
      )}
      {isClient && (
        <div className={`mb-4 rounded-2xl px-5 py-4 ${t.banner}`}>
          <div className="flex items-start gap-3">
            <Package className={`mt-0.5 h-5 w-5 flex-shrink-0 ${t.icon}`} />
            <div>
              <p className={`text-sm font-semibold ${t.bannerTitle}`}>How your documents move through the system</p>
              <ol className={`mt-2 list-decimal space-y-1 pl-4 text-xs ${t.bannerBody}`}>
                <li>Click <strong>Request Document</strong> (no upload required)</li>
                <li>Document manager prepares your document and sends it to the auditor</li>
                <li>Auditor returns it to the document manager</li>
                <li>Manager assigns it to you — download from <strong>Assigned for cargo</strong></li>
              </ol>
            </div>
          </div>
        </div>
      )}
      {isOwnerPortal && !isClient && (
        <p className={`mb-4 text-xs ${t.muted}`}>
          Showing only documents you uploaded. Other users&apos; files are not visible here.
        </p>
      )}
      {/* Drop zone — hidden for viewers */}
      <div
        ref={dropRef}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => setShowUpload(true)}
        className={`mb-5 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? t.dropzoneActive : t.dropzone
        }`}>
        <Upload className={`mx-auto mb-2 h-8 w-8 ${t.icon}`} />
        <p className={`text-sm font-medium ${t.text}`}>Drag & drop files here, or click to upload</p>
        <p className={`mt-1 text-xs ${t.muted}`}>PDF, DOCX, XLSX, images — auto metadata extraction</p>
      </div>

      {/* Client cargo tabs */}
      {isClient && (
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All documents' },
            { key: 'requests', label: `My requests${requestCount ? ` (${requestCount})` : ''}` },
            { key: 'assigned', label: `Assigned for cargo${assignedCount ? ` (${assignedCount})` : ''}` },
            { key: 'own', label: 'My uploads' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setClientSourceFilter(tab.key)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                clientSourceFilter === tab.key ? t.tabActive : t.tabIdle
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Auditor queue tabs */}
      {isAuditorView && (
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: 'needs_audit', label: 'Needs Audit' },
            { key: 'audited', label: 'Audited' },
            { key: 'all', label: 'All Documents' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setAuditFilter(tab.key)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                auditFilter === tab.key ? t.tabActive : t.tabIdle
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Document list */}
      <div className={`overflow-hidden ${t.card}`}>
        <div className={`flex items-center justify-between border-b px-5 py-4 ${t.borderSoft}`}>
          <h2 className={`text-sm font-semibold ${t.text}`}>
            {isAuditorView && auditFilter === 'needs_audit' ? 'Documents needing audit' : isAuditorView && auditFilter === 'audited' ? 'Audited documents' : 'Documents'} ({displayDocs.length})
          </h2>
          <button onClick={load} className={`rounded-lg border p-1.5 ${t.btnSecondary}`}>
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className={`p-10 text-center text-sm ${t.muted}`}>Loading...</div>
        ) : displayDocs.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className={`mx-auto mb-3 h-10 w-10 ${t.icon}`} />
            <p className={`text-sm ${t.muted}`}>
              {isClient && clientSourceFilter === 'requests'
                ? 'No document requests yet. Click Request Document above — no upload needed.'
                : isAuditorView && auditFilter === 'needs_audit'
                ? 'No documents need audit right now.'
                : isAuditorView && auditFilter === 'audited'
                ? 'No audited documents yet.'
                : isClient && clientSourceFilter === 'assigned'
                ? 'No cargo documents assigned yet. Your document manager will send audited documents here when ready for port clearance.'
                : 'No documents yet. Upload your first file above.'}
            </p>
          </div>
        ) : (
          <div className={`divide-y ${t.divider}`}>
            {displayDocs.map(doc => (
              <div key={doc.id}>
                {doc.isRequestOnly && !isAssignedCargoDoc(doc) && (() => {
                  const st = requestOnlyStatusLabel(doc);
                  return (
                  <div className={`border-b px-5 py-3 ${t.banner} ${t.borderSoft}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className={`text-xs font-semibold ${t.bannerTitle}`}>{st.title}</p>
                        <p className={`mt-0.5 text-[11px] ${t.bannerBody}`}>{st.detail}</p>
                        {doc.magerwaRequestPort && (
                          <p className={`mt-1 text-[10px] ${t.muted}`}>Port: {doc.magerwaRequestPort}</p>
                        )}
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${t.pill}`}>{st.badge}</span>
                    </div>
                  </div>
                  );
                })()}
                {isClientOwnUpload(doc) && !doc.isRequestOnly && (
                  <div className={`border-b px-5 py-3 ${t.banner} ${t.borderSoft}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${t.bannerTitle}`}>Your upload — request your document</p>
                        <p className={`mt-0.5 text-[11px] ${t.bannerBody}`}>
                          {doc.magerwaRequestStatus === 'pending'
                            ? 'Your document request is pending. The auditor and document manager will process it and assign it to you.'
                            : doc.magerwaRequestStatus === 'fulfilled' || doc.clientReleasedAt
                            ? 'Your document is ready. Open Assigned for cargo to download.'
                            : 'Click Request Document to ask for the audited and approved file. You cannot download until it is assigned to you.'}
                        </p>
                      </div>
                      {canRequestDocument(doc) && (
                        <button
                          onClick={() => openDocumentRequest(doc)}
                          disabled={requestingDocId === doc.id || doc.magerwaRequestStatus === 'pending'}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60 ${t.btn}`}
                        >
                          <Send className="h-3.5 w-3.5" />
                          {requestingDocId === doc.id
                            ? 'Sending…'
                            : doc.magerwaRequestStatus === 'pending'
                            ? 'Request pending'
                            : 'Request Document'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {isAssignedCargoDoc(doc) && (
                  <div className={`border-b px-5 py-3 ${t.banner} ${t.borderSoft}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${t.bannerTitle}`}>Assigned for cargo clearance</p>
                        <p className={`mt-0.5 text-[11px] ${t.bannerBody}`}>
                          {doc.cargoPort || doc.arrivalPort
                            ? <>Present at <span className="font-semibold">{doc.cargoPort || doc.arrivalPort}</span> to receive cargo</>
                            : 'Download and take this document to Magerwa or the port to receive your cargo'}
                        </p>
                        {doc.assignmentNote && (
                          <p className={`mt-1 text-[10px] ${t.muted}`}>Note: {doc.assignmentNote}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleDownloadFile(doc)}
                          disabled={downloadingFileId === doc.id}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60 ${t.btn}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                          {downloadingFileId === doc.id ? 'Downloading…' : 'Download for port'}
                        </button>
                        {hasAuditComplete(doc) && !isClient && (
                          <button
                            onClick={() => handleDownloadReport(doc)}
                            disabled={exportingReportId === doc.id}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60 ${t.btnSecondary}`}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {exportingReportId === doc.id ? 'Generating…' : 'Audit report'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${t.rowHover}`}>
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${t.iconWrap}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`truncate text-sm font-medium ${t.text}`}>{doc.title || doc.fileName}</p>
                      {doc.isRequestOnly && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.pill}`}>Request</span>
                      )}
                      {isAssignedCargoDoc(doc) && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.pill}`}>Cargo</span>
                      )}
                      {doc.magerwaRequested && doc.magerwaRequestStatus === 'pending' && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.pillSoft}`}>Requested</span>
                      )}
                      {doc.magerwaRequestStatus === 'fulfilled' && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.pill}`}>Assigned</span>
                      )}
                      {(doc.cargoPort || doc.arrivalPort) && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${t.pillSoft}`}>
                          <Ship className="h-3 w-3" /> {doc.cargoPort || doc.arrivalPort}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${t.muted}`}>
                      {doc.category}
                      {doc.createdAt ? ` · ${new Date(doc.createdAt).toLocaleDateString()}` : ''}
                      {isAssignedCargoDoc(doc) && doc.assignedAt ? ` · Assigned ${new Date(doc.assignedAt).toLocaleDateString()}` : ''}
                    </p>
                    {requestMsg[doc.id] && (
                      <p className={`mt-0.5 text-[10px] ${t.icon}`}>{requestMsg[doc.id]}</p>
                    )}
                    {analysisMsg[doc.id] && (
                      <p className={`mt-0.5 text-[10px] ${t.icon}`}>{analysisMsg[doc.id]}</p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusPill(doc.status, isDarkMode)}`}>
                    {doc.status || 'uploaded'}
                  </span>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {!doc.isRequestOnly && (
                    <button onClick={() => setViewerDoc(doc)}
                      className={`rounded-lg p-1.5 ${t.muted} hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-200`} title="View Document">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    )}
                    <button onClick={() => toggleExpanded(doc)}
                      className={`rounded-lg p-1.5 ${t.muted} hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-200`} title="Details">
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    {canRequestDocument(doc) && (
                      <button
                        onClick={() => openDocumentRequest(doc)}
                        disabled={requestingDocId === doc.id || doc.magerwaRequestStatus === 'pending'}
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold disabled:opacity-50 ${t.btnSecondary}`}
                        title="Request Document"
                      >
                        <Send className="h-3 w-3" />
                        {doc.magerwaRequestStatus === 'pending' ? 'Requested' : 'Request Document'}
                      </button>
                    )}
                    {role === 'auditor' && (
                    <button onClick={() => handleAnalyze(doc)}
                      className={`rounded-lg p-1.5 ${t.muted} hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-200`} title="AI Analyze">
                      <Bot className="h-3.5 w-3.5" />
                    </button>
                    )}
                    {clientCanDownload(doc) && (
                    <button
                      onClick={() => handleDownloadFile(doc)}
                      disabled={downloadingFileId === doc.id}
                      className={`rounded-lg p-1.5 disabled:opacity-50 ${t.muted} hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-200`}
                      title="Download document file"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    )}
                    {hasAuditComplete(doc) && !isClient && (
                    <button
                      onClick={() => handleDownloadReport(doc)}
                      disabled={exportingReportId === doc.id}
                      className={`rounded-lg p-1.5 disabled:opacity-50 ${t.muted} hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-200`}
                      title="Download audit analysis report"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    )}
                    {clientCanEdit(doc) && (
                    <>
                    <button onClick={() => setEditDraft(p => ({ ...p, [doc.id]: { editing: true, title: doc.title || '', category: doc.category || 'policy', description: doc.description || '' } }))}
                      className={`rounded-lg p-1.5 ${t.muted} hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-200`} title="Edit">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(doc.id)}
                      className={`rounded-lg p-1.5 ${t.muted} hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-200`} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    </>
                    )}
                  </div>
                </div>
                {/* Expanded metadata */}
                {expanded === doc.id && (
                  <div className={`px-5 pb-3 ${t.panel} border-t ${t.borderSoft}`}>
                    <div className="grid grid-cols-2 gap-2 pt-3 text-xs sm:grid-cols-4">
                      {[
                        ['File', doc.fileName || '—'],
                        ['Format', doc.fileFormat || '—'],
                        ['Size', doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : '—'],
                        ['Text extraction', getProcessingStatus(doc)],
                        ['Uploader', getUploaderLabel(doc)],
                        ...(doc.cargoPort || doc.arrivalPort ? [['Port / Magerwa', doc.cargoPort || doc.arrivalPort]] : []),
                        ...(isAssignedCargoDoc(doc) && doc.assignedAt ? [['Assigned', new Date(doc.assignedAt).toLocaleString()]] : []),
                      ].map(([k, v]) => (
                        <div key={k} className={`rounded-lg border p-2 ${t.borderSoft} ${t.panel}`}>
                          <p className={`${t.muted} mb-0.5`}>{k}</p>
                          <p className={`${t.text} font-medium truncate`}>{v}</p>
                        </div>
                      ))}
                    </div>
                    {doc.description && (
                      <p className={`mt-2 rounded-lg border p-2 text-xs ${t.sub} ${t.borderSoft} ${t.panel}`}>{doc.description}</p>
                    )}
                    {editDraft[doc.id]?.editing && (
                      <div className={`mt-3 rounded-lg border p-3 ${t.borderSoft} ${t.panel}`}>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input value={editDraft[doc.id]?.title || ''} onChange={e => setEditDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), title: e.target.value } }))}
                            className={`px-2 py-2 text-xs ${t.inputSm}`} placeholder="Title" />
                          <select value={editDraft[doc.id]?.category || 'policy'} onChange={e => setEditDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), category: e.target.value } }))}
                            className={`px-2 py-2 text-xs ${t.inputSm}`}>
                            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input value={editDraft[doc.id]?.description || ''} onChange={e => setEditDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), description: e.target.value } }))}
                            className={`px-2 py-2 text-xs ${t.inputSm}`} placeholder="Description" />
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => handleEdit(doc)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${t.btn}`}>Save Changes</button>
                          <button onClick={() => setEditDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), editing: false } }))} className={`rounded-lg px-3 py-2 text-xs ${t.btnSecondary}`}>Cancel</button>
                        </div>
                      </div>
                    )}
                    {['rejected', 'changes_requested'].includes(doc.status) && (
                      <div className={`mt-3 rounded-lg p-3 ${t.banner}`}>
                        <label className={`mb-2 block text-xs font-semibold ${t.bannerTitle}`}>Re-upload corrected document</label>
                        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.odt,.txt,.csv,.tsv,.md,.json,.log,.html,.htm,.xml,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tif,.tiff,image/*"
                          onChange={e => handleReupload(doc, e.target.files?.[0])}
                          className={`w-full px-2 py-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-2 file:py-1 file:text-white ${t.inputSm}`} />
                      </div>
                    )}
                    {doc.metadata?.statusReason && !isClient && (
                      <p className={`mt-2 rounded-lg border p-2 text-xs ${t.banner} ${t.bannerTitle}`}>Auditor note: {doc.metadata.statusReason}</p>
                    )}
                    {!isClient && (doc.metadata?.latestComplianceScore != null || doc.metadata?.latestAiGeneratedPercentage != null) && (
                      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                        <div className={`rounded-lg border p-2 ${t.borderSoft} ${t.panel}`}>
                          <p className={`mb-0.5 ${t.muted}`}>Audit score</p>
                          <p className={`font-semibold ${t.text}`}>{doc.metadata?.latestComplianceScore ?? '-'} / 100</p>
                        </div>
                        <div className={`rounded-lg border p-2 ${t.borderSoft} ${t.panel}`}>
                          <p className={`mb-0.5 ${t.muted}`}>AI-written content</p>
                          <p className={`font-semibold ${t.icon}`}>
                            {doc.metadata?.latestAiGeneratedPercentage ?? 0}% / 25%
                          </p>
                        </div>
                        <div className={`rounded-lg border p-2 ${t.borderSoft} ${t.panel}`}>
                          <p className={`mb-0.5 ${t.muted}`}>Decision</p>
                          <p className={`font-semibold capitalize ${t.sub}`}>{doc.metadata?.latestAuditDecision?.status?.replace(/_/g, ' ') || doc.status}</p>
                        </div>
                      </div>
                    )}
                    {!isClient && (
                    <div className={`mt-3 rounded-lg border p-3 ${t.borderSoft} ${t.panel}`}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold ${t.text}`}>Audit results</p>
                        {auditLoading[doc.id] && <p className={`text-[10px] ${t.muted}`}>Loading...</p>}
                      </div>
                      {auditResults[doc.id]?.error ? (
                        <p className={`text-xs ${t.errorText}`}>{auditResults[doc.id].error}</p>
                      ) : auditResults[doc.id] ? (
                        <div className="space-y-3 text-xs">
                          {auditResults[doc.id].auditorComment && (
                            <p className={`rounded-lg border p-2 ${t.banner} ${t.bannerBody}`}>
                              Auditor comment: {auditResults[doc.id].auditorComment}
                            </p>
                          )}
                          {auditResults[doc.id].summary && (
                            <p className={`rounded-lg border p-2 ${t.borderSoft} ${t.panel} ${t.sub}`}>{auditResults[doc.id].summary}</p>
                          )}
                          <div className="grid gap-2 sm:grid-cols-4">
                            <div className={`rounded-lg border p-2 ${t.borderSoft} ${t.panel}`}>
                              <p className={`mb-0.5 ${t.muted}`}>Score</p>
                              <p className={`font-semibold ${t.text}`}>{auditResults[doc.id].results?.compliance_score ?? '-'} / 100</p>
                            </div>
                            <div className={`rounded-lg border p-2 ${t.borderSoft} ${t.panel}`}>
                              <p className={`mb-0.5 ${t.muted}`}>Risk</p>
                              <p className={`font-semibold capitalize ${t.sub}`}>{auditResults[doc.id].riskLevel || auditResults[doc.id].results?.risk_level || 'low'}</p>
                            </div>
                            <div className={`rounded-lg border p-2 ${t.borderSoft} ${t.panel}`}>
                              <p className={`mb-0.5 ${t.muted}`}>AI-written</p>
                              <p className={`font-semibold ${t.text}`}>{auditResults[doc.id].results?.ai_generated_percentage ?? 0}%</p>
                            </div>
                            <div className={`rounded-lg border p-2 ${t.borderSoft} ${t.panel}`}>
                              <p className={`mb-0.5 ${t.muted}`}>Analyzed</p>
                              <p className={`font-semibold ${t.text}`}>{auditResults[doc.id].analyzedAt ? new Date(auditResults[doc.id].analyzedAt).toLocaleDateString() : '-'}</p>
                            </div>
                          </div>
                          {auditResults[doc.id].results?.violations?.length > 0 && (
                            <div>
                              <p className={`mb-1 font-semibold ${t.bannerTitle}`}>Violations</p>
                              <ul className={`space-y-1 ${t.sub}`}>
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
                              <p className={`mb-1 font-semibold ${t.bannerTitle}`}>Missing fields</p>
                              <p className={`${t.sub}`}>{auditResults[doc.id].results.missing_fields.join(', ')}</p>
                            </div>
                          )}
                          {auditResults[doc.id].recommendations?.length > 0 && (
                            <div>
                              <p className={`mb-1 font-semibold ${t.bannerTitle}`}>Recommendations</p>
                              <ul className={`space-y-1 ${t.sub}`}>
                                {auditResults[doc.id].recommendations.slice(0, 5).map((item, i) => <li key={i}>- {item}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className={`text-xs ${t.muted}`}>No audit result is available yet.</p>
                      )}
                    </div>
                    )}
                    {role === 'auditor' && (
                      <div className={`mt-3 rounded-lg border p-3 ${t.borderSoft} ${t.panel}`}>
                        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input
                            value={analysisDraft[doc.id]?.comment || ''}
                            onChange={e => setAnalysisDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), comment: e.target.value } }))}
                            placeholder="Optional audit comment for the document owner"
                            className={`px-2 py-2 text-xs ${t.inputSm}`} />
                          <button onClick={() => handleAnalyze(doc)}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold ${t.btn}`}>
                            Run Audit & Notify
                          </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                          <select
                            value={statusDraft[doc.id]?.status || doc.status || 'in_review'}
                            onChange={e => setStatusDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), status: e.target.value } }))}
                            className={`px-2 py-2 text-xs ${t.inputSm}`}>
                            {AUDIT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                          </select>
                          <input
                            value={statusDraft[doc.id]?.reason || ''}
                            onChange={e => setStatusDraft(p => ({ ...p, [doc.id]: { ...(p[doc.id] || {}), reason: e.target.value } }))}
                            placeholder="Reason or note for document owner"
                            className={`px-2 py-2 text-xs ${t.inputSm}`} />
                          <button onClick={() => handleStatusUpdate(doc)}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold ${t.btn}`}>
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

      {/* New document request (no upload) */}
      {showNewRequest && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${t.overlay}`}>
          <div className={`w-full max-w-md p-6 ${t.modal}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className={`text-base font-semibold ${t.text}`}>Request Document</h3>
                <p className={`mt-1 text-xs ${t.muted}`}>No upload needed — describe what you need</p>
              </div>
              <button onClick={() => setShowNewRequest(false)}><X className={`h-5 w-5 ${t.muted}`} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={`mb-1.5 block text-xs ${t.muted}`}>Document title *</label>
                <input
                  value={newRequestForm.title}
                  onChange={e => setNewRequestForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Bill of Lading for Container ABC123"
                  className={`w-full px-3 py-2.5 text-sm ${t.input}`}
                />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs ${t.muted}`}>Category</label>
                <select
                  value={newRequestForm.category}
                  onChange={e => setNewRequestForm(p => ({ ...p, category: e.target.value }))}
                  className={`w-full px-3 py-2.5 text-sm ${t.input}`}
                >
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={`mb-1.5 block text-xs ${t.muted}`}>Description (optional)</label>
                <textarea
                  value={newRequestForm.description}
                  onChange={e => setNewRequestForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder="What document do you need?"
                  className={`w-full px-3 py-2.5 text-sm ${t.input}`}
                />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs ${t.muted}`}>Port / location (optional)</label>
                <input
                  value={newRequestForm.port}
                  onChange={e => setNewRequestForm(p => ({ ...p, port: e.target.value }))}
                  placeholder="e.g. Magerwa, Mombasa Port"
                  className={`w-full px-3 py-2.5 text-sm ${t.input}`}
                />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs ${t.muted}`}>Note (optional)</label>
                <textarea
                  value={newRequestForm.note}
                  onChange={e => setNewRequestForm(p => ({ ...p, note: e.target.value }))}
                  rows={2}
                  placeholder="Container number, cargo details, urgency…"
                  className={`w-full px-3 py-2.5 text-sm ${t.input}`}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCreateDocumentRequest}
                  disabled={submittingNewRequest}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 ${t.btn}`}
                >
                  <Send className="h-4 w-4" />
                  {submittingNewRequest ? 'Submitting…' : 'Submit Request'}
                </button>
                <button onClick={() => setShowNewRequest(false)} className={`rounded-xl px-4 py-2.5 text-sm ${t.btnSecondary}`}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Document modal (for uploaded doc) */}
      {requestDoc && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${t.overlay}`}>
          <div className={`w-full max-w-md p-6 ${t.modal}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className={`text-base font-semibold ${t.text}`}>Request Document</h3>
                <p className={`mt-1 text-xs ${t.muted}`}>{requestDoc.title || requestDoc.fileName}</p>
              </div>
              <button onClick={() => setRequestDoc(null)}><X className={`h-5 w-5 ${t.muted}`} /></button>
            </div>
            <p className={`mb-4 text-xs ${t.bannerBody}`}>
              Submit a request for this document. The auditor will review it and the document manager will assign the approved file to you when ready.
            </p>
            <div className="space-y-3">
              <div>
                <label className={`mb-1.5 block text-xs ${t.muted}`}>Port / location (optional)</label>
                <input
                  value={requestForm.port}
                  onChange={e => setRequestForm(p => ({ ...p, port: e.target.value }))}
                  placeholder="e.g. Magerwa, Mombasa Port"
                  className={`w-full px-3 py-2.5 text-sm ${t.input}`}
                />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs ${t.muted}`}>Note (optional)</label>
                <textarea
                  value={requestForm.note}
                  onChange={e => setRequestForm(p => ({ ...p, note: e.target.value }))}
                  rows={3}
                  placeholder="Any details for the document manager"
                  className={`w-full px-3 py-2.5 text-sm ${t.input}`}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleDocumentRequest}
                  disabled={requestingDocId === requestDoc.id}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 ${t.btn}`}
                >
                  <Send className="h-4 w-4" />
                  {requestingDocId === requestDoc.id ? 'Sending…' : 'Request Document'}
                </button>
                <button
                  onClick={() => setRequestDoc(null)}
                  className={`rounded-xl px-4 py-2.5 text-sm ${t.btnSecondary}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${t.overlay}`}>
          <div className={`w-full max-w-md p-6 ${t.modal}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`text-base font-semibold ${t.text}`}>Upload Document</h3>
              <button onClick={() => setShowUpload(false)}><X className={`h-5 w-5 ${t.muted}`} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={`mb-1.5 block text-xs ${t.muted}`}>File *</label>
                <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.odt,.txt,.csv,.tsv,.md,.json,.log,.html,.htm,.xml,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tif,.tiff,image/*"
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    setUpload(p => ({ ...p, files, title: files.length === 1 ? files[0].name : '' }));
                  }}
                  className={`w-full px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-2 file:py-1 file:text-xs file:text-white ${t.input}`} />
                {upload.files.length > 0 && <p className={`mt-1 text-[10px] ${t.muted}`}>{upload.files.length} file{upload.files.length > 1 ? 's' : ''} selected</p>}
              </div>
              <div>
                <label className={`mb-1.5 block text-xs ${t.muted}`}>Title</label>
                <input value={upload.title} onChange={e => setUpload(p => ({ ...p, title: e.target.value }))}
                  placeholder="Leave blank to use filename"
                  className={`w-full px-3 py-2.5 text-sm ${t.input}`} />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs ${t.muted}`}>Category</label>
                <select value={upload.category} onChange={e => setUpload(p => ({ ...p, category: e.target.value }))}
                  className={`w-full px-3 py-2.5 text-sm ${t.input}`}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {isDocumentManager && (
                <div>
                  <label className={`mb-1.5 block text-xs ${t.muted}`}>Audit priority</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'normal', label: 'Normal', hint: 'Standard review queue' },
                      { key: 'urgent', label: 'Urgent', hint: 'Notify auditors immediately' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setUpload(p => ({ ...p, priority: opt.key }))}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          upload.priority === opt.key
                            ? opt.key === 'urgent'
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-blue-500 bg-blue-100 text-blue-900 dark:bg-blue-500/25 dark:text-blue-50'
                            : `${t.btnSecondary}`
                        }`}
                      >
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-[10px] opacity-80">{opt.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {upload.error && <p className={`text-xs ${t.errorText}`}>{upload.error}</p>}
              <button onClick={handleUpload} disabled={upload.busy}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 ${t.btn}`}>
                <Upload className="h-4 w-4" /> {upload.busy ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Document Viewer */}
      {viewerDoc && (
        <DocumentViewer
          doc={viewerDoc}
          onClose={() => setViewerDoc(null)}
          onNotify={showNotice}
        />
      )}
    </AppShell>
  );
}
