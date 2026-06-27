import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderOpen, Bot, FileBarChart2,
  GitBranch, LogOut, Menu, ChevronDown, Sun, Moon, Search, ClipboardList, LogIn,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { formatRoleLabel, ROLE_LABELS, normalizeRole } from '../config/roles';
import { authAPI } from '../api/auth';
import GlobalSearchBar from './GlobalSearchBar';
import NotificationBell from './NotificationBell';

// â”€â”€ Role-based nav config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// roles: null = all, array = restricted to those roles
const DARK_BG = 'bg-[#0f0f0f]';
const DARK_SURFACE = 'bg-[#0f0f0f]';
const LIGHT_BG = 'bg-gray-50';
const LIGHT_SURFACE = 'bg-white';

const ALL_NAV = [
  { path: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard',     roles: null },
  { path: '/search',         icon: Search,          label: 'Search',        roles: null },
  { path: '/documents',     icon: FolderOpen,      label: 'My Documents',  roles: ['client', 'document_manager'] },
  { path: '/document-management', icon: ClipboardList, label: 'Document Management', roles: ['document_manager', 'administrator'] },
  { path: '/documents',     icon: FolderOpen,      label: 'Document Hub',  roles: ['administrator','auditor'] },
  { path: '/ai-analysis',   icon: Bot,             label: 'AI Analysis',   roles: ['auditor'] },
  { path: '/audit-reports', icon: FileBarChart2,   label: 'My Reports',    roles: ['client', 'document_manager'] },
  { path: '/audit-reports', icon: FileBarChart2,   label: 'Audit Reports', roles: ['administrator','auditor'] },
  { path: '/workflow',      icon: GitBranch,       label: 'Workflow',      roles: ['administrator', 'auditor', 'document_manager'] },
  { path: '/users',         icon: Users,           label: 'Users & Auth',  roles: ['administrator'] },
  { path: '/login-activity', icon: LogIn,          label: 'Login Activity', roles: ['administrator'] },
];

// Role descriptions shown in sidebar
const ROLE_BADGE = {
  administrator:   { label: 'Administrator', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' },
  auditor:         { label: 'Auditor',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'    },
  document_manager:{ label: 'Doc Manager',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  client: { label: ROLE_LABELS.client, color: 'bg-gray-100 text-gray-600 dark:bg-slate-500/20 dark:text-slate-400'  },
};

export default function AppShell({ children, title }) {
  const { user, logout, isDarkMode, toggleTheme } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropOpen, setDropOpen]     = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const role     = normalizeRole(user?.role);
  const initials = (user?.fullName || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const badge    = ROLE_BADGE[role] || ROLE_BADGE.client;

  // Filter nav by role
  const visibleNav = ALL_NAV.filter(n => !n.roles || n.roles.includes(role));

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login', { replace: true });
  };

  // Theme classes — low-contrast, matching surfaces
  const bg       = isDarkMode ? DARK_BG : LIGHT_BG;
  const surface  = isDarkMode ? DARK_SURFACE : LIGHT_SURFACE;
  const text     = isDarkMode ? 'text-white' : 'text-gray-900';
  const subtext  = isDarkMode ? 'text-slate-400' : 'text-gray-500';
  const navActive = isDarkMode
    ? 'bg-white/[0.08] text-white font-medium'
    : 'bg-indigo-50 text-indigo-700 font-medium';
  const navIdle  = isDarkMode
    ? 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';
  const SidebarContent = ({ collapsed = false }) => (
    <div className={`flex h-full flex-col ${surface}`}>
      {/* Brand */}
      <div className={`${collapsed ? 'px-3' : 'px-5'} pt-5 pb-4`}>
        {collapsed ? (
          <div className="flex justify-center">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'} text-white`}>
              S
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <img src="/sifco/logo.png" alt="SIFCO" className="h-8 w-auto"
              onError={e => { e.target.style.display='none'; }} />
            <div>
              <p className={`text-sm font-bold leading-none ${text}`}>DocAudit AI</p>
              <p className={`text-[10px] mt-0.5 ${subtext}`}>SIFCO AE · Audit System</p>
            </div>
          </div>
        )}
      </div>

      {/* Role badge - hide when collapsed */}
      {!collapsed && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'} text-white`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-semibold truncate ${text}`}>{user?.fullName || 'User'}</p>
              <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold mt-0.5 ${badge.color}`}>
                {badge.label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map(({ path, icon: Icon, label }) => {
          const active = pathname === path;
          return (
            <Link key={`${path}-${label}`} to={path} onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-xl px-3 py-2.5 text-sm transition-all ${active ? navActive : navIdle}`}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 pt-2 space-y-1">
        <button onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={`flex w-full items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-xl px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors`}>
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen ${bg} overflow-hidden`}>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-60">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className={`flex items-center justify-between px-5 py-3 ${surface}`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button className={`${subtext} hover:${text} transition-colors flex-shrink-0`} 
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileOpen(true);
                } else {
                  setSidebarCollapsed(p => !p);
                }
              }}>
              <Menu className="h-5 w-5" />
            </button>
            <h1 className={`text-base font-semibold flex-shrink-0 ${text}`}>{title || 'Dashboard'}</h1>
            <div className="hidden md:block flex-1 max-w-xl ml-4">
              <GlobalSearchBar />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell isDarkMode={isDarkMode} />

            <button onClick={toggleTheme}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`rounded-lg p-2 transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-white/[0.06] hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* User menu */}
            <div className="relative">
              <button onClick={() => setDropOpen(p => !p)}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors ${isDarkMode ? 'bg-white/[0.06] hover:bg-white/[0.09]' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className={`text-xs font-medium leading-none ${text}`}>{user?.fullName || 'User'}</p>
                  <p className={`text-[10px] mt-0.5 ${subtext}`}>{formatRoleLabel(role)}</p>
                </div>
                <ChevronDown className={`h-3 w-3 ${subtext}`} />
              </button>
              {dropOpen && (
                <div className={`absolute right-0 top-11 z-20 w-44 rounded-xl shadow-2xl shadow-black/40 p-1 ${isDarkMode ? 'bg-[#212121]' : 'bg-white ring-1 ring-black/5'}`}>
                  <div className={`px-3 py-2 mb-1 ${isDarkMode ? '' : 'border-b border-gray-100'}`}>
                    <p className={`text-xs font-semibold ${text}`}>{user?.fullName}</p>
                    <p className={`text-[10px] ${subtext}`}>{user?.email}</p>
                    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold mt-1 ${badge.color}`}>{badge.label}</span>
                  </div>
                  <button onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`card-surface flex-1 overflow-y-auto p-5 sm:p-6 ${bg}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
