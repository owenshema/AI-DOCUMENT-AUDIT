import React from 'react';
import { Clock, Mail, LogOut, RefreshCw } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function PendingApprovalPage() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-white font-bold text-lg">DocAudit AI</span>
          </div>
          <p className="text-slate-500 text-xs">SIFCO AE · Document Audit System</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-[#111318] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-400" />
          </div>

          <h1 className="text-xl font-bold text-white mb-2">Account Pending Approval</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Your <span className="text-white font-medium capitalize">{user?.role?.replace(/_/g, ' ')}</span> account
            has been submitted and is awaiting administrator approval.
          </p>

          <div className="rounded-xl border border-white/8 bg-white/3 p-4 mb-6 text-left space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-indigo-400 text-[10px] font-bold">1</span>
              </div>
              <p className="text-xs text-slate-400">Your email has been verified successfully.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-400 text-[10px] font-bold">2</span>
              </div>
              <p className="text-xs text-slate-400">Waiting for administrator to review and approve your account.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-slate-500 text-[10px] font-bold">3</span>
              </div>
              <p className="text-xs text-slate-500">Once approved, you'll receive an email notification to log in.</p>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 mb-6 flex items-start gap-2">
            <Mail className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 text-left">
              You'll receive an email at <span className="text-white font-medium">{user?.email}</span> when your account is approved.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={handleRefresh}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-slate-300 hover:bg-white/8 hover:text-white transition-colors">
              <RefreshCw className="h-4 w-4" /> Check Status
            </button>
            <button onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-slate-300 hover:bg-white/8 hover:text-white transition-colors">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Contact your administrator if you need immediate access.
        </p>
      </div>
    </div>
  );
}
