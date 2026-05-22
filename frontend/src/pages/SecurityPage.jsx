import React, { useState } from 'react';
import AppShell from '../components/AppShell';
import { Lock, Shield, Eye, AlertTriangle, CheckCircle2, Users, Key, FileText } from 'lucide-react';

const CLASSIFICATION_LEVELS = [
  { label: 'Public', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', count: 24 },
  { label: 'Internal', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', count: 87 },
  { label: 'Confidential', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', count: 43 },
  { label: 'Restricted', color: 'bg-red-500/15 text-red-400 border-red-500/20', count: 12 },
];

const MOCK_DOCS = [
  { id: 1, title: 'Executive Compensation Report', classification: 'Restricted', encrypted: true, watermark: true, downloads: 2, lastAccess: '2026-05-19' },
  { id: 2, title: 'Q1 Compliance Summary', classification: 'Confidential', encrypted: true, watermark: false, downloads: 8, lastAccess: '2026-05-18' },
  { id: 3, title: 'HR Onboarding Guide', classification: 'Internal', encrypted: false, watermark: false, downloads: 34, lastAccess: '2026-05-17' },
  { id: 4, title: 'Company Profile Brochure', classification: 'Public', encrypted: false, watermark: false, downloads: 120, lastAccess: '2026-05-16' },
];

const DLP_ALERTS = [
  { id: 1, type: 'Unauthorized Download Attempt', user: 'viewer@sifco.local', doc: 'Executive Compensation Report', time: '2026-05-19 14:32', severity: 'high' },
  { id: 2, type: 'Bulk Export Detected', user: 'doc.manager@sifco.local', doc: 'Multiple Documents', time: '2026-05-18 09:15', severity: 'medium' },
  { id: 3, type: 'External Share Attempt', user: 'auditor@sifco.local', doc: 'Q1 Compliance Summary', time: '2026-05-17 16:44', severity: 'low' },
];

const SEVERITY_COLORS = {
  high:   'bg-red-500/15 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  low:    'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

const SecurityPage = () => {
  const [selectedDoc, setSelectedDoc] = useState(null);

  return (
    <AppShell title="Confidentiality & Security" subtitle="Document classification, access control, encryption, and DLP monitoring">
      {/* Classification overview */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CLASSIFICATION_LEVELS.map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
            <p className="text-2xl font-bold">{c.count}</p>
            <p className="mt-1 text-xs font-medium">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Document security table */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="text-sm font-semibold text-white">Document Security Settings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-500">
                    <th className="px-4 py-3 text-left">Document</th>
                    <th className="px-4 py-3 text-left">Classification</th>
                    <th className="px-4 py-3 text-center">Encrypted</th>
                    <th className="px-4 py-3 text-center">Watermark</th>
                    <th className="px-4 py-3 text-left">Downloads</th>
                    <th className="px-4 py-3 text-left">Last Access</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_DOCS.map((doc) => {
                    const cls = CLASSIFICATION_LEVELS.find((c) => c.label === doc.classification);
                    return (
                      <tr key={doc.id} className="border-b border-white/5 hover:bg-white/3 cursor-pointer" onClick={() => setSelectedDoc(doc)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            <span className="text-xs text-white">{doc.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls?.color}`}>
                            {doc.classification}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {doc.encrypted
                            ? <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" />
                            : <span className="text-xs text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {doc.watermark
                            ? <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" />
                            : <span className="text-xs text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{doc.downloads}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{doc.lastAccess}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-5">
          {/* Security summary */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Security Overview</h3>
            {[
              { label: 'Encrypted Documents', value: '55 / 166', icon: Key, color: 'text-[#38bdf8]' },
              { label: 'Watermarked', value: '12 / 166', icon: Eye, color: 'text-purple-400' },
              { label: 'Restricted Access', value: '12 docs', icon: Lock, color: 'text-red-400' },
              { label: 'Active DLP Alerts', value: '3', icon: AlertTriangle, color: 'text-amber-400' },
            ].map((item) => (
              <div key={item.label} className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-xs text-slate-400">{item.label}</span>
                </div>
                <span className="text-xs font-semibold text-white">{item.value}</span>
              </div>
            ))}
          </div>

          {/* DLP Alerts */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">DLP Alerts</h3>
            <div className="space-y-3">
              {DLP_ALERTS.map((alert) => (
                <div key={alert.id} className={`rounded-lg border p-3 ${SEVERITY_COLORS[alert.severity]}`}>
                  <p className="text-xs font-semibold">{alert.type}</p>
                  <p className="mt-1 text-[10px] opacity-80">{alert.user}</p>
                  <p className="text-[10px] opacity-60">{alert.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default SecurityPage;
