import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { FEATURE_LOGIC, PROCESS_STAGES, ROLE_PERMISSIONS } from '../config/auditLogic';
import {
  Bell,
  Bot,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
} from 'lucide-react';

const FeaturePage = ({ featureKey }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [query, setQuery] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const feature = FEATURE_LOGIC[featureKey];
  const roleConfig = ROLE_PERMISSIONS[user?.role] || ROLE_PERMISSIONS.viewer;
  const hasAccess = roleConfig.allowed.includes(featureKey);
  const initials = (user?.fullName || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleActionClick = (action) => {
    const routeByAction = {
      'Upload files': '/documents',
      'Search documents': '/documents',
      'Run compliance check': '/compliance',
      'Export reports': '/audit-reports',
      'Manage users': '/user-access',
      'Apply retention policy': '/settings',
    };
    const route = routeByAction[action];
    if (route) {
      navigate(route);
      return;
    }
    setActionMessage(`Action triggered: ${action}`);
  };

  const handleOpenNotifications = () => {
    setActionMessage('Notification center opened for this module.');
  };

  if (!feature) {
    return (
      <div className="min-h-screen bg-white py-12">
        <div className="container-main">
          <h1 className="text-3xl font-bold text-slate-900">Module Not Found</h1>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white py-12">
        <div className="container-main">
          <h1 className="text-3xl font-bold text-slate-900">{feature.title}</h1>
          <p className="mt-3 text-red-600">
            Your role does not have access to this module. Contact an administrator for permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="hidden min-h-screen w-64 border-r border-slate-200 bg-white px-5 py-6 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">S</div>
            <p className="text-lg font-bold text-slate-900">SIFCO AE</p>
          </div>
          <nav className="space-y-1 text-sm">
            <Link to="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            <Link to="/documents" className={`flex items-center gap-3 rounded-lg px-3 py-2 ${featureKey === 'documents' ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <FileText className="h-4 w-4" /> Documents
            </Link>
            <Link to="/ai-analysis" className={`flex items-center gap-3 rounded-lg px-3 py-2 ${featureKey === 'ai-analysis' ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Bot className="h-4 w-4" /> AI Analysis
            </Link>
            <Link to="/compliance" className={`flex items-center gap-3 rounded-lg px-3 py-2 ${featureKey === 'compliance' ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <ClipboardCheck className="h-4 w-4" /> Compliance
            </Link>
            <Link to="/audit-reports" className={`flex items-center gap-3 rounded-lg px-3 py-2 ${featureKey === 'audit-reports' ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <FileText className="h-4 w-4" /> Audit Reports
            </Link>
            <Link to="/user-access" className={`flex items-center gap-3 rounded-lg px-3 py-2 ${featureKey === 'user-access' ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <UserCog className="h-4 w-4" /> User Access
            </Link>
            <Link to="/settings" className={`flex items-center gap-3 rounded-lg px-3 py-2 ${featureKey === 'settings' ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Settings className="h-4 w-4" /> Settings
            </Link>
          </nav>
          <button onClick={handleLogout} className="mt-8 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </aside>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-300"
                  placeholder={`Search in ${feature.title}...`}
                />
              </div>
              <button onClick={handleOpenNotifications} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                <Bell className="h-4 w-4" />
              </button>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{user?.fullName || 'User'}</p>
                <p className="text-xs capitalize text-slate-500">{user?.role?.replace('_', ' ') || 'viewer'}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{initials}</div>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-3xl font-bold text-slate-900">{feature.title}</h1>
            <p className="mt-2 text-slate-600">{feature.objective}</p>
            <span className="mt-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-primary-700">
              Role: {roleConfig.label}
            </span>
            {actionMessage && <p className="mt-3 text-sm text-blue-700">{actionMessage}</p>}
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-xl font-bold text-slate-900">Actions</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {feature.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleActionClick(action)}
                  className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-100"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">System Logic Flow</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {PROCESS_STAGES.map((stage) => (
                <div key={stage.key} className="rounded-xl border border-blue-100 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-primary-700">{stage.title}</h3>
                  <div className="mt-3 space-y-2">
                    {stage.steps.map((step) => (
                      <p key={step} className="text-sm text-slate-600">- {step}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FeaturePage;
