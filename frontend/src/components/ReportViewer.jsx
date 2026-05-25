import React from 'react';
import {
  AlertTriangle, CheckCircle2, FileText, Shield, TrendingUp,
  Upload, Cpu, ClipboardCheck, XCircle, Calendar, User, Lock,
} from 'lucide-react';

const STATUS_STYLES = {
  compliant: { bg: 'bg-emerald-500/15', text: 'text-emerald-500', border: 'border-emerald-500/30' },
  partial: { bg: 'bg-amber-500/15', text: 'text-amber-500', border: 'border-amber-500/30' },
  non_compliant: { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-red-500/30' },
};

const METRIC_ICONS = {
  upload: Upload,
  cpu: Cpu,
  clipboard: ClipboardCheck,
  check: CheckCircle2,
  x: XCircle,
  alert: AlertTriangle,
};

function ScoreRing({ score, size = 88, isDarkMode }) {
  const s = Math.min(100, Math.max(0, Number(score) || 0));
  const color = s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (s / 100) * circ;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={isDarkMode ? '#ffffff15' : '#e5e7eb'} strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{s}</span>
        <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>/100</span>
      </div>
    </div>
  );
}

function SectionBlock({ section, isDarkMode }) {
  const text = isDarkMode ? 'text-white' : 'text-gray-900';
  const sub = isDarkMode ? 'text-slate-400' : 'text-gray-600';
  const card = isDarkMode ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200';

  return (
    <section className={`rounded-2xl border p-5 ${card}`}>
      <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${text}`}>
        <FileText className="h-4 w-4 text-indigo-400" />
        {section.title}
      </h3>

      {section.paragraphs?.map((p, i) => (
        <p key={i} className={`text-sm leading-relaxed mb-3 ${sub}`}>{p}</p>
      ))}

      {section.highlights?.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
          {section.highlights.map((h) => (
            <div key={h.label} className={`rounded-xl border px-3 py-2 ${isDarkMode ? 'border-white/8 bg-white/5' : 'border-gray-200 bg-white'}`}>
              <p className={`text-[10px] uppercase tracking-wide ${sub}`}>{h.label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${text}`}>{h.value}</p>
            </div>
          ))}
        </div>
      )}

      {section.metrics?.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mb-4">
          {section.metrics.map((m) => {
            const Icon = METRIC_ICONS[m.icon] || TrendingUp;
            return (
              <div key={m.key || m.label}
                className={`rounded-xl border px-3 py-2.5 flex items-center gap-2 ${m.warn ? 'border-red-500/30 bg-red-500/10' : isDarkMode ? 'border-white/8 bg-white/5' : 'border-gray-200 bg-white'}`}>
                <Icon className={`h-4 w-4 flex-shrink-0 ${m.warn ? 'text-red-400' : 'text-indigo-400'}`} />
                <div>
                  <p className={`text-[10px] ${sub}`}>{m.label}</p>
                  <p className={`text-sm font-bold ${m.warn ? 'text-red-400' : text}`}>{m.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {section.riskDistribution && (
        <div className="flex flex-wrap gap-3 mb-3">
          {[
            { label: 'High', value: section.riskDistribution.high, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
            { label: 'Medium', value: section.riskDistribution.medium, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { label: 'Low', value: section.riskDistribution.low, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          ].map((r) => (
            <span key={r.label} className={`rounded-full border px-3 py-1 text-xs font-medium ${r.color}`}>
              {r.label}: {r.value}
            </span>
          ))}
        </div>
      )}
      {section.narrative && <p className={`text-sm ${sub}`}>{section.narrative}</p>}

      {section.table?.rows?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border mt-2">
          <table className={`w-full text-xs ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
            <thead>
              <tr className={isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-gray-100 text-gray-600'}>
                {section.table.columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
              {section.table.rows.map((row, ri) => (
                <tr key={ri} className={isDarkMode ? 'hover:bg-white/3' : 'hover:bg-gray-50'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-3 py-2 ${ci === 0 ? 'font-medium ' + text : sub}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section.bullets?.map((b, i) => (
        <p key={i} className={`text-sm flex gap-2 mb-1.5 ${sub}`}>
          <span className="text-indigo-400">•</span>{b}
        </p>
      ))}

      {section.violations?.length > 0 && (
        <ul className="space-y-1.5 mt-2">
          {section.violations.map((v, i) => (
            <li key={i} className="text-xs text-red-400 flex gap-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />{v}
            </li>
          ))}
        </ul>
      )}

      {section.numbered?.map((r, i) => (
        <p key={i} className={`text-sm mb-1.5 ${sub}`}>
          <span className="text-indigo-400 font-semibold mr-2">{i + 1}.</span>{r}
        </p>
      ))}

      {section.timeline?.length > 0 && (
        <div className={`mt-3 space-y-2 max-h-64 overflow-y-auto ${isDarkMode ? '' : ''}`}>
          {section.timeline.map((t, i) => (
            <div key={i} className={`flex gap-3 text-xs rounded-lg px-3 py-2 ${isDarkMode ? 'bg-white/3' : 'bg-white border border-gray-100'}`}>
              <span className={`flex-shrink-0 font-mono ${sub}`}>{t.date || '—'}</span>
              <span className={`font-medium flex-shrink-0 ${text}`}>{t.user}</span>
              <span className={`${sub} truncate`}>{t.action}</span>
            </div>
          ))}
        </div>
      )}

      {section.note && <p className={`text-xs italic mt-2 ${sub}`}>{section.note}</p>}
    </section>
  );
}

export default function ReportViewer({ report, isDarkMode, onClose }) {
  const structured = report?.structured;
  const meta = structured?.meta;
  const compliance = structured?.compliance;
  const statusStyle = STATUS_STYLES[compliance?.status?.code] || STATUS_STYLES.partial;
  const text = isDarkMode ? 'text-white' : 'text-gray-900';
  const sub = isDarkMode ? 'text-slate-500' : 'text-gray-500';

  if (!structured) {
    return (
      <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-[#111318] border-white/8' : 'bg-white border-gray-200'}`}>
        <p className={`text-sm ${sub} mb-4`}>Structured report view unavailable. Showing text summary.</p>
        <pre className={`whitespace-pre-wrap text-xs leading-relaxed max-h-96 overflow-y-auto rounded-xl border p-4 ${isDarkMode ? 'border-white/8 bg-[#0d0f14] text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
          {report?.executiveSummary || report?.summary || 'No report content.'}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-indigo-950/80 to-[#111318] border-indigo-500/20' : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-100'}`}>
        <div className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <ScoreRing score={compliance?.score ?? report?.complianceScore} isDarkMode={isDarkMode} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                {compliance?.status?.label || 'Review'}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] ${isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-gray-100 text-gray-600'}`}>
                {meta?.reportTypeLabel || report?.reportType}
              </span>
              {meta?.confidential && (
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20">
                  <Lock className="h-3 w-3" /> Confidential
                </span>
              )}
            </div>
            <h2 className={`text-lg font-bold ${text}`}>{meta?.title || report?.title}</h2>
            <div className={`flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs ${sub}`}>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />
                {meta?.period?.start} — {meta?.period?.end}
              </span>
              <span className="flex items-center gap-1"><User className="h-3 w-3" />
                {meta?.generatedByRoleLabel || report?.viewerRoleLabel}
              </span>
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" />
                {meta?.scopeLabel}
              </span>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className={`rounded-lg p-2 ${isDarkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sections */}
      {(structured.sections || []).map((section) => (
        <SectionBlock key={section.id} section={section} isDarkMode={isDarkMode} />
      ))}
    </div>
  );
}
