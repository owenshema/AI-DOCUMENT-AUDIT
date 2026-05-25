import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Building2, AlertCircle, Loader, ShieldCheck, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { authAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak',        color: 'bg-red-500',     width: '20%' };
  if (score <= 2) return { label: 'Fair',        color: 'bg-amber-500',   width: '40%' };
  if (score <= 3) return { label: 'Good',        color: 'bg-yellow-400',  width: '60%' };
  if (score <= 4) return { label: 'Strong',      color: 'bg-emerald-500', width: '80%' };
  return               { label: 'Very Strong',  color: 'bg-emerald-400', width: '100%' };
}

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
  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(p.padEnd(6, '').slice(0, 6));
    refs[Math.min(p.length, 5)].current?.focus();
  };
  return (
    <div className="flex gap-2 justify-center my-4">
      {digits.map((d, i) => (
        <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
          value={d} onChange={() => {}} onKeyDown={e => handleKey(i, e)} onPaste={handlePaste}
          className="h-12 w-10 rounded-xl border border-white/20 bg-white/10 text-center text-lg font-bold text-white outline-none focus:border-indigo-400 focus:bg-white/15 transition-colors" />
      ))}
    </div>
  );
};

const inputCls = "w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-400 focus:bg-white/15 transition-colors";
const DEPARTMENTS = ['General', 'Finance', 'HR', 'IT', 'Compliance', 'Operations', 'Procurement', 'Logistics', 'Legal'];

export default function RegisterPage() {
  const [step, setStep]     = useState('form');
  const [userId, setUserId] = useState('');
  const [otp, setOtp]       = useState('');
  const [showPw, setShowPw] = useState(false);
  const [form, setForm]     = useState({ fullName: '', email: '', password: '', confirmPassword: '', department: '', role: 'viewer', phone: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();

  const strength = form.password ? passwordStrength(form.password) : null;
  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    if (!/[A-Z]/.test(form.password)) return setError('Password must contain at least one uppercase letter');
    if (!/[0-9]/.test(form.password)) return setError('Password must contain at least one number');
    setLoading(true);
    try {
      const res = await authAPI.register({ fullName: form.fullName, email: form.email, password: form.password, department: form.department, role: form.role, phone: form.phone });
      setUserId(res.userId);
      if (res.devOTP) setOtp(res.devOTP);
      setStep('verify');
    } catch (err) { setError(err.response?.data?.error || 'Registration failed.'); }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return setError('Enter the 6-digit code from your email.');
    setError(''); setLoading(true);
    try {
      const res = await authAPI.verifyOTP(userId, otp, 'verify_email');
      setToken(res.token || res.accessToken);
      setUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));
      navigate('/dashboard', { replace: true });
    } catch (err) { setError(err.response?.data?.error || 'Invalid or expired code.'); }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    try { await authAPI.resendOTP(userId, 'verify_email'); } catch {}
    setResending(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 py-10">
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

          {/* ── Registration form ── */}
          {step === 'form' && (
            <>
              <h2 className="text-base font-semibold text-white mb-5">Create Account</h2>
              {error && (
                <div className="mb-4 flex gap-2 rounded-xl border border-red-400/30 bg-red-500/15 p-3">
                  <AlertCircle className="h-4 w-4 text-red-300 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input name="fullName" value={form.fullName} onChange={handleChange} required
                      className={inputCls} placeholder="John Smith" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input name="email" type="email" value={form.email} onChange={handleChange} required
                      className={inputCls} placeholder="you@sifco.local" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Department *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <select name="department" value={form.department} onChange={handleChange} required
                      className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-400 focus:bg-white/15 transition-colors">
                      <option value="" className="bg-[#0d2044]">Select department</option>
                      {DEPARTMENTS.map(dept => <option key={dept} value={dept} className="bg-[#0d2044]">{dept}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Role</label>
                  <select name="role" value={form.role} onChange={handleChange}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400 transition-colors">
                    <option value="viewer" className="bg-[#0d2044]">Viewer</option>
                    <option value="document_manager" className="bg-[#0d2044]">Document Manager</option>
                    <option value="auditor" className="bg-[#0d2044]">Auditor</option>
                  </select>
                  {form.role !== 'viewer' && (
                    <p className="mt-1 text-[10px] text-amber-200/80">This role requires administrator approval before sign-in.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={handleChange} required
                      className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pl-9 pr-9 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-400 focus:bg-white/15 transition-colors"
                      placeholder="Min 8 chars, 1 uppercase, 1 number" />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {strength && (
                    <div className="mt-1.5">
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} />
                      </div>
                      <p className="text-[10px] text-white/40 mt-0.5">{strength.label}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required
                      className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/30 outline-none bg-white/10 transition-colors ${
                        form.confirmPassword && form.password !== form.confirmPassword
                          ? 'border-red-400/50 focus:border-red-400' : 'border-white/20 focus:border-indigo-400 focus:bg-white/15'
                      }`}
                      placeholder="••••••••" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60 transition-colors mt-1">
                  {loading ? <><Loader className="h-4 w-4 animate-spin" /> Creating account...</> : 'Create Account'}
                </button>
              </form>
              <p className="mt-5 text-center text-xs text-white/40">
                Already have an account? <Link to="/login" className="text-indigo-300 hover:text-white transition-colors">Sign in</Link>
              </p>
            </>
          )}

          {/* ── Email verification ── */}
          {step === 'verify' && (
            <>
              <div className="text-center mb-5">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/25 border border-emerald-400/30 mb-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-300" />
                </div>
                <h2 className="text-base font-semibold text-white">Verify your email</h2>
                <p className="text-xs text-white/50 mt-1">
                  We sent a 6-digit code to <span className="text-white/80">{form.email}</span>
                </p>
              </div>
              {error && (
                <div className="mb-4 flex gap-2 rounded-xl border border-red-400/30 bg-red-500/15 p-3">
                  <AlertCircle className="h-4 w-4 text-red-300 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}
              <OTPInput value={otp} onChange={setOtp} />
              <button onClick={handleVerify} disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60 transition-colors">
                {loading ? <><Loader className="h-4 w-4 animate-spin" /> Verifying...</> : 'Verify & Continue'}
              </button>
              <div className="flex items-center justify-between mt-4">
                <button onClick={() => { setStep('form'); setOtp(''); setError(''); }}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors">← Back</button>
                <button onClick={handleResend} disabled={resending}
                  className="flex items-center gap-1 text-xs text-indigo-300 hover:text-white disabled:opacity-50 transition-colors">
                  <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
