import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage            from './pages/HomePage';
import LoginPage           from './pages/LoginPage';
import RegisterPage        from './pages/RegisterPage';
import ForgotPasswordPage  from './pages/ForgotPasswordPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import DashboardPage       from './pages/DashboardPage';
import DocumentsPage       from './pages/DocumentsPage';
import AIAnalysisPage      from './pages/AIAnalysisPage';
import AuditReportsPage    from './pages/AuditReportsPage';
import SearchPage          from './pages/SearchPage';
import WorkflowPage        from './pages/WorkflowPage';
import UsersPage           from './pages/UsersPage';

export default function App() {
  const { isAuthenticated, user, hydrateAuth } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrateAuth().finally(() => setHydrated(true));
  }, [hydrateAuth]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const isPending = isAuthenticated && (user?.approvalStatus === 'pending' || user?.isActive === false);

  return (
    <Router>
      <Routes>
        <Route path="/"                element={<HomePage />} />
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route path="/pending-approval" element={
          isAuthenticated ? <PendingApprovalPage /> : <Navigate to="/login" replace />
        } />

        <Route path="/dashboard"     element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/documents"     element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
        <Route path="/audit-reports" element={<ProtectedRoute><AuditReportsPage /></ProtectedRoute>} />
        <Route path="/search"        element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />

        <Route path="/ai-analysis" element={
          <ProtectedRoute requiredRole={['auditor']}>
            <AIAnalysisPage />
          </ProtectedRoute>
        } />
        <Route path="/workflow" element={
          <ProtectedRoute requiredRole={['administrator','auditor']}>
            <WorkflowPage />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute requiredRole={['administrator']}>
            <UsersPage />
          </ProtectedRoute>
        } />

        <Route path="*" element={
          <div className="flex min-h-screen items-center justify-center bg-[#0d0f14]">
            <div className="text-center">
              <p className="text-5xl font-bold text-white mb-3">404</p>
              <p className="text-slate-400 mb-6">Page not found</p>
              <a href="/dashboard" className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600">
                Go to Dashboard
              </a>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}
