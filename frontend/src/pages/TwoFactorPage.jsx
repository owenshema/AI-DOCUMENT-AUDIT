import React, { useState, useRef } from 'react';
import { ShieldCheck, ShieldOff, Loader, AlertCircle, CheckCircle2, Mail, Send } from 'lucide-react';
import AppShell from '../components/AppShell';
import apiClient from '../api/client';
import useAuthStore from '../store/authStore';

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
    <div className="flex gap-2 my-4">
      {digits.map((d, i) => (
        <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
          value={d} onChange={() => {}} onKeyDown={e => handleKey(i, e)}
          className="h-11 w-9 rounded-xl border border-white/15 bg-[#0d0f14] text-center text-base font-bold text-white outline-none focus:border-indigo-500 transition-colors" />
      ))}
    </div>
  );
};

export default function TwoFactorPage() {
  const { user, setUser } = useAuthStore();
  const [step, setStep]     = useState('idle');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken]   = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  // Email test state
  const [testEmail, setTestEmail]     = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult]   = useState(null);

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setTestLoading(true); setTestResult(null);
    try {
      const res = await apiClient.post('/auth/test-email', { to: testEmail });
      setTestResult({ ok: true, message: res.data.message, mode: res.data.mode });
    } catch (err) {
      const d = err.response?.data;
      setTestResult({ ok: false, message: d?.message || 'Test failed', hint: d?.hint || d?.error });
    }
    setTestLoading(false);
  };

  const handleSetup = async () => {
    setLoading(true); setError('');
    try {
      const res = await apiClient.post('/auth/setup-totp');
      setQrCode(res.data.qrCode);
      setSecret(res.data.secret);
      setStep('setup');
    } catch (err) {
      setError(err.response?.data?.error || 'Setup failed.');
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (token.length !== 6) return setError('Enter the 6-digit code from your app.');
    setLoading(true); setError('');
    try {
      await apiClient.post('/auth/confirm-totp', { token });
      setSuccess('2FA enabled successfully! Your account is now protected.');
      setUser({ ...user, mfaEnabled: true });
      localStorage.setItem('user', JSON.stringify({ ...user, mfaEnabled: true }));
      setStep('idle');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code.');
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    if (disableToken.length !== 6) return setError('Enter your authenticator code to disable 2FA.');
    setLoading(true); setError('');
    try {
      await apiClient.post('/auth/disable-totp', { token: disableToken });
      setSuccess('2FA disabled.');
      setUser({ ...user, mfaEnabled: false });
      localStorage.setItem('user', JSON.stringify({ ...user, mfaEnabled: false }));
      setStep('idle');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code.');
    }
    setLoading(false);
  };

  return (
    <AppShell title="Two-Factor Authentication">
      <div className="max-w-lg">
        {/* Status card */}
        <div className={`mb-5 rounded-2xl border p-5 flex items-center gap-4 ${
          user?.mfaEnabled
            ? 'border-emerald-500/20 bg-emerald-500/5'
            : 'border-white/8 bg-[#111318]'
        }`}>
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            user?.mfaEnabled ? 'bg-emerald-500/20' : 'bg-white/5'
          }`}>
            {user?.mfaEnabled
              ? <ShieldCheck className="h-6 w-6 text-emerald-400" />
              : <ShieldOff className="h-6 w-6 text-slate-500" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              2FA is {user?.mfaEnabled ? 'enabled' : 'disabled'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {user?.mfaEnabled
                ? 'Your account is protected with an authenticator app.'
                : 'Add an extra layer of security to your account.'}
            </p>
          </div>
        </div>

        {success && (
          <div className="mb-4 flex gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-400">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* ── Idle state ── */}
        {step === 'idle' && (
          <div className="rounded-2xl border border-white/8 bg-[#111318] p-5 space-y-3">
            {!user?.mfaEnabled ? (
              <>
                <h2 className="text-sm font-semibold text-white">Enable Authenticator App (TOTP)</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Use Google Authenticator, Authy, or any TOTP app. After setup, you'll need your app code every time you log in.
                </p>
                <button onClick={handleSetup} disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60">
                  {loading ? <Loader className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Set up 2FA
                </button>
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-white">Disable 2FA</h2>
                <p className="text-xs text-slate-400">Enter your current authenticator code to disable 2FA.</p>
                <OTPInput value={disableToken} onChange={setDisableToken} />
                <button onClick={handleDisable} disabled={loading || disableToken.length !== 6}
                  className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-60">
                  {loading ? <Loader className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                  Disable 2FA
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Setup: show QR ── */}
        {step === 'setup' && (
          <div className="rounded-2xl border border-white/8 bg-[#111318] p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Scan with your authenticator app</h2>
            <div className="flex justify-center mb-4">
              <img src={qrCode} alt="QR Code" className="h-44 w-44 rounded-xl border border-white/10 bg-white p-2" />
            </div>
            <p className="text-xs text-slate-500 mb-1">Or enter this secret manually:</p>
            <code className="block rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-indigo-300 font-mono break-all mb-4">
              {secret}
            </code>
            <p className="text-xs text-slate-400 mb-2">After scanning, enter the 6-digit code from your app:</p>
            <OTPInput value={token} onChange={setToken} />
            <div className="flex gap-2">
              <button onClick={handleConfirm} disabled={loading || token.length !== 6}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60">
                {loading ? <Loader className="h-4 w-4 animate-spin" /> : 'Confirm & Enable'}
              </button>
              <button onClick={() => { setStep('idle'); setToken(''); setError(''); }}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-400 hover:text-white">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Email SMTP Test (admin only) ── */}
        {user?.role === 'administrator' && (
          <div className="mt-5 rounded-2xl border border-white/8 bg-[#111318] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Email / SMTP Configuration Test</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Send a test OTP email to verify your SMTP settings in <code className="bg-white/5 px-1 rounded text-slate-300">backend/.env</code>.
              Configure <code className="bg-white/5 px-1 rounded text-slate-300">SMTP_HOST</code>, <code className="bg-white/5 px-1 rounded text-slate-300">SMTP_USER</code>, and <code className="bg-white/5 px-1 rounded text-slate-300">SMTP_PASSWORD</code>.
            </p>

            {/* Gmail App Password guide */}
            <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-slate-400 leading-relaxed">
              <p className="font-semibold text-amber-300 mb-1">📧 Gmail setup for olliverdusabe@gmail.com:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Sign in as <span className="text-white">olliverdusabe@gmail.com</span></li>
                <li>Go to <span className="text-amber-300">myaccount.google.com/security</span> → enable <strong className="text-white">2-Step Verification</strong></li>
                <li>Go to <span className="text-amber-300">myaccount.google.com/apppasswords</span></li>
                <li>App: <strong className="text-white">Mail</strong> → Device: <strong className="text-white">Windows Computer</strong> → <strong className="text-white">Generate</strong></li>
                <li>Copy the 16-character password and paste it in <code className="bg-white/5 px-1 rounded">backend/.env</code> as <code className="bg-white/5 px-1 rounded text-emerald-300">SMTP_PASSWORD=xxxx xxxx xxxx xxxx</code></li>
                <li>Restart the backend server</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="Send test OTP to this email..."
                className="flex-1 rounded-xl border border-white/10 bg-[#0d0f14] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/60"
              />
              <button
                onClick={handleTestEmail}
                disabled={testLoading || !testEmail}
                className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60 flex-shrink-0"
              >
                {testLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {testLoading ? 'Sending...' : 'Send Test'}
              </button>
            </div>

            {testResult && (
              <div className={`mt-3 rounded-xl border p-3 ${
                testResult.ok
                  ? 'border-emerald-500/20 bg-emerald-500/10'
                  : 'border-red-500/20 bg-red-500/10'
              }`}>
                <div className="flex items-start gap-2">
                  {testResult.ok
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    : <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className={`text-xs font-semibold ${testResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                      {testResult.message}
                    </p>
                    {testResult.mode && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Mode: <span className="text-slate-300">{testResult.mode}</span>
                        {testResult.mode === 'console' && ' — OTP printed to backend console'}
                      </p>
                    )}
                    {testResult.hint && (
                      <p className="text-[10px] text-amber-400 mt-1">{testResult.hint}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
