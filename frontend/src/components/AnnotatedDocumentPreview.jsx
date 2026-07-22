import React, { useEffect, useState } from 'react';
import { documentAPI } from '../api/auth';

/**
 * In-document preview: red ✕ marks on lines where the audit found mistakes.
 * Marks summary is always shown at the top of the document.
 */
export default function AnnotatedDocumentPreview({ documentId, isDarkMode, compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErr('');
    documentAPI.getMarkedView(documentId)
      .then(res => { if (active) setData(res); })
      .catch(e => {
        if (active) setErr(e?.response?.data?.error || 'Could not load marked document view.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [documentId]);

  const text = isDarkMode ? 'text-white' : 'text-gray-900';
  const sub = isDarkMode ? 'text-slate-500' : 'text-gray-500';
  const box = isDarkMode ? 'bg-[#0b1a2e] border-white/10' : 'bg-gray-50 border-gray-200';

  if (loading) {
    return <p className={`text-xs ${sub}`}>Loading document with red marks…</p>;
  }
  if (err) {
    return <p className="text-xs text-red-400">{err}</p>;
  }
  if (!data?.lines?.length) {
    return <p className={`text-xs ${sub}`}>No document text available for inline marks.</p>;
  }

  const topMarks = [
    ...(data.markup || []).filter(m => m.lineIndex != null),
    ...(data.unplacedMarks || []),
  ];

  return (
    <div>
      {/* Marks always appear at the top of the document view */}
      <div className={`mb-3 rounded-xl border border-red-500/40 p-3 ${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-red-500">
          Audit marks at top of document
        </p>
        <p className={`mt-1 text-[11px] ${sub}`}>
          Red <span className="font-bold text-red-500">✕</span> marks ({data.totalMarks} issue{data.totalMarks !== 1 ? 's' : ''})
        </p>
        {topMarks.length === 0 ? (
          <p className={`mt-2 text-[11px] ${sub}`}>No mistakes flagged.</p>
        ) : (
          <ul className="mt-2 max-h-36 space-y-1.5 overflow-y-auto">
            {topMarks.map((m, i) => (
              <li key={m.id || `${i}-${m.text}`} className="text-[11px] text-red-500">
                <span className="font-bold">✕ {i + 1}.</span>{' '}
                <span className="font-semibold uppercase text-[10px] opacity-80">
                  {(m.type || 'issue').replace(/_/g, ' ')}
                </span>
                {' — '}
                {m.text}
                {m.lineIndex != null ? (
                  <span className={`ml-1 ${sub}`}>(line {m.lineIndex + 1})</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className={`overflow-y-auto rounded-xl border p-3 font-mono text-xs leading-relaxed ${box}`}
        style={{ maxHeight: compact ? '12rem' : '16rem' }}
      >
        {data.lines.map(row => (
          <div
            key={row.lineNumber}
            className={`flex gap-2 py-0.5 ${row.hasMark
              ? isDarkMode ? 'bg-red-500/10 border-l-2 border-red-500 pl-2 -ml-1' : 'bg-red-50 border-l-2 border-red-500 pl-2 -ml-1'
              : ''}`}
          >
            <span className={`flex-shrink-0 w-4 ${row.hasMark ? 'text-red-500 font-bold' : sub}`}>
              {row.hasMark ? '✕' : ' '}
            </span>
            <span className={`flex-1 whitespace-pre-wrap break-words ${row.hasMark ? 'text-red-500 font-semibold line-through decoration-red-500' : text}`}>
              {row.text || '\u00A0'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
