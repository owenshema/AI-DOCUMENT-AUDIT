import React, { useState, useRef, useEffect } from 'react';
import { Bot, Upload, FileText, X, Zap, AlertTriangle, CheckCircle2, Eye, Download } from 'lucide-react';
import AppShell from '../components/AppShell';
import { documentAPI, analysisAPI } from '../api/auth';
import useAuthStore from '../store/authStore';
import apiClient from '../api/client';

// ── Inline Document Viewer Modal ──────────────────────────────────────────────
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
      .then(res => { setBlobUrl(URL.createObjectURL(res.data)); setLoading(false); })
      .catch(() => { setErr('Could not load preview.'); setLoading(false); });
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-indigo-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{doc.title || doc.fileName}</p>
              <p className="text-xs text-slate-500">{ext?.toUpperCase()} document</p>
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

const ScoreArc = ({ score, dark }) => {
  const r = 38, circ = 2 * Math.PI * r;
  const color = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171';
  const trackColor = dark ? '#ffffff0a' : '#e5e7eb';
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke={trackColor} strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${circ * score / 100} ${circ}`}
        strokeLinecap="round" transform="rotate(-90 50 50)" />
      <text x="50" y="56" textAnchor="middle" fill={dark ? 'white' : '#111827'} fontSize="18" fontWeight="700">{score}</text>
    </svg>
  );
};

function formatFinding(item) {
  if (!item) return { title: '', body: '' };
  if (typeof item === 'string') return { title: item, body: '' };
  return {
    title: item.title || item.code || 'Finding',
    body: [item.summary, item.detail, item.remediation ? `Action: ${item.remediation}` : ''].filter(Boolean).join(' '),
    code: item.code,
    severity: item.severity,
  };
}

const FindingCard = ({ label, items = [], color, dot, dark }) => (
  <div className={`rounded-xl border p-3 ${dark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
    <p className={`text-[10px] font-semibold mb-2 ${color}`}>{label} ({items.length})</p>
    {items.length > 0 ? (
      <ul className="space-y-2">
        {items.slice(0, 4).map((item, i) => {
          const f = formatFinding(item);
          return (
            <li key={i} className={`text-[11px] leading-snug ${dark ? 'text-slate-300' : 'text-gray-600'}`}>
              <div className="flex items-start gap-1.5">
                <span className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${dot}`} />
                <div>
                  {f.code && (
                    <span className={`mr-1 rounded px-1 py-0.5 text-[9px] font-bold ${dark ? 'bg-white/10 text-slate-400' : 'bg-gray-200 text-gray-500'}`}>
                      {f.code}
                    </span>
                  )}
                  <span className="font-semibold">{f.title}</span>
                  {f.body && <p className={`mt-0.5 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{f.body}</p>}
                </div>
              </div>
            </li>
          );
        })}
        {items.length > 4 && <li className={`text-[10px] ${dark ? 'text-slate-600' : 'text-gray-400'}`}>+{items.length - 4} more</li>}
      </ul>
    ) : (
      <p className={`text-[11px] ${dark ? 'text-slate-600' : 'text-gray-400'}`}>None detected</p>
    )}
  </div>
);

function normalizeDocumentInspection(raw, result) {
  if (!raw) return null;
  const isOurs = result?.organization_match === true && raw.not_our_document !== true;

  if (!isOurs) {
    return {
      assessed: false,
      not_our_document: true,
      signature: null,
      stamp: null,
      organization: null,
      purpose: null,
      request: null,
      forgery_analysis: raw.forgery_analysis || null,
      dates: null,
      financials: null,
    };
  }

  const paperPurpose = result?.organization_training?.paper_purpose || null;
  return {
    assessed: true,
    signature: { present: false, ...(raw.signature || {}) },
    stamp: { present: false, stamp_type: 'Seal', ...(raw.stamp || {}) },
    organization: { present: false, ...(raw.organization || {}) },
    purpose: {
      present: false,
      subject: paperPurpose,
      purpose: paperPurpose,
      ...(raw.purpose || {}),
    },
    request: { has_request: false, ...(raw.request || {}) },
    forgery_analysis: { is_suspicious: false, forgery_score: 0, flags: [], ...(raw.forgery_analysis || {}) },
    dates: { all_dates: [], issues: [], ...(raw.dates || {}) },
    financials: raw.financials || null,
  };
}

export default function AIAnalysisPage() {
  const { isDarkMode } = useAuthStore();
  const fileRef = useRef(null);
  const [dragging, setDragging]   = useState(false);
  const [file, setFile]           = useState(null);
  const [docTitle, setDocTitle]   = useState('');
  const [result, setResult]       = useState(null);
  const [busy, setBusy]           = useState(false);
  const [step, setStep]           = useState('idle');
  const [error, setError]         = useState('');
  const [existingDocs, setExistingDocs] = useState([]);
  const [showPicker, setShowPicker]     = useState(false);
  const [viewerDoc, setViewerDoc]       = useState(null);
  const [auditedDocId, setAuditedDocId] = useState(null);

  const card    = isDarkMode ? 'bg-[#111318] border-white/8'  : 'bg-white border-gray-200 shadow-sm';
  const text    = isDarkMode ? 'text-white'    : 'text-gray-900';
  const sub     = isDarkMode ? 'text-slate-500': 'text-gray-500';
  const inputCls = isDarkMode
    ? 'border-white/10 bg-[#0d0f14] text-white placeholder-slate-700 focus:border-indigo-500/50'
    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-400';

  useEffect(() => {
    documentAPI.getAll({ limit: 30 }).then(res => {
      const d = res?.documents || res?.data || res || [];
      setExistingDocs(Array.isArray(d) ? d : []);
    }).catch(() => {});
  }, []);

  const reset = () => { setFile(null); setDocTitle(''); setResult(null); setStep('idle'); setError(''); setAuditedDocId(null); };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setDocTitle(f.name); setResult(null); setStep('idle'); setError(''); }
  };

  const handleUploadAndAudit = async () => {
    if (!file) return;
    setBusy(true); setError(''); setResult(null); setStep('uploading');
    let uploadedId = null;
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', file.name);
      form.append('category', 'compliance');
      form.append('department', 'General');
      const upRes = await documentAPI.create(form);
      uploadedId = upRes?.document?.id || upRes?.id;
      setAuditedDocId(uploadedId);
    } catch (e) {
      setError(e?.response?.data?.error || 'Upload failed.');
      setStep('error'); setBusy(false); return;
    }
    setStep('analyzing');
    try {
      const res = await analysisAPI.analyzeDocument(uploadedId);
      setResult(res?.analysis || res);
      setStep('done');
    } catch (e) {
      setError(e?.response?.data?.error || 'Analysis failed.');
      setStep('error');
    }
    setBusy(false);
  };

  const handleAuditExisting = async (doc) => {
    setShowPicker(false);
    setDocTitle(doc.title || doc.fileName);
    setAuditedDocId(doc.id);
    setFile(null); setBusy(true); setError(''); setResult(null); setStep('analyzing');
    try {
      const res = await analysisAPI.analyzeDocument(doc.id);
      setResult(res?.analysis || res);
      setStep('done');
    } catch (e) {
      setError(e?.response?.data?.error || 'Analysis failed.');
      setStep('error');
    }
    setBusy(false);
  };

  const score = result?.compliance_score ?? result?.complianceScore ?? 0;
  const overallScore = result?.overall_audit_score ?? score;
  const breakdown = result?.overall_audit_breakdown;
  const integrityScore = breakdown?.integrity_percent ?? Math.max(0, 100 - (result?.document_inspection?.forgery_analysis?.forgery_score ?? 0));

  return (
    <AppShell title="AI Analysis">
      {/* Engine badge */}
      <div className={`mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3 ${isDarkMode ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-indigo-100 bg-indigo-50'}`}>
        <Bot className="h-5 w-5 text-indigo-400 flex-shrink-0" />
        <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
          <span className={`font-semibold ${text}`}>SIFCO ML Training Engine</span>
          {' — '}Trained on your six SIFCO reference PDFs. Validation uses text inside the document only — you can rename the file; the audit does not depend on the file name.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Upload panel */}
        <div className={`rounded-2xl border p-5 flex flex-col gap-4 ${card}`}>
          <div>
            <h2 className={`text-sm font-semibold mb-1 ${text}`}>Upload Document for Audit</h2>
            <p className={`text-xs ${sub}`}>Upload a PDF — audited against trained company papers only (structure & purpose, not exact numbers).</p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragging ? 'border-indigo-400 bg-indigo-500/10'
              : file ? (isDarkMode ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-indigo-300 bg-indigo-50')
              : (isDarkMode ? 'border-white/10 hover:border-indigo-500/30 hover:bg-white/2' : 'border-gray-300 hover:border-indigo-300 hover:bg-indigo-50/30')
            }`}>
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-8 w-8 text-indigo-400" />
                <p className={`text-sm font-medium ${text}`}>{file.name}</p>
                <p className={`text-xs ${sub}`}>{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className={`h-8 w-8 ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`} />
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Drag & drop a file here</p>
                <p className={`text-xs ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}>PDF, DOCX, XLSX, images</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setDocTitle(f.name); setResult(null); setStep('idle'); setError(''); }}} />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button onClick={handleUploadAndAudit} disabled={!file || busy}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-40">
              <Zap className="h-4 w-4" />
              {step === 'uploading' ? 'Uploading...' : step === 'analyzing' ? 'Running AI audit...' : 'Upload & Run Audit'}
            </button>
            <div className="flex items-center gap-2">
              <div className={`flex-1 h-px ${isDarkMode ? 'bg-white/8' : 'bg-gray-200'}`} />
              <span className={`text-[10px] ${sub}`}>or</span>
              <div className={`flex-1 h-px ${isDarkMode ? 'bg-white/8' : 'bg-gray-200'}`} />
            </div>
            <button onClick={() => setShowPicker(true)}
              className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm transition-colors ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/8 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              <FileText className="h-4 w-4" /> Audit an existing document
            </button>
            {(file || step !== 'idle') && (
              <button onClick={reset} className={`flex items-center justify-center gap-1 rounded-xl py-2 text-xs ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}

          {/* Progress steps */}
          {step !== 'idle' && (
            <div className="space-y-2">
              {[['uploading','Uploading document'],['analyzing','Running AI audit'],['done','Audit complete']].map(([s, label], i) => {
                const order = ['uploading','analyzing','done'];
                const cur = order.indexOf(step);
                const idx = order.indexOf(s);
                const done = cur > idx || step === 'done';
                const active = step === s;
                return (
                  <div key={s} className="flex items-center gap-2.5">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-colors ${done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-500 text-white animate-pulse' : isDarkMode ? 'bg-white/8 text-slate-600' : 'bg-gray-200 text-gray-400'}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs ${done ? 'text-emerald-400' : active ? text : sub}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Results panel */}
        <div className={`rounded-2xl border p-5 ${card}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-sm font-semibold ${text}`}>Audit Result</h2>
            {result && (
              <span className={`text-[10px] rounded-full px-2 py-0.5 border ${isDarkMode ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400' : 'border-indigo-200 bg-indigo-50 text-indigo-600'}`}>
                {result.engine === 'openai' ? '🤖 OpenAI' : '⚙️ Rule-based'}
              </span>
            )}
          </div>

          {!result && !busy && (
            <div className="flex flex-col items-center justify-center h-72 text-center">
              <Bot className={`h-14 w-14 mb-3 ${isDarkMode ? 'text-slate-800' : 'text-gray-300'}`} />
              <p className={`text-sm ${sub}`}>Upload a document and click<br />"Upload & Run Audit" to see results.</p>
            </div>
          )}

          {busy && !result && (
            <div className="flex flex-col items-center justify-center h-72">
              <div className="h-10 w-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
              <p className={`text-sm ${sub}`}>{step === 'uploading' ? 'Uploading document...' : 'Running AI audit...'}</p>
              {docTitle && <p className={`text-xs mt-1 ${sub}`}>{docTitle}</p>}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {docTitle && (
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                  <FileText className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                  <p className={`text-xs truncate flex-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{docTitle}</p>
                  {auditedDocId && (
                    <button
                      onClick={() => {
                        const doc = existingDocs.find(d => d.id === auditedDocId) || { id: auditedDocId, title: docTitle, fileName: docTitle };
                        setViewerDoc(doc);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-indigo-500/15 border border-indigo-500/20 px-2 py-1 text-[10px] font-medium text-indigo-400 hover:bg-indigo-500/25 flex-shrink-0">
                      <Eye className="h-3 w-3" /> View
                    </button>
                  )}
                </div>
              )}

              {/* Overall + component scores */}
              {(() => {
                const aiGenerated = Math.round(result?.ai_generated_percentage ?? 0);
                const overallLabel = result?.overall_audit_status || (overallScore >= 85 ? 'Excellent' : overallScore >= 70 ? 'Good' : overallScore >= 50 ? 'Review Required' : 'Failed');
                return (
                  <div className="space-y-3">
                    <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-indigo-500/25 bg-indigo-500/8' : 'border-indigo-200 bg-indigo-50'}`}>
                      <div className="flex items-center gap-4">
                        <ScoreArc score={overallScore} dark={isDarkMode} />
                        <div>
                          <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${sub}`}>Overall Audit Health</p>
                          <p className={`text-2xl font-bold ${overallScore >= 85 ? 'text-emerald-400' : overallScore >= 70 ? 'text-indigo-400' : overallScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                            {overallScore}%
                          </p>
                          <p className={`text-xs font-semibold ${text}`}>{overallLabel}</p>
                          <p className={`text-[10px] mt-1 ${sub}`}>60% SIFCO match + 40% document integrity</p>
                        </div>
                      </div>
                    </div>

                    <div className={`grid grid-cols-3 gap-3 rounded-xl border p-4 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="text-center">
                        <ScoreArc score={score} dark={isDarkMode} />
                        <p className={`text-[10px] uppercase tracking-wider mt-2 ${sub}`}>Compliance</p>
                        <p className={`text-xs font-bold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{score}%</p>
                      </div>
                      <div className="text-center">
                        <ScoreArc score={integrityScore} dark={isDarkMode} />
                        <p className={`text-[10px] uppercase tracking-wider mt-2 ${sub}`}>Integrity</p>
                        <p className={`text-xs font-bold ${integrityScore >= 70 ? 'text-emerald-400' : integrityScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{integrityScore}%</p>
                      </div>
                      <div className="text-center">
                        <ScoreArc score={100 - aiGenerated} dark={isDarkMode} />
                        <p className={`text-[10px] uppercase tracking-wider mt-2 ${sub}`}>Authenticity</p>
                        <p className={`text-xs font-bold ${aiGenerated > 25 ? 'text-red-400' : 'text-emerald-400'}`}>{100 - aiGenerated}%</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {(result.decision?.title || result.summary) && (
                <div className={`rounded-xl border px-3 py-3 text-xs leading-relaxed ${
                  result.decision?.status === 'approved' || result.organization_match
                    ? (isDarkMode ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900')
                    : (isDarkMode ? 'border-red-500/25 bg-red-500/8 text-red-100' : 'border-red-200 bg-red-50 text-red-900')
                }`}>
                  <p className="font-semibold text-sm mb-1">
                    {result.decision?.title || (result.organization_match ? 'Audit approved' : 'Audit rejected')}
                  </p>
                  <p>{result.decision?.reason || result.summary}</p>
                  {result.decision?.detail && (
                    <p className={`mt-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{result.decision.detail}</p>
                  )}
                  {result.decision?.nextSteps?.length > 0 && (
                    <ul className={`mt-2 list-disc pl-4 space-y-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                      {result.decision.nextSteps.map((step, i) => <li key={i}>{step}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {(result.ml_training?.best_match || result.organization_training?.ml_training?.best_match || result.organization_category) && (
                <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'}`}>
                  <p className="text-[10px] font-semibold text-emerald-500 mb-1">ML training match</p>
                  {(() => {
                    const ml = result.ml_training || result.organization_training?.ml_training;
                    const bm = ml?.best_match;
                    if (!bm) return (
                      <p className={`text-xs font-medium ${text}`}>
                        {result.organization_training?.paper_label || result.organization_category?.replace(/_/g, ' ')}
                      </p>
                    );
                    return (
                      <>
                        <p className={`text-xs font-medium ${text}`}>{bm.label} — {bm.confidence_percent}% confidence</p>
                        <p className={`text-[10px] mt-1 ${sub}`}>Reference: {bm.reference_pdf}</p>
                        <p className={`text-[10px] mt-0.5 ${sub}`}>
                          Similarity {bm.similarity_percent}% · Markers {bm.marker_match_percent}% ·
                          {bm.signature_detected ? ' Signature found' : ' No signature text detected'}
                        </p>
                      </>
                    );
                  })()}
                </div>
              )}

              {(result.inconsistencies?.length > 0 && !result.organization_match) && (
                <div className="grid grid-cols-1 gap-3">
                  <FindingCard label="Why not accepted" items={result.inconsistencies || []} color="text-orange-400" dot="bg-orange-400" dark={isDarkMode} />
                </div>
              )}

              {result.fraud_flags?.length > 0 && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-[10px] font-semibold text-red-400 mb-2">🚨 Anomaly Flags ({result.fraud_flags.length})</p>
                  <ul className="space-y-1.5">
                    {result.fraud_flags.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px]">
                        <span className={`mt-0.5 rounded px-1 py-0.5 text-[9px] font-bold flex-shrink-0 ${f.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{f.severity?.toUpperCase()}</span>
                        <span className={isDarkMode ? 'text-slate-300' : 'text-gray-600'}>{f.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Fields */}
              {result.extracted_fields && Object.keys(result.extracted_fields).some(k => result.extracted_fields[k]) && (
                <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                  <p className={`text-[10px] font-semibold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>📋 Extracted Data</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(result.extracted_fields).filter(([,v]) => v).map(([k, v]) => (
                      <div key={k} className={`rounded-lg p-1.5 ${isDarkMode ? 'bg-white/5' : 'bg-white border border-gray-100'}`}>
                        <p className={`text-[9px] uppercase tracking-wide mb-0.5 ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}>{k.replace(/_/g, ' ')}</p>
                        <p className={`text-[11px] font-medium truncate ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className={`text-[10px] text-right ${sub}`}>
                Paper-audit engine · {result.engine || 'trained-only'} · Invoice # and billing may vary
              </p>

              {/* ── Document Inspection Panel ── */}
              {result.document_inspection && (() => {
                const di = normalizeDocumentInspection(result.document_inspection, result);
                if (!di) return null;
                const rowCls = `flex items-start justify-between gap-2 py-2 border-b ${isDarkMode ? 'border-white/5' : 'border-gray-100'} last:border-0`;
                const labelCls = `text-[11px] font-medium flex-shrink-0 w-28 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`;
                const valCls = `text-[11px] text-right ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`;
                const ok  = `text-emerald-400`;
                const bad = `text-red-400`;
                const warn = `text-amber-400`;

                return (
                  <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`text-xs font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      🔍 Document Inspection
                    </p>

                    {di.not_our_document && (
                      <p className={`text-[11px] mb-3 rounded-lg border px-3 py-2 ${isDarkMode ? 'border-amber-500/25 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                        Unrecognized document — not a trained SIFCO paper. Signature, stamp, and logo checks were not applied.
                      </p>
                    )}

                    {/* Signature */}
                    <div className={rowCls}>
                      <span className={labelCls}>Signature</span>
                      <div className="text-right">
                        {!di.signature ? (
                          <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>—</span>
                        ) : (
                          <>
                            <span className={`text-[11px] font-semibold ${di.signature.present ? ok : bad}`}>
                              {di.signature.present ? '✓ Present' : '✗ Missing'}
                            </span>
                            {di.signature.signer_name && <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Signed by: {di.signature.signer_name}</p>}
                            {di.signature.signer_title && <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Title: {di.signature.signer_title}</p>}
                            {di.signature.signing_date && <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Date: {di.signature.signing_date}</p>}
                            {di.signature.type && <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Type: {di.signature.type}</p>}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stamp */}
                    <div className={rowCls}>
                      <span className={labelCls}>Stamp / Seal</span>
                      {!di.stamp ? (
                        <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>—</span>
                      ) : (
                        <span className={`text-[11px] font-semibold ${di.stamp.present ? ok : warn}`}>
                          {di.stamp.present ? `✓ ${di.stamp.stamp_type || 'Detected'}` : '— Not detected'}
                        </span>
                      )}
                    </div>

                    {/* Organization */}
                    <div className={rowCls}>
                      <span className={labelCls}>Organization / Logo</span>
                      <div className="text-right">
                        {!di.organization ? (
                          <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>—</span>
                        ) : (
                          <>
                            <span className={`text-[11px] font-semibold ${di.organization.present ? ok : bad}`}>
                              {di.organization.present ? '✓ Found' : '✗ Missing'}
                            </span>
                            {di.organization.primary && <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{di.organization.primary}</p>}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Purpose through Dates — only for recognized SIFCO documents */}
                    {!di.not_our_document && (
                      <>
                    <div className={rowCls}>
                      <span className={labelCls}>Purpose</span>
                      <div className="text-right max-w-[180px]">
                        <span className={`text-[11px] font-semibold ${di.purpose?.present ? ok : warn}`}>
                          {di.purpose?.present ? '✓ Stated' : '— Not stated'}
                        </span>
                        {di.purpose?.subject && <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} truncate`}>{di.purpose.subject}</p>}
                        {di.purpose?.purpose && !di.purpose?.subject && <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} truncate`}>{di.purpose.purpose}</p>}
                      </div>
                    </div>

                    <div className={rowCls}>
                      <span className={labelCls}>Request</span>
                      <div className="text-right">
                        <span className={`text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                          {di.request?.has_request ? '✓ Request found' : '— No request'}
                        </span>
                        {di.request?.approval_status && (
                          <p className={`text-[10px] mt-0.5 font-semibold ${di.request.approval_status === 'approved' ? ok : di.request.approval_status === 'rejected' ? bad : warn}`}>
                            {di.request.approval_status.toUpperCase()}
                          </p>
                        )}
                        {di.request?.requested_by && <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>By: {di.request.requested_by}</p>}
                      </div>
                    </div>

                    <div className={rowCls}>
                      <span className={labelCls}>Dates Found</span>
                      <div className="text-right">
                        <span className={`text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                          {di.dates?.all_dates?.length > 0 ? di.dates.all_dates.slice(0,3).join(', ') : '— None detected'}
                        </span>
                        {di.dates?.issues?.length > 0 && (
                          <p className={`text-[10px] mt-0.5 ${bad}`}>{di.dates.issues[0]}</p>
                        )}
                      </div>
                    </div>
                      </>
                    )}

                    {/* Forgery */}
                    {di.forgery_analysis && (
                    <div className={rowCls}>
                      <span className={labelCls}>Forgery Check</span>
                      <div className="text-right">
                        <span className={`text-[11px] font-semibold ${di.forgery_analysis.is_suspicious ? bad : ok}`}>
                          {di.forgery_analysis.is_suspicious ? `⚠️ Suspicious (score: ${di.forgery_analysis.forgery_score})` : '✓ No forgery indicators'}
                        </span>
                        {di.forgery_analysis.flags?.length > 0 && (
                          <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{di.forgery_analysis.flags.length} flag(s)</p>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Financials */}
                    {di.financials && (
                      <div className={rowCls}>
                        <span className={labelCls}>Financials</span>
                        <div className="text-right">
                          {di.financials.total_amount ? (
                            <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                              {di.financials.currency || ''} {di.financials.total_amount.toLocaleString()}
                            </span>
                          ) : (
                            <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>— No amount found</span>
                          )}
                          <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                            {di.financials.tax_present ? '✓ Tax included' : '— No tax line'}
                            {di.financials.discount_present ? ' · Discount present' : ''}
                          </p>
                          {di.financials.issues?.length > 0 && (
                            <p className={`text-[10px] mt-0.5 ${bad}`}>{di.financials.issues[0]}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Existing doc picker */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#1a1d24] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-semibold ${text}`}>Select Document to Audit</h3>
              <button onClick={() => setShowPicker(false)}><X className={`h-5 w-5 ${sub}`} /></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {existingDocs.length === 0 ? (
                <p className={`p-6 text-center text-sm ${sub}`}>No documents uploaded yet.</p>
              ) : existingDocs.map(doc => (
                <button key={doc.id} onClick={() => handleAuditExisting(doc)}
                  className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors ${isDarkMode ? 'hover:bg-white/5 border-b border-white/5' : 'hover:bg-gray-50 border-b border-gray-100'}`}>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-indigo-500/15 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-100'}`}>
                    <FileText className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${text}`}>{doc.title || doc.fileName}</p>
                    <p className={`text-xs ${sub}`}>{doc.category} · {doc.department}</p>
                  </div>
                  <Zap className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer */}
      {viewerDoc && <DocumentViewer doc={viewerDoc} onClose={() => setViewerDoc(null)} />}
    </AppShell>
  );
}
