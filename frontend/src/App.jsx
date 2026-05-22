import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage           from './pages/HomePage';
import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage      from './pages/DashboardPage';
import DocumentsPage      from './pages/DocumentsPage';
import AIAnalysisPage     from './pages/AIAnalysisPage';
import AuditReportsPage   from './pages/AuditReportsPage';
import WorkflowPage       from './pages/WorkflowPage';
import UsersPage          from './pages/UsersPage';

export default function App() {
  const { isAuthenticated, hydrateAuth } = useAuthStore();

  useEffect(() => { hydrateAuth(); }, [hydrateAuth]);

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/"                element={<HomePage />} />
        <Route path="/login"           element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register"        element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
        <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard" /> : <ForgotPasswordPage />} />

        {/* All authenticated roles */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />

        {/* Auditor + Document Manager + Admin */}
        <Route path="/ai-analysis" element={
          <ProtectedRoute requiredRole={['administrator','auditor','document_manager']}>
            <AIAnalysisPage />
          </ProtectedRoute>
        } />
        <Route path="/audit-reports" element={
          <ProtectedRoute requiredRole={['administrator','auditor','document_manager']}>
            <AuditReportsPage />
          </ProtectedRoute>
        } />
        <Route path="/workflow" element={
          <ProtectedRoute requiredRole={['administrator','auditor','document_manager']}>
            <WorkflowPage />
          </ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="/users" element={
          <ProtectedRoute requiredRole={['administrator']}>
            <UsersPage />
          </ProtectedRoute>
        } />

        {/* 404 */}
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
