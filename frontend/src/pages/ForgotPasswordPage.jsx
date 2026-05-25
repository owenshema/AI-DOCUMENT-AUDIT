import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import apiClient from '../api/client';

const OTPInput = ({ value, onChange }) => {
  const ref0 = useRef(null); const ref1 = useRef(null);
  const ref2 = useRef(null); const ref3 = useRef(null);
  const ref4 = useRef(null); const ref5 = useRef(null);
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);
  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      onChange(digits.map((d, idx) => idx === i ? '' : d).join(''));
      if (i > 0) refs[i - 1].current?.focus();
    } else if (/^\d$/.test(e.key)) {
      onChange(digits.map((d, idx) => idx === i ? e.key : d).join(''));
      if (i < 5) refs[i + 1].current?.focus();
    }
  };
  return (
    <div className="flex gap-2 justify-center my-4">
      {digits.map((d, i) => (
        <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
          value={d} onChange={() => {}} onKeyDown={e => handleKey(i, e)}
          className="h-12 w-10 rounded-xl border border-white/20 bg-white/10 text-center text-lg font-bold text-white outline-none focus:border-indigo-400 focus:bg-white/15 transition-colors" />
      ))}
    </div>
  );
};

export default function ForgotPasswordPage() {
  const [step, setStep]       = useState('email');
  const [email, setEmail]     = useState('');
  const [userId, setUserId]   = useState('');
  const [otp, setOtp]         = useState('');
  const [newPw, setNewPw]     = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const inputCls = "w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-400 focus:bg-white/15 transition-colors";

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await apiClient.post('/auth/request-password-reset', { email });
      if (res.data.userId) setUserId(res.data.userId);
      if (res.data.devOTP) setOtp(res.data.devOTP);
      setStep('otp');
    } catch (err) { setError(err.response?.data?.error || 'Request failed.'); }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return setError('Enter the 6-digit code.');
    setError(''); setLoading(true);
    try {
      await apiClient.post('/auth/verify-otp', { userId, otp, purpose: 'reset_password' });
      setStep('newpw');
    } catch (err) { setError(err.response?.data?.error || 'Invalid or expired code.'); }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPw.length < 8) return setError('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(newPw)) return setError('Password must contain at least one uppercase letter.');
    if (!/[0-9]/.test(newPw)) return setError('Password must contain at least one number.');
    setError(''); setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { userId, otp, newPassword: newPw });
      navigate('/login');
    } catch (err) { setError(err.response?.data?.error || 'Reset failed.'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Same background as landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d2044] to-[#1a3a6b]" />
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, #4f6ef7 0%, transparent 50%), radial-gradient(circle at 75% 20%, #0ea5e9 0%, transparent 40%)' }} />
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-7">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <img src="/sifco/logo.png" alt="SIFCO AE" className="h-10 w-auto brightness-0 invert"
              onError={e => { e.target.style.display='none'; }} />
            <div>
              <p className="text-lg font-bold text-white leading-none">DocAudit AI</p>
              <p className="text-xs text-white/50 mt-0.5">SIFCO AE · Audit System</p>
            </div>
          </Link>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-7 shadow-2xl">
          {error && (
            <div className="mb-4 flex gap-2 rounded-xl border border-red-400/30 bg-red-500/15 p-3">
              <AlertCircle className="h-4 w-4 text-red-300 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {step === 'email' && (
            <>
              <h2 className="text-base font-semibold text-white mb-2">Reset Password</h2>
              <p className="text-xs text-white/50 mb-5">Enter your email and we'll send you a reset code.</p>
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className={inputCls} placeholder="you@sifco.local" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60 transition-colors">
                  {loading ? <><Loader className="h-4 w-4 animate-spin" /> Sending...</> : 'Send Reset Code'}
                </button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="text-center mb-4">
                <ShieldCheck className="mx-auto h-8 w-8 text-indigo-300 mb-2" />
                <p className="text-sm text-white/80">Enter the 6-digit code sent to <span className="text-white">{email}</span></p>
              </div>
              <OTPInput value={otp} onChange={setOtp} />
              <button onClick={handleVerifyOTP} disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60 transition-colors">
                {loading ? <><Loader className="h-4 w-4 animate-spin" /> Verifying...</> : 'Verify Code'}
              </button>
            </>
          )}

          {step === 'newpw' && (
            <>
              <h2 className="text-base font-semibold text-white mb-5">Set new password</h2>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} required
                    className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pl-9 pr-9 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-400 focus:bg-white/15 transition-colors"
                    placeholder="New password" />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60 transition-colors">
                  {loading ? <><Loader className="h-4 w-4 animate-spin" /> Resetting...</> : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          <div className="mt-5 text-center">
            <Link to="/login" className="text-xs text-white/40 hover:text-white/70 transition-colors">← Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
