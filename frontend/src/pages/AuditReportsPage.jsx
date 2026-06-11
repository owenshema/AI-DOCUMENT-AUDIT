import React, { useState } from 'react';
import { ChevronRight, Shield } from 'lucide-react';
import AppShell from '../components/AppShell';
import RoleReportDetailModal from '../components/RoleReportDetailModal';
import useAuthStore from '../store/authStore';
import {
  ROLE_SECTIONS,
  ROLE_REPORTS,
  sectionsForUserRole,
  reportsForSection,
} from '../config/roleReports';

const ROLE_LABELS = {
  administrator: 'Administrator',
  auditor: 'Auditor',
  document_manager: 'Document Manager',
  viewer: 'Viewer',
};

function ReportCard({ report, isDarkMode, onClick }) {
  const card = isDarkMode
    ? 'bg-[#111318] border-white/8 hover:border-white/20 hover:bg-white/[0.03]'
    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md';

  return (
    <button
      type="button"
      onClick={function () { onClick(report); }}
      className={`group flex w-full items-start justify-between rounded-xl border p-4 text-left transition-all ${card}`}
    >
      <div className="min-w-0 flex-1 pr-3">
        <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{report.title}</p>
        <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>{report.description}</p>
      </div>
      <ChevronRight className={`mt-0.5 h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${isDarkMode ? 'text-slate-600 group-hover:text-slate-400' : 'text-gray-400'}`} />
    </button>
  );
}

function RoleSection({ section, isDarkMode, onSelectReport }) {
  const reports = reportsForSection(section.id);
  const headerBg = isDarkMode ? section.headerClass : section.headerLight;
  const headerText = isDarkMode ? 'text-white' : section.id === 'viewer' ? 'text-blue-800' : section.id === 'document_manager' ? 'text-emerald-800' : section.id === 'auditor' ? 'text-orange-800' : 'text-violet-800';
  const tagBg = isDarkMode ? 'bg-white/15 text-white/90' : 'bg-black/5 text-gray-700';

  return (
    <section className="overflow-hidden rounded-2xl border border-black/5 shadow-sm">
      <div className={`px-5 py-4 ${headerBg}`}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className={`text-base font-bold ${headerText}`}>{section.title}</h2>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tagBg}`}>
            {section.tag}
          </span>
        </div>
        <p className={`mt-1 text-xs ${isDarkMode ? 'text-white/75' : 'opacity-80'} ${headerText}`}>
          {section.scope}
        </p>
      </div>
      <div className={`grid gap-3 p-4 sm:grid-cols-2 ${isDarkMode ? 'bg-[#0d0f14]' : 'bg-gray-50/80'}`}>
        {reports.map(function (report) {
          return (
            <ReportCard
              key={report.id}
              report={report}
              isDarkMode={isDarkMode}
              onClick={onSelectReport}
            />
          );
        })}
      </div>
    </section>
  );
}

export default function AuditReportsPage() {
  const { user, isDarkMode } = useAuthStore();
  const role = user?.role || 'viewer';
  const [selectedReport, setSelectedReport] = useState(null);

  const sections = sectionsForUserRole(role);
  const totalReports = sections.reduce(function (n, s) { return n + reportsForSection(s.id).length; }, 0);
  const text = isDarkMode ? 'text-white' : 'text-gray-900';
  const sub = isDarkMode ? 'text-slate-500' : 'text-gray-500';

  const scopeLabel = role === 'viewer'
    ? 'Personal activity only — you only see reports about your own uploads and findings.'
    : role === 'document_manager'
      ? 'Operational view — pipeline health and inventory across all documents.'
      : role === 'auditor'
        ? 'Your workload and quality insights — queue, completion rates, and common findings.'
        : 'Full system visibility — all role reports plus admin-only analytics.';

  return (
    <AppShell title={role === 'viewer' || role === 'document_manager' ? 'My Reports' : 'Audit Reports'}>
      <div className={`mb-6 rounded-2xl border px-5 py-4 ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/25' : 'bg-indigo-50 border-indigo-100'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <Shield className="h-4 w-4 text-indigo-400" />
          <span className={`text-sm font-semibold ${text}`}>Reports by role</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {ROLE_LABELS[role] || role}
          </span>
          <span className={`text-[10px] ${sub}`}>{totalReports} reports available</span>
        </div>
        <p className={`mt-2 text-sm ${sub}`}>{scopeLabel}</p>
      </div>

      <div className="mb-4">
        <h1 className={`text-xl font-bold ${text}`}>Reports by role</h1>
        <p className={`mt-1 text-sm ${sub}`}>
          Click any report card to view details, summary metrics, and export data.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map(function (section) {
          return (
            <RoleSection
              key={section.id}
              section={section}
              isDarkMode={isDarkMode}
              onSelectReport={setSelectedReport}
            />
          );
        })}
      </div>

      {role === 'administrator' && (
        <p className={`mt-6 text-xs ${sub}`}>
          As admin you can open all {ROLE_REPORTS.length} reports across {ROLE_SECTIONS.length} role sections.
        </p>
      )}

      {selectedReport && (
        <RoleReportDetailModal
          reportMeta={selectedReport}
          isDarkMode={isDarkMode}
          onClose={function () { setSelectedReport(null); }}
        />
      )}
    </AppShell>
  );
}
