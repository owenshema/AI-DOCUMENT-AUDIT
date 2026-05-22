import React, { useState, useRef } from 'react';
import AppShell from '../components/AppShell';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Clock, FolderOpen } from 'lucide-react';
import { documentAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

const ALLOWED_TYPES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'];

const UPLOAD_HISTORY = [
  { id: 1, name: 'Q1-Compliance-2026.pdf', size: '2.4 MB', date: '2026-05-19', status: 'indexed', category: 'compliance' },
  { id: 2, name: 'HR-Policy-v3.docx', size: '1.1 MB', date: '2026-05-18', status: 'processing', category: 'policy' },
  { id: 3, name: 'Finance-Audit-Pack.pdf', size: '5.2 MB', date: '2026-05-17', status: 'indexed', category: 'audit' },
];

const STATUS_COLORS = {
  indexed:    'bg-emerald-500/15 text-emerald-400',
  processing: 'bg-amber-500/15 text-amber-400',
  failed:     'bg-red-500/15 text-red-400',
};

const UploadPage = () => {
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('policy');
  const [department, setDepartment] = useState(user?.department || 'General');
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);

  const addFiles = (incoming) => {
    const valid = Array.from(incoming).filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ALLOWED_TYPES.includes(ext);
    });
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    const newResults = [];
    for (const file of files) {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('title', file.name);
        form.append('category', category);
        form.append('department', department);
        await documentAPI.create(form);
        newResults.push({ name: file.name, status: 'success' });
      } catch {
        newResults.push({ name: file.name, status: 'error' });
      }
    }
    setResults(newResults);
    setFiles([]);
    setUploading(false);
  };

  return (
    <AppShell title="Document Ingestion" subtitle="Upload, batch process, and index documents into the system">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload area */}
        <div className="lg:col-span-2 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
              dragging
                ? 'border-[#0ea5e9] bg-[#0ea5e9]/10'
                : 'border-white/15 bg-white/3 hover:border-[#0ea5e9]/50 hover:bg-white/5'
            }`}
          >
            <Upload className="mx-auto mb-3 h-10 w-10 text-slate-500" />
            <p className="text-sm font-medium text-white">Drag & drop files here, or click to browse</p>
            <p className="mt-1 text-xs text-slate-500">Supported: PDF, DOCX, XLSX, PNG, JPG — Max 50MB per file</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {/* Metadata */}
          <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Document Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-white outline-none"
              >
                <option value="policy">Policy</option>
                <option value="contract">Contract</option>
                <option value="invoice">Invoice</option>
                <option value="compliance">Compliance</option>
                <option value="audit">Audit</option>
                <option value="hr">HR</option>
                <option value="finance">Finance</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-white outline-none"
              >
                <option value="General">General</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
                <option value="IT">IT</option>
                <option value="Operations">Operations</option>
                <option value="Legal">Legal</option>
              </select>
            </div>
          </div>

          {/* File queue */}
          {files.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">Upload Queue ({files.length})</h3>
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#38bdf8]" />
                      <span className="text-xs text-white">{f.name}</span>
                      <span className="text-[10px] text-slate-500">({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-slate-500 hover:text-red-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="mt-4 w-full rounded-lg bg-[#0ea5e9] py-2.5 text-sm font-semibold text-white transition hover:bg-[#0284c7] disabled:opacity-60"
              >
                {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {/* Upload results */}
          {results.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">Upload Results</h3>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {r.status === 'success'
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      : <AlertCircle className="h-4 w-4 text-red-400" />}
                    <span className={r.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>{r.name}</span>
                    <span className="text-slate-500">{r.status === 'success' ? '— indexed successfully' : '— upload failed'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload history */}
        <div>
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Clock className="h-4 w-4 text-[#38bdf8]" /> Upload History
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {UPLOAD_HISTORY.map((doc) => (
                <div key={doc.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <FolderOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                      <div>
                        <p className="text-xs font-medium text-white">{doc.name}</p>
                        <p className="text-[10px] text-slate-500">{doc.size} · {doc.date}</p>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[doc.status]}`}>
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default UploadPage;
