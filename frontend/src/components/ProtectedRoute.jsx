import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // If account is pending approval, redirect to waiting page
  if (user?.approvalStatus === 'pending' || user?.isActive === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  const role = user?.role || 'viewer';
  const allowed = Array.isArray(requiredRole) ? requiredRole : requiredRole ? [requiredRole] : null;
  const hasRole = !allowed || allowed.includes(role);

  if (!hasRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0f14]">
        <div className="text-center max-w-sm">
          <div className="h-16 w-16 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <ShieldOff className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-sm text-slate-400 mb-2">
            Your role <span className="text-white font-semibold capitalize">{role.replace(/_/g,' ')}</span> does not have permission to access this page.
          </p>
          <p className="text-xs text-slate-600 mb-6">Required: {allowed?.join(' or ')}</p>
          <Link to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
