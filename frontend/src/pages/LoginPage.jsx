import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader, ShieldCheck, RefreshCw, LogOut, ArrowRight } from 'lucide-react';
import { authAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

const HERO_IMAGE = '/images/login-hero.png';

const inputCls =
  'w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-400 focus:bg-white/15 transition-colors';
const labelCls = 'block text-xs text-white/60 mb-1.5';
const btnPrimary =
  'w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60 transition-colors';
const linkCls = 'text-xs text-indigo-300 hover:text-white transition-colors';

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

export default function LoginPage() {
  const [step, setStep]         = useState('credentials');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId]     = useState('');
  const [otp, setOtp]           = useState('');
  const [error, setError]       = useState('');
  const [emailWarning, setEmailWarning] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser, setToken, logout } = useAuthStore();
  const isPending = isAuthenticated && (user?.approvalStatus === 'pending' || user?.isActive === false);

  const handleSignOut = async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    logout();
    setStep('credentials');
    setOtp('');
    setError('');
  };

  const handleCredentials = async (e) => {
    e.preventDefault();
    setError(''); setEmailWarning(false); setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      if (res.requiresOTP) {
        setUserId(res.userId);
        if (res.devOTP) setOtp(res.devOTP);
        if (res.emailWarning) setEmailWarning(true);
        setStep('otp');
      } else if (res.requiresTOTP) {
        setUserId(res.userId);
        setStep('totp');
      } else if (res.token && res.user) {
        setToken(res.token || res.accessToken);
        setUser(res.user);
        localStorage.setItem('user', JSON.stringify(res.user));
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
    setLoading(false);
  };

  const handleOTP = async () => {
    if (otp.length !== 6) return setError('Enter the 6-digit code from your email.');
    setError(''); setLoading(true);
    try {
      const res = await authAPI.verifyOTP(userId, otp, 'login');
      setToken(res.token || res.accessToken);
      setUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired code.');
    }
    setLoading(false);
  };

  const handleTOTP = async () => {
    if (otp.length !== 6) return setError('Enter the 6-digit code from your authenticator app.');
    setError(''); setLoading(true);
    try {
      const res = await authAPI.verifyTOTP(userId, otp);
      setToken(res.token || res.accessToken);
      setUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid authenticator code.');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true); setError('');
    try {
      const res = await authAPI.resendOTP(userId, 'login');
      if (res.devOTP) setOtp(res.devOTP);
      setEmailWarning(!!res.emailWarning);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend code. Try again.');
    }
    setResending(false);
  };

  const ErrorBanner = () => error ? (
    <div className="mb-4 flex gap-2 rounded-xl border border-red-400/30 bg-red-500/15 p-3">
      <AlertCircle className="h-4 w-4 text-red-300 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-red-300">{error}</p>
    </div>
  ) : null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left: dark form panel ── */}
      <div className="relative w-full lg:w-1/2 flex flex-col min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d2044] to-[#1a3a6b]" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, #4f6ef7 0%, transparent 50%), radial-gradient(circle at 75% 20%, #0ea5e9 0%, transparent 40%)' }} />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Logo header */}
          <div className="px-8 sm:px-12 pt-8">
            <Link to="/" className="inline-flex items-center gap-3">
              <img src="/sifco/logo.png" alt="SIFCO AE" className="h-10 w-auto brightness-0 invert"
                onError={e => { e.target.style.display = 'none'; }} />
              <div>
                <p className="text-sm font-bold text-white leading-none">DocAudit AI</p>
                <p className="text-[10px] text-white/50 mt-0.5">SIFCO AE · Audit System</p>
              </div>
            </Link>
          </div>

          {/* Form area */}
          <div className="flex-1 flex items-center justify-center px-8 sm:px-12 py-10">
            <div className="w-full max-w-sm">
              <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-7 shadow-2xl">
                {isAuthenticated && !isPending && step === 'credentials' && (
                  <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                    <p className="text-xs text-amber-100 mb-2">
                      You are already signed in as <span className="font-semibold">{user?.fullName || user?.email}</span>.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button type="button" onClick={() => navigate('/dashboard', { replace: true })}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400">
                        Continue to Dashboard <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={handleSignOut}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10">
                        <LogOut className="h-3.5 w-3.5" /> Sign in as someone else
                      </button>
                    </div>
                  </div>
                )}

                {isPending && (
                  <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                    Your account is pending approval.{' '}
                    <Link to="/pending-approval" className="underline hover:text-white">View status</Link>
                  </div>
                )}

                {/* ── Credentials ── */}
                {step === 'credentials' && (
                  <>
                    <h2 className="text-base font-semibold text-white mb-5">Sign in to your account</h2>
                    <ErrorBanner />
                    <form onSubmit={handleCredentials} className="space-y-4" autoComplete="off">
                      <div>
                        <label className={labelCls}>Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                          <input type="email" name="login-email" value={email} onChange={e => setEmail(e.target.value)}
                            autoComplete="off" className={inputCls} required />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                          <input type="password" name="login-password" value={password} onChange={e => setPassword(e.target.value)}
                            autoComplete="off" className={inputCls}
                            placeholder="••••••••" required />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Link to="/forgot-password" className={linkCls}>Forgot password?</Link>
                      </div>
                      <button type="submit" disabled={loading} className={btnPrimary}>
                        {loading ? <><Loader className="h-4 w-4 animate-spin" /> Signing in...</> : 'Sign In'}
                      </button>
                    </form>
                    <p className="mt-5 text-center text-xs text-white/40">
                      No account? <Link to="/register" className="text-indigo-300 hover:text-white transition-colors">Register</Link>
                    </p>
                  </>
                )}

                {/* ── Email OTP ── */}
                {step === 'otp' && (
                  <>
                    <div className="text-center mb-5">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/30 border border-indigo-400/30 mb-3">
                        <ShieldCheck className="h-6 w-6 text-indigo-300" />
                      </div>
                      <h2 className="text-base font-semibold text-white">Check your email</h2>
                      <p className="text-xs text-white/50 mt-1">
                        {emailWarning
                          ? <>We could not deliver the email. Use <span className="text-white/80">Resend code</span> below or check spam.</>
                          : <>We sent a 6-digit code to <span className="text-white/80">{email}</span></>}
                      </p>
                    </div>
                    {emailWarning && (
                      <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>Email delivery failed. Your code is still valid — tap Resend code to try again.</span>
                      </div>
                    )}
                    <ErrorBanner />
                    <OTPInput value={otp} onChange={setOtp} />
                    <button onClick={handleOTP} disabled={loading || otp.length !== 6}
                      className={`${btnPrimary} mt-2`}>
                      {loading ? <><Loader className="h-4 w-4 animate-spin" /> Verifying...</> : 'Verify Code'}
                    </button>
                    <div className="flex items-center justify-between mt-4">
                      <button onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
                        className="text-xs text-white/40 hover:text-white/70 transition-colors">← Back</button>
                      <button onClick={handleResend} disabled={resending}
                        className="flex items-center gap-1 text-xs text-indigo-300 hover:text-white disabled:opacity-50 transition-colors">
                        <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
                        {resending ? 'Sending...' : 'Resend code'}
                      </button>
                    </div>
                  </>
                )}

                {/* ── TOTP ── */}
                {step === 'totp' && (
                  <>
                    <div className="text-center mb-5">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/30 border border-indigo-400/30 mb-3">
                        <ShieldCheck className="h-6 w-6 text-indigo-300" />
                      </div>
                      <h2 className="text-base font-semibold text-white">Authenticator code</h2>
                      <p className="text-xs text-white/50 mt-1">Enter the 6-digit code from your authenticator app</p>
                    </div>
                    <ErrorBanner />
                    <OTPInput value={otp} onChange={setOtp} />
                    <button onClick={handleTOTP} disabled={loading || otp.length !== 6}
                      className={`${btnPrimary} mt-2`}>
                      {loading ? <><Loader className="h-4 w-4 animate-spin" /> Verifying...</> : 'Verify'}
                    </button>
                    <button onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
                      className="w-full mt-3 text-xs text-white/40 hover:text-white/70 transition-colors">← Back</button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer line */}
          <div className="px-8 sm:px-12 pb-6">
            <hr className="border-white/10" />
          </div>
        </div>
      </div>

      {/* ── Right: hero image ── */}
      <div className="hidden lg:block lg:w-1/2 relative min-h-screen">
        <img src={HERO_IMAGE} alt="SIFCO logistics"
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1600&q=80'; }} />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#0a1628]/30" />
      </div>
    </div>
  );
}
