import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Bell, CheckCircle2, Clock, Download, FileText, Phone, RefreshCw,
  Ship, Upload, UserPlus, X, AlertCircle, Search,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import AnnotatedDocumentPreview from '../components/AnnotatedDocumentPreview';
import { authAPI, documentAPI, analysisAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

const FILTERS = [
  { key: 'all', label: 'All Documents' },
  { key: 'needs_preparation', label: 'Prepare Request' },
  { key: 'client_uploads', label: 'Client Uploads' },
  { key: 'magerwa_requests', label: 'Document Requests' },
  { key: 'needs_audit', label: 'Send to Auditor' },
  { key: 'ready_for_client', label: 'Assign to Client' },
  { key: 'needs_correction', label: 'Needs Correction' },
  { key: 'audited', label: 'Audited' },
  { key: 'urgent', label: 'Urgent' },
];

const STATUS_PILL = {
  approved: 'bg-blue-600/15 text-blue-400',
  changes_requested: 'bg-red-500/15 text-red-400',
  rejected: 'bg-red-500/15 text-red-400',
  in_progress: 'bg-blue-600/15 text-blue-400',
  reviewed: 'bg-purple-500/15 text-purple-400',
};

const AUDIT_PILL = {
  needs_audit: 'bg-blue-600/15 text-blue-400 border-blue-400/30',
  audited: 'bg-blue-600/15 text-blue-400 border-blue-400/30',
  pending: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  pending_preparation: 'bg-blue-600/15 text-blue-400 border-blue-400/30',
};

function AuditBadge({ state }) {
  const label = state === 'needs_audit'
    ? 'Needs audit'
    : state === 'audited'
    ? 'Audited'
    : state === 'pending_preparation'
    ? 'Awaiting prep'
    : 'Pending';
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${AUDIT_PILL[state] || AUDIT_PILL.pending}`}>
      {label}
    </span>
  );
}

export default function DocumentManagementPage() {
  const { isDarkMode } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const [summary, setSummary] = useState({ total: 0, needsAudit: 0, neverAudited: 0, urgent: 0, audited: 0, clientUploads: 0, awaitingAssignment: 0 });
  const [documents, setDocuments] = useState([]);
  const [highlightDocId, setHighlightDocId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [notifyDoc, setNotifyDoc] = useState(null);
  const [notifyForm, setNotifyForm] = useState({ urgent: false, port: '', note: '' });
  const [assignDoc, setAssignDoc] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [assignNote, setAssignNote] = useState('');
  const [assignPort, setAssignPort] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const [reviewDoc, setReviewDoc] = useState(null);
  const [correctionFile, setCorrectionFile] = useState(null);
  const [prepareDoc, setPrepareDoc] = useState(null);
  const [prepareFile, setPrepareFile] = useState(null);
  const [prepareNote, setPrepareNote] = useState('');

  const card = isDarkMode ? 'bg-[#122a45] border-blue-400/25' : 'bg-white border-blue-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-slate-900';
  const sub = isDarkMode ? 'text-blue-200/70' : 'text-slate-600';
  const inputCls = isDarkMode
    ? 'border-blue-400/30 bg-[#0b1a2e] text-white placeholder-blue-300/50'
    : 'border-blue-200 bg-white text-slate-900 placeholder-slate-400';

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await documentAPI.getManagement({ filter, limit: 100 });
      setSummary(res?.summary || { total: 0, needsAudit: 0, neverAudited: 0, urgent: 0, audited: 0 });
      setDocuments(res?.documents || []);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Could not load documents.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const loadClients = useCallback(async () => {
    try {
      const res = await documentAPI.getAssignableClients();
      setClients(res?.clients || []);
    } catch {
      try {
        const res = await authAPI.listUsers({ role: 'client', limit: 500 });
        setClients((res?.users || []).filter(u => u.isActive !== false && (u.role === 'client' || u.role === 'viewer')));
      } catch {
        setClients([]);
      }
    }
  }, []);

  // Prefetch all clients so assign modal always has the full list
  useEffect(() => { loadClients(); }, [loadClients]);

  useEffect(() => {
    const urlFilter = searchParams.get('filter');
    if (!urlFilter || !FILTERS.some(f => f.key === urlFilter)) return;
    setFilter(urlFilter);
    const next = new URLSearchParams(searchParams);
    next.delete('filter');
    setSearchParams(next, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const documentId = searchParams.get('documentId');
    if (!documentId || loading) return;
    setHighlightDocId(documentId);
    const match = documents.find(d => d.id === documentId);
    if (match?.awaitingClientAssignment && ['approved', 'reviewed'].includes(match.status)) {
      setFilter('ready_for_client');
    }
    const next = new URLSearchParams(searchParams);
    next.delete('documentId');
    setSearchParams(next, { replace: true });
    const t = setTimeout(() => setHighlightDocId(null), 8000);
    return () => clearTimeout(t);
  }, [documents, loading, searchParams, setSearchParams]);

  const openNotify = (doc) => {
    if (doc.auditState === 'audited') return;
    // Only one panel at a time — close assign / prepare when opening notify
    setAssignDoc(null);
    setPrepareDoc(null);
    setNotifyDoc(doc);
    setNotifyForm({
      urgent: Boolean(doc.isUrgent),
      port: doc.arrivalPort || '',
      note: doc.neverAudited
        ? 'This document has not been audited yet. Please complete the audit.'
        : '',
    });
    setMsg('');
    setErr('');
  };

  const openAssign = async (doc) => {
    setNotifyDoc(null);
    setPrepareDoc(null);
    setAssignDoc(doc);
    const uploaderIsClient = doc.isClientUpload || doc.uploader?.role === 'client' || doc.isRequestOnly;
    const preselect = doc.assignedClientIds?.length
      ? doc.assignedClientIds
      : (uploaderIsClient && doc.uploadedBy ? [doc.uploadedBy] : []);
    setSelectedClients(preselect);
    setAssignNote('');
    setAssignPort(doc.cargoPort || doc.arrivalPort || '');
    setClientSearch('');
    setMsg('');
    setErr('');
    await loadClients();
  };

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c => {
      const haystack = [c.fullName, c.email, c.phone, c.department].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, clientSearch]);

  const handleQuickSelectClient = (e) => {
    const id = e.target.value;
    if (!id) return;
    setSelectedClients(prev => (prev.includes(id) ? prev : [...prev, id]));
    e.target.value = '';
  };

  const openPrepare = (doc) => {
    setNotifyDoc(null);
    setAssignDoc(null);
    setPrepareDoc(doc);
    setPrepareFile(null);
    setPrepareNote('');
    setMsg('');
    setErr('');
  };

  const handleFulfillRequest = async () => {
    if (!prepareDoc || !prepareFile) {
      setErr('Select a file to upload for this client request.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const form = new FormData();
      form.append('file', prepareFile);
      if (prepareNote.trim()) form.append('note', prepareNote.trim());
      const res = await documentAPI.fulfillClientRequest(prepareDoc.id, form);
      setMsg(res?.message || 'Document prepared and sent to auditor.');
      setPrepareDoc(null);
      setPrepareFile(null);
      setPrepareNote('');
      load();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to prepare document.');
    } finally {
      setBusy(false);
    }
  };

  const handleNotify = async () => {
    if (!notifyDoc) return;
    setBusy(true);
    setErr('');
    try {
      const res = await documentAPI.requestAudit(notifyDoc.id, {
        urgent: notifyForm.urgent,
        port: notifyForm.port.trim() || null,
        note: notifyForm.note.trim() || null,
      });
      setMsg(res?.message || 'Auditors notified.');
      setNotifyDoc(null);
      load();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to notify auditors.');
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!assignDoc || !selectedClients.length) return;
    setBusy(true);
    setErr('');
    try {
      const res = await documentAPI.assignToClients(assignDoc.id, {
        clientIds: selectedClients,
        note: assignNote.trim() || null,
        port: assignPort.trim() || null,
      });
      setMsg(res?.message || 'Document assigned to client(s). Any related client request was cleared automatically.');
      setAssignDoc(null);
      loadClients();
      load();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to assign document.');
    } finally {
      setBusy(false);
    }
  };

  const toggleClient = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
  };

  const handleDownloadMarkedDocument = async (doc) => {
    setExportingId(doc.id);
    setErr('');
    try {
      const res = await documentAPI.downloadMarked(doc.id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marked_${(doc.title || doc.fileName || 'document').replace(/[^a-z0-9_-]+/gi, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('Marked document PDF downloaded — red ✕ marks show mistakes on the file.');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Could not download marked document.');
    } finally {
      setExportingId(null);
    }
  };

  const handleDownloadAnnotatedReport = async (doc) => {
    setExportingId(doc.id);
    setErr('');
    try {
      const res = await analysisAPI.exportReport(doc.id, 'ANNOTATED');
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `annotated_audit_${(doc.title || doc.fileName || 'document').replace(/[^a-z0-9_-]+/gi, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Annotated audit report (red marks) downloaded for "${doc.title || doc.fileName}".`);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Could not download annotated report.');
    } finally {
      setExportingId(null);
    }
  };

  const handleSubmitCorrection = async () => {
    if (!reviewDoc || !correctionFile) return;
    setBusy(true);
    setErr('');
    try {
      const form = new FormData();
      form.append('file', correctionFile);
      const res = await documentAPI.submitCorrection(reviewDoc.id, form);
      setMsg(res?.message || 'Corrected document uploaded.');
      setReviewDoc(null);
      setCorrectionFile(null);
      load();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to upload corrected document.');
    } finally {
      setBusy(false);
    }
  };

  const openReview = (doc) => {
    setReviewDoc(doc);
    setCorrectionFile(null);
    setMsg('');
    setErr('');
  };

  const canAssignToClient = (doc) =>
    doc.awaitingClientAssignment
    && ['approved', 'reviewed'].includes(doc.status)
    && doc.managerReviewStatus !== 'released_to_client'
    && doc.managerReviewStatus !== 'needs_correction';

  const handleDownloadReport = async (doc) => {
    setExportingId(doc.id);
    setErr('');
    try {
      const res = await analysisAPI.exportReport(doc.id, 'PDF');
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_analysis_${(doc.title || doc.fileName || 'document').replace(/[^a-z0-9_-]+/gi, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Analysis report downloaded for "${doc.title || doc.fileName}".`);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Could not download analysis report.');
    } finally {
      setExportingId(null);
    }
  };

  const handleFlagUpdate = async (doc, patch) => {
    try {
      await documentAPI.update(doc.id, patch);
      load();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Could not update document flags.');
    }
  };

  const statCards = [
    { label: 'Total documents', value: summary.total, icon: FileText, tone: 'text-blue-400', filterKey: 'all' },
    { label: 'Prepare request', value: summary.needsPreparation || 0, icon: Upload, tone: 'text-blue-400', filterKey: 'needs_preparation' },
    { label: 'Client uploads', value: summary.clientUploads || 0, icon: UserPlus, tone: 'text-blue-400', filterKey: 'client_uploads' },
    { label: 'Awaiting assignment', value: summary.awaitingAssignment || 0, icon: CheckCircle2, tone: 'text-violet-400', filterKey: 'ready_for_client' },
    { label: 'Needs audit', value: summary.needsAudit, icon: Clock, tone: 'text-blue-400', filterKey: 'needs_audit' },
  ];

  const canNotifyAuditors = (doc) => doc.auditState !== 'audited' && !doc.needsManagerPreparation;
  const isAudited = (doc) => doc.auditState === 'audited';

  return (
    <AppShell title="Document Management">
      <p className={`mb-5 text-sm ${sub}`}>
        After the auditor returns an approved document, open <strong>Assign to Client</strong>, pick any client
        from the full client list, and assign it for Magerwa receiving-point cargo clearance.
      </p>

      {(summary.awaitingAssignment > 0 || clients.length > 0) && (
        <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${isDarkMode ? 'border-blue-400/30 bg-blue-500/15' : 'border-blue-200 bg-blue-50'}`}>
          <div>
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
              {summary.awaitingAssignment || 0} document(s) ready to assign · {clients.length} client(s) available
            </p>
            <p className={`mt-0.5 text-xs ${isDarkMode ? 'text-blue-200/70' : 'text-blue-700/80'}`}>
              You can assign returned documents to any active client account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFilter('ready_for_client')}
            className="rounded-xl bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-600"
          >
            View assign queue
          </button>
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map(item => (
          <button
            key={item.label}
            type="button"
            onClick={() => item.filterKey && setFilter(item.filterKey)}
            className={`rounded-2xl border p-4 text-left transition-colors ${card} ${isDarkMode ? 'hover:border-white/20' : 'hover:border-gray-300'}`}
          >
            <div className="flex items-center justify-between">
              <item.icon className={`h-5 w-5 ${item.tone}`} />
              <p className={`text-2xl font-bold ${text}`}>{item.value}</p>
            </div>
            <p className={`mt-2 text-xs ${sub}`}>{item.label}</p>
          </button>
        ))}
      </div>

      <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${card}`}>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading}
          className={`rounded-xl border p-2 ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-400 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {msg && <div className="mb-4 rounded-xl border border-blue-400/30 bg-blue-600/10 px-4 py-2 text-xs text-blue-400">{msg}</div>}
      {err && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-400">{err}</div>}

      <div className={`overflow-hidden rounded-2xl border ${card}`}>
        <div className={`border-b px-5 py-4 ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
          <h2 className={`text-sm font-semibold ${text}`}>
            {FILTERS.find(f => f.key === filter)?.label || 'Documents'} ({documents.length})
            {filter !== 'all' && summary.total > 0 && (
              <span className={`ml-2 font-normal ${sub}`}>· {summary.total} total in system</span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className={`p-10 text-center text-sm ${sub}`}>Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="p-10 text-center">
            {filter === 'ready_for_client' ? (
              <>
                <p className={`text-sm font-medium ${text}`}>No documents waiting to assign</p>
                <p className={`mx-auto mt-2 max-w-md text-xs leading-relaxed ${sub}`}>
                  You have {summary.total || 0} document(s) total, but none are ready for client assignment yet.
                  An auditor must finish the audit and click <strong>Return to document manager</strong> with status
                  {' '}<strong>Approved</strong> or <strong>Reviewed</strong>. Then they appear here.
                </p>
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600"
                >
                  Show all {summary.total || 0} documents
                </button>
              </>
            ) : (
              <>
                <p className={`text-sm ${sub}`}>No documents match this filter.</p>
                {summary.total > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600"
                  >
                    Show all {summary.total} documents
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs ${isDarkMode ? 'border-white/8 text-slate-500' : 'border-gray-200 text-gray-500'}`}>
                  {['Document', 'Uploaded by', 'Status', 'Audit', 'Assigned to', 'Port', 'Flags', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                {documents.map(doc => (
                  <tr key={doc.id} className={`${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-gray-50'} ${highlightDocId === doc.id ? (isDarkMode ? 'bg-blue-600/10 ring-1 ring-indigo-500/30' : 'bg-blue-50 ring-1 ring-indigo-200') : ''}`}>
                    <td className="px-4 py-3">
                      <p className={`font-medium ${text}`}>{doc.title || doc.fileName}</p>
                      <p className={`text-xs ${sub}`}>{doc.category} · {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '—'}</p>
                      {doc.isClientUpload && (
                        <span className="mt-1 inline-flex rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-300">Client upload</span>
                      )}
                      {doc.isRequestOnly && doc.needsManagerPreparation && (
                        <span className="mt-1 ml-1 inline-flex rounded-full bg-blue-600/15 px-2 py-0.5 text-[10px] font-semibold text-blue-300">Needs preparation</span>
                      )}
                      {doc.magerwaRequested && doc.magerwaRequestStatus === 'pending' && !doc.needsManagerPreparation && (
                        <span className="mt-1 ml-1 inline-flex rounded-full bg-blue-600/15 px-2 py-0.5 text-[10px] font-semibold text-blue-300">Document requested</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-xs ${sub}`}>
                      {doc.uploader?.fullName || doc.uploader?.email || 'Unknown'}
                      {doc.uploader?.role === 'client' && doc.uploader?.phone && (
                        <span className="mt-0.5 block text-blue-400/80">{doc.uploader.phone}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${STATUS_PILL[doc.status] || 'bg-white/5 text-slate-300'}`}>
                        {(doc.status || 'uploaded').replace(/_/g, ' ')}
                      </span>
                      {doc.auditMarkup?.length > 0 && (
                        <p className="mt-1 text-[10px] text-red-400">{doc.auditMarkup.length} mistake(s) marked</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AuditBadge state={doc.auditState} />
                      {doc.neverAudited && (
                        <p className="mt-1 text-[10px] text-red-400">No auditor review yet</p>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-xs ${sub}`}>
                      {doc.assignedClients?.length
                        ? doc.assignedClients.map(c => (
                          <span key={c.id} className="block">
                            {c.fullName || c.email}
                            {c.phone && <span className="text-blue-400/80"> · {c.phone}</span>}
                          </span>
                        ))
                        : isAudited(doc) ? 'Not assigned' : '—'}
                    </td>
                    <td className={`px-4 py-3 text-xs ${sub}`}>
                      {doc.arrivalPort ? (
                        <span className="inline-flex items-center gap-1 text-blue-300">
                          <Ship className="h-3 w-3" /> {doc.arrivalPort}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {doc.isUrgent
                          ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">Urgent</span>
                          : <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">Normal</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {doc.needsManagerPreparation ? (
                          <button
                            onClick={() => openPrepare(doc)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600/15 px-2.5 py-1.5 text-[10px] font-semibold text-blue-300 hover:bg-blue-600/25"
                          >
                            <Upload className="h-3 w-3" /> Prepare document
                          </button>
                        ) : canNotifyAuditors(doc) ? (
                          <button
                            onClick={() => openNotify(doc)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600/15 px-2.5 py-1.5 text-[10px] font-semibold text-blue-300 hover:bg-blue-600/25"
                          >
                            <Bell className="h-3 w-3" /> Notify auditor
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => openReview(doc)}
                              className="inline-flex items-center gap-1 rounded-lg bg-orange-500/15 px-2.5 py-1.5 text-[10px] font-semibold text-orange-300 hover:bg-orange-500/25"
                            >
                              <AlertCircle className="h-3 w-3" /> Review audit
                            </button>
                            {canAssignToClient(doc) && (
                              <button
                                onClick={() => openAssign(doc)}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-500/15 px-2.5 py-1.5 text-[10px] font-semibold text-blue-300 hover:bg-blue-500/15"
                              >
                                <UserPlus className="h-3 w-3" /> Assign client
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadMarkedDocument(doc)}
                              disabled={exportingId === doc.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600/80 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              <Download className="h-3 w-3" /> Marked doc
                            </button>
                            <button
                              onClick={() => handleDownloadAnnotatedReport(doc)}
                              disabled={exportingId === doc.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-[10px] font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
                            >
                              <Download className="h-3 w-3" /> Red-mark report
                            </button>
                          </>
                        )}
                        {canNotifyAuditors(doc) && (
                          <button
                            onClick={() => handleFlagUpdate(doc, { isUrgent: !doc.isUrgent })}
                            className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold ${doc.isUrgent ? 'bg-red-500/20 text-red-300' : 'border border-white/10 text-slate-400'}`}
                          >
                            {doc.isUrgent ? 'Mark normal' : 'Mark urgent'}
                          </button>
                        )}
                      </div>
                      {doc.lastAuditRequestAt && (
                        <p className={`mt-1 text-[10px] ${sub}`}>
                          Last notified {new Date(doc.lastAuditRequestAt).toLocaleString()}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {prepareDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDarkMode ? 'bg-[#122a45] border-blue-400/30' : 'bg-white border-blue-200'}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className={`text-base font-semibold ${text}`}>Prepare client document</h3>
                <p className={`mt-1 text-xs ${sub}`}>{prepareDoc.title || prepareDoc.fileName}</p>
                <p className={`mt-1 text-xs ${sub}`}>
                  Requested by {prepareDoc.uploader?.fullName || prepareDoc.uploader?.email || 'client'}
                  {prepareDoc.uploader?.phone && ` · ${prepareDoc.uploader.phone}`}
                </p>
                {prepareDoc.magerwaRequestNote && (
                  <p className={`mt-2 rounded-lg border px-2 py-1.5 text-[11px] ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                    Client note: {prepareDoc.magerwaRequestNote}
                  </p>
                )}
              </div>
              <button onClick={() => setPrepareDoc(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={`mb-1 block text-xs ${sub}`}>Upload document file *</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={e => setPrepareFile(e.target.files?.[0] || null)}
                  className={`w-full rounded-xl border px-3 py-2 text-sm ${inputCls}`}
                />
                {prepareFile && (
                  <p className={`mt-1 text-xs text-blue-400`}>{prepareFile.name}</p>
                )}
              </div>
              <div>
                <label className={`mb-1 block text-xs ${sub}`}>Note to auditor (optional)</label>
                <textarea
                  value={prepareNote}
                  onChange={e => setPrepareNote(e.target.value)}
                  rows={2}
                  placeholder="Instructions for the auditor…"
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`}
                />
              </div>
              <div className={`rounded-xl border px-3 py-2 text-xs ${isDarkMode ? 'border-blue-400/30 bg-blue-600/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
                After upload, the document is sent to auditors automatically. When they return it, assign it to the requesting client.
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleFulfillRequest} disabled={busy || !prepareFile}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  <Upload className="h-4 w-4" /> {busy ? 'Uploading…' : 'Upload & send to auditor'}
                </button>
                <button onClick={() => setPrepareDoc(null)}
                  className={`rounded-xl border px-4 py-2.5 text-sm ${isDarkMode ? 'border-white/10 text-slate-400' : 'border-gray-200 text-gray-600'}`}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {notifyDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDarkMode ? 'bg-[#122a45] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className={`text-base font-semibold ${text}`}>Notify auditors</h3>
                <p className={`mt-1 text-xs ${sub}`}>{notifyDoc.title || notifyDoc.fileName}</p>
              </div>
              <button onClick={() => setNotifyDoc(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className={`flex items-center gap-2 text-sm ${text}`}>
                <input type="checkbox" checked={notifyForm.urgent} onChange={e => setNotifyForm(p => ({ ...p, urgent: e.target.checked }))} />
                Mark as urgent — priority audit required
              </label>
              <div>
                <label className={`mb-1 block text-xs ${sub}`}>Arrival port (optional)</label>
                <input
                  value={notifyForm.port}
                  onChange={e => setNotifyForm(p => ({ ...p, port: e.target.value }))}
                  placeholder="e.g. Jebel Ali, Port of Rotterdam"
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`}
                />
              </div>
              <div>
                <label className={`mb-1 block text-xs ${sub}`}>Message to auditors</label>
                <textarea
                  value={notifyForm.note}
                  onChange={e => setNotifyForm(p => ({ ...p, note: e.target.value }))}
                  rows={3}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`}
                />
              </div>
              <div className={`rounded-xl border px-3 py-2 text-xs ${isDarkMode ? 'border-blue-400/30 bg-blue-600/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
                Auditors will receive an in-app notification and email asking them to audit this document.
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleNotify} disabled={busy}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60">
                  <Bell className="h-4 w-4" /> {busy ? 'Sending...' : 'Send to auditors'}
                </button>
                <button onClick={() => setNotifyDoc(null)}
                  className={`rounded-xl border px-4 py-2.5 text-sm ${isDarkMode ? 'border-white/10 text-slate-400' : 'border-gray-200 text-gray-600'}`}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assignDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border p-6 shadow-2xl ${isDarkMode ? 'bg-[#122a45] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className={`text-base font-semibold ${text}`}>Assign to client</h3>
                <p className={`mt-1 text-xs ${sub}`}>{assignDoc.title || assignDoc.fileName}</p>
                <p className={`mt-1 text-[10px] text-blue-400`}>
                  {assignDoc?.isClientUpload || assignDoc?.uploader?.role === 'client'
                    ? 'The uploading client is pre-selected — confirm or add others, then assign for cargo clearance.'
                    : 'Search or pick from the dropdown — select clients to receive this document.'}
                </p>
              </div>
              <button onClick={() => setAssignDoc(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {clients.length === 0 ? (
                <div className={`rounded-xl border px-4 py-6 text-center ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  <p className={`text-xs ${sub}`}>No active client accounts found.</p>
                  <button
                    type="button"
                    onClick={loadClients}
                    className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-600"
                  >
                    Reload clients
                  </button>
                </div>
              ) : (
                <>
                  {selectedClients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedClients.map(id => {
                        const c = clients.find(x => x.id === id);
                        if (!c) return null;
                        return (
                          <span
                            key={id}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${isDarkMode ? 'bg-blue-500/15 text-blue-200' : 'bg-blue-100 text-blue-800'}`}
                          >
                            {c.fullName || c.email}
                            <button type="button" onClick={() => toggleClient(id)} className="opacity-70 hover:opacity-100">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="relative sm:col-span-2">
                      <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${sub}`} />
                      <input
                        type="search"
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                        placeholder="Search by name, email, phone, or company…"
                        className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none ${inputCls}`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={`mb-1 block text-[10px] font-medium uppercase tracking-wide ${sub}`}>Quick select from dropdown</label>
                      <select
                        defaultValue=""
                        onChange={handleQuickSelectClient}
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`}
                      >
                        <option value="">Choose a client to add…</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id} disabled={selectedClients.includes(c.id)}>
                            {c.fullName || c.email}{c.phone ? ` · ${c.phone}` : ''}{selectedClients.includes(c.id) ? ' (selected)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={`overflow-hidden rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className={`border-b px-3 py-2 text-[10px] font-semibold uppercase tracking-wide ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
                      {clientSearch.trim()
                        ? `Showing ${filteredClients.length} of ${clients.length} clients`
                        : `All clients (${clients.length})`} — {selectedClients.length} selected
                    </div>
                    <div className="min-h-[7rem] max-h-56 overflow-y-auto">
                      {filteredClients.length === 0 ? (
                        <p className={`px-3 py-6 text-center text-xs ${sub}`}>No clients match your search.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-[#122a45]' : 'bg-white'}`}>
                            <tr className={`border-b text-left ${isDarkMode ? 'border-white/10 text-slate-500' : 'border-gray-200 text-gray-500'}`}>
                              <th className="w-8 px-3 py-2" />
                              <th className="px-3 py-2 font-medium">Name</th>
                              <th className="px-3 py-2 font-medium">Company</th>
                              <th className="px-3 py-2 font-medium">Email</th>
                              <th className="px-3 py-2 font-medium">Telephone</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                            {filteredClients.map(client => (
                              <tr
                                key={client.id}
                                onClick={() => toggleClient(client.id)}
                                className={`cursor-pointer ${selectedClients.includes(client.id)
                                  ? isDarkMode ? 'bg-blue-500/15' : 'bg-blue-50'
                                  : isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                              >
                                <td className="px-3 py-2.5">
                                  <input
                                    type="checkbox"
                                    checked={selectedClients.includes(client.id)}
                                    onChange={() => toggleClient(client.id)}
                                    onClick={e => e.stopPropagation()}
                                  />
                                </td>
                                <td className={`px-3 py-2.5 font-medium ${text}`}>{client.fullName || '—'}</td>
                                <td className={`px-3 py-2.5 ${sub}`}>{client.department && client.department !== 'General' ? client.department : '—'}</td>
                                <td className={`px-3 py-2.5 ${sub}`}>{client.email || '—'}</td>
                                <td className="px-3 py-2.5">
                                  {client.phone ? (
                                    <span className={`inline-flex items-center gap-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                      <Phone className="h-3 w-3" /> {client.phone}
                                    </span>
                                  ) : (
                                    <span className={`italic ${sub}`}>No phone</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className={`mb-1 block text-xs ${sub}`}>Receiving point / Magerwa location</label>
                <input
                  value={assignPort}
                  onChange={e => setAssignPort(e.target.value)}
                  placeholder="e.g. Magerwa (Kigali receiving point), Jebel Ali, Mombasa Port"
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`}
                />
                <p className={`mt-1 text-[10px] ${sub}`}>Client will see this when downloading the document for cargo clearance. Magerwa is Rwanda&apos;s inland receiving point, not a seaport.</p>
              </div>
              <div>
                <label className={`mb-1 block text-xs ${sub}`}>Note to client (optional)</label>
                <textarea
                  value={assignNote}
                  onChange={e => setAssignNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Please review the audit findings and confirm receipt."
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${inputCls}`}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleAssign} disabled={busy || !selectedClients.length}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-60">
                  <UserPlus className="h-4 w-4" /> {busy ? 'Assigning…' : 'Assign to client(s)'}
                </button>
                <button onClick={() => setAssignDoc(null)}
                  className={`rounded-xl border px-4 py-2.5 text-sm ${isDarkMode ? 'border-white/10 text-slate-400' : 'border-gray-200 text-gray-600'}`}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl ${isDarkMode ? 'bg-[#122a45] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className={`text-base font-semibold ${text}`}>Audit returned from auditor</h3>
                <p className={`mt-1 text-xs ${sub}`}>{reviewDoc.title || reviewDoc.fileName}</p>
                <p className={`mt-1 text-xs capitalize ${STATUS_PILL[reviewDoc.status] || sub}`}>
                  Status: {(reviewDoc.status || '—').replace(/_/g, ' ')}
                </p>
              </div>
              <button onClick={() => setReviewDoc(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {reviewDoc.metadata?.statusReason && (
              <p className={`mb-3 rounded-xl border px-3 py-2 text-xs ${isDarkMode ? 'border-blue-400/30 bg-blue-600/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
                Auditor note: {reviewDoc.metadata.statusReason}
              </p>
            )}

            <div className="mb-4 space-y-2">
              <p className={`text-xs font-semibold text-red-400`}>Mistakes marked in red ({reviewDoc.auditMarkup?.length || 0})</p>
              {(reviewDoc.auditMarkup || []).length === 0 ? (
                <p className={`text-xs ${sub}`}>No mistakes flagged — document passed audit.</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {reviewDoc.auditMarkup.map(item => (
                    <li key={item.id} className={`rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300`}>
                      <span className="font-semibold uppercase text-[10px] text-red-400">{item.type?.replace(/_/g, ' ')} · {item.severity}</span>
                      <p className="mt-1">{item.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mb-4">
              <p className={`mb-2 text-xs font-semibold ${text}`}>Document with red ✕ marks</p>
              <AnnotatedDocumentPreview documentId={reviewDoc.id} isDarkMode={isDarkMode} />
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button onClick={() => handleDownloadMarkedDocument(reviewDoc)} disabled={exportingId === reviewDoc.id}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                <Download className="h-3.5 w-3.5" /> Download marked document (PDF)
              </button>
              <button onClick={() => handleDownloadAnnotatedReport(reviewDoc)} disabled={exportingId === reviewDoc.id}
                className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50">
                <Download className="h-3.5 w-3.5" /> Audit report with marks
              </button>
              <button onClick={() => handleDownloadReport(reviewDoc)} disabled={exportingId === reviewDoc.id}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/25 disabled:opacity-50">
                <FileText className="h-3.5 w-3.5" /> Analysis report only
              </button>
            </div>

            {(reviewDoc.needsCorrection || reviewDoc.status === 'changes_requested') && (
              <div className={`mb-4 rounded-xl border p-4 ${isDarkMode ? 'border-orange-500/25 bg-orange-500/5' : 'border-orange-200 bg-orange-50'}`}>
                <p className={`text-xs font-semibold ${isDarkMode ? 'text-orange-300' : 'text-orange-800'}`}>Upload corrected document</p>
                <p className={`mt-1 text-[11px] ${sub}`}>Fix the red-marked mistakes, then upload the corrected version. It will be marked ready for client release.</p>
                <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={e => setCorrectionFile(e.target.files?.[0] || null)}
                  className={`mt-3 w-full text-xs ${sub}`} />
                <button onClick={handleSubmitCorrection} disabled={busy || !correctionFile}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50">
                  <Upload className="h-3.5 w-3.5" /> {busy ? 'Uploading…' : 'Submit corrected version'}
                </button>
              </div>
            )}

            {canAssignToClient(reviewDoc) && (
              <button onClick={() => { setReviewDoc(null); openAssign(reviewDoc); }}
                className="w-full rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-violet-600">
                Assign approved document to client
              </button>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
