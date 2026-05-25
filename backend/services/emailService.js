/**
 * Email Service — Gmail SMTP via Nodemailer
 *
 * Sender: olliverdusabe@gmail.com
 *
 * Setup (one-time):
 *   1. Sign in as olliverdusabe@gmail.com
 *   2. myaccount.google.com/security → enable 2-Step Verification
 *   3. myaccount.google.com/apppasswords → App: Mail → Generate
 *   4. Paste the 16-char password as SMTP_PASSWORD in backend/.env
 *   5. Restart the backend
 */

const nodemailer = require('nodemailer');

// ── Check if SMTP is configured ───────────────────────────────────────────────

function isConfigured() {
  return (
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD &&
    process.env.SMTP_PASSWORD !== 'your-16-char-app-password' &&
    process.env.SMTP_PASSWORD !== 'your-app-password'
  );
}

// ── Create transporter ────────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  });
}

// ── Test connection ───────────────────────────────────────────────────────────

async function testConnection() {
  if (!isConfigured()) {
    return {
      ok:      false,
      message: 'SMTP not configured. Set SMTP_PASSWORD in backend/.env',
      hint:    'Go to myaccount.google.com/apppasswords to generate an App Password',
    };
  }
  try {
    const t = createTransporter();
    await t.verify();
    return { ok: true, message: `Connected — sending from ${process.env.SMTP_USER}` };
  } catch (err) {
    let hint = 'Check SMTP_PASSWORD in backend/.env';
    if (err.message.includes('535') || err.message.includes('Username'))
      hint = 'Wrong App Password. Generate a new one at myaccount.google.com/apppasswords';
    if (err.message.includes('ECONNREFUSED'))
      hint = 'Cannot reach smtp.gmail.com. Check your internet connection.';
    return { ok: false, message: err.message, hint };
  }
}

// ── Core send ─────────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html, text }) {
  const from = `"${process.env.SMTP_FROM_NAME || 'AI Document Audit'}" <${process.env.SMTP_USER}>`;

  if (process.env.NODE_ENV !== 'production' && process.env.SMTP_SEND_REAL !== 'true') {
    console.log('\n' + '='.repeat(55));
    console.log('EMAIL - development console mode');
    console.log('='.repeat(55));
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:    ${text}`);
    console.log('='.repeat(55) + '\n');
    return { messageId: 'console-dev', configured: false };
  }

  if (!isConfigured()) {
    // Console fallback — dev mode
    console.log('\n' + '═'.repeat(55));
    console.log('📧  EMAIL — console mode (SMTP_PASSWORD not set)');
    console.log('═'.repeat(55));
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:    ${text}`);
    console.log('═'.repeat(55) + '\n');
    return { messageId: 'console', configured: false };
  }

  const t = createTransporter();
  const sendPromise = t.sendMail({ from, to, subject, html, text });
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('SMTP send timed out after 15 seconds')), 15000);
  });
  const info = await Promise.race([sendPromise, timeoutPromise]);
  console.log(`📧 Email sent → ${to} (${info.messageId})`);
  return { messageId: info.messageId, configured: true };
}

// ── HTML template ─────────────────────────────────────────────────────────────

const tpl = (body) => `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;margin:0;padding:24px 16px}
  .card{max-width:500px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
  .hdr{background:#0f172a;padding:22px 28px}
  .hdr h1{color:#fff;margin:0;font-size:18px;font-weight:700}
  .hdr p{color:#6366f1;margin:3px 0 0;font-size:11px}
  .body{padding:28px}
  p{color:#374151;font-size:14px;line-height:1.6;margin:0 0 14px}
  .otp{background:#eef2ff;border:2px solid #6366f1;border-radius:12px;text-align:center;padding:22px;margin:20px 0}
  .otp-code{font-size:40px;font-weight:900;letter-spacing:10px;color:#4338ca;font-family:monospace}
  .otp-note{font-size:11px;color:#6b7280;margin-top:8px}
  .warn{background:#fffbeb;border-left:4px solid #f59e0b;padding:10px 14px;border-radius:4px;font-size:12px;color:#92400e;margin-top:14px}
  .ftr{background:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8}
</style></head>
<body><div class="card">
  <div class="hdr"><h1>DocAudit AI</h1><p>SIFCO AE · Document Audit System</p></div>
  <div class="body">${body}</div>
  <div class="ftr">Automated message — do not reply. Contact your administrator if you did not request this.</div>
</div></body></html>`;

// ── Email types ───────────────────────────────────────────────────────────────

async function sendLoginOTP(email, fullName, otp) {
  return sendEmail({
    to:      email,
    subject: `${otp} is your DocAudit AI login code`,
    html:    tpl(`
      <p>Hi <strong>${fullName}</strong>,</p>
      <p>Enter this code to complete your sign-in. It expires in <strong>10 minutes</strong>.</p>
      <div class="otp">
        <div class="otp-code">${otp}</div>
        <div class="otp-note">One-time code · Do not share · Expires in 10 minutes</div>
      </div>
      <div class="warn">⚠️ If you did not try to log in, contact your administrator immediately.</div>
    `),
    text: `Your DocAudit AI login code: ${otp}\n\nExpires in 10 minutes. Do not share this code.`,
  });
}

async function sendEmailVerification(email, fullName, otp) {
  return sendEmail({
    to:      email,
    subject: `${otp} — Verify your DocAudit AI account`,
    html:    tpl(`
      <p>Hi <strong>${fullName}</strong>,</p>
      <p>Welcome to DocAudit AI! Enter this code to verify your email and activate your account.</p>
      <div class="otp">
        <div class="otp-code">${otp}</div>
        <div class="otp-note">Verification code · Expires in 24 hours</div>
      </div>
    `),
    text: `Your DocAudit AI email verification code: ${otp}\n\nExpires in 24 hours.`,
  });
}

async function sendPasswordReset(email, fullName, otp) {
  return sendEmail({
    to:      email,
    subject: `${otp} — Reset your DocAudit AI password`,
    html:    tpl(`
      <p>Hi <strong>${fullName}</strong>,</p>
      <p>Use this code to reset your password. It expires in <strong>15 minutes</strong>.</p>
      <div class="otp">
        <div class="otp-code">${otp}</div>
        <div class="otp-note">Reset code · Expires in 15 minutes</div>
      </div>
      <div class="warn">⚠️ If you did not request this, ignore this email. Your password will not change.</div>
    `),
    text: `Your DocAudit AI password reset code: ${otp}\n\nExpires in 15 minutes.`,
  });
}

async function send2FAEnabled(email, fullName) {
  return sendEmail({
    to:      email,
    subject: '2FA enabled on your DocAudit AI account',
    html:    tpl(`
      <p>Hi <strong>${fullName}</strong>,</p>
      <p>Two-factor authentication has been <strong>successfully enabled</strong> on your account.</p>
      <div class="warn">⚠️ If you did not enable 2FA, contact your administrator immediately.</div>
    `),
    text: '2FA has been enabled on your DocAudit AI account.',
  });
}

async function sendAuditComplete(email, fullName, docTitle, auditorName, status, summary, portalUrl) {
  return sendEmail({
    to:      email,
    subject: `Portal update: "${docTitle}"`,
    html:    tpl(`
      <p>Hi <strong>${fullName}</strong>,</p>
      <p>Changes have been made in your portal for <strong>"${docTitle}"</strong> by <strong>${auditorName}</strong>.</p>
      <div style="background:#f8fafc;border-radius:12px;padding:18px;margin:16px 0;border-left:4px solid #4f46e5">
        <p style="margin:0;font-size:13px;color:#374151">Log in to your portal to view the updated document status, auditor notes, and any required actions.</p>
      </div>
      <p>For privacy, audit results are available only inside the portal.</p>
      <div style="text-align:center;margin:20px 0">
        <a href="${portalUrl || 'http://localhost:3000/documents'}" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Log in to Portal</a>
      </div>
    `),
    text: `Hi ${fullName},\n\nChanges have been made in your portal for "${docTitle}" by ${auditorName}.\n\nFor privacy, audit results are available only inside the portal. Log in to view the updated document status, auditor notes, and any required actions:\n${portalUrl || 'http://localhost:3000/documents'}`,
  });
}

async function sendAccountApproved(email, fullName, role) {
  return sendEmail({
    to:      email,
    subject: 'Your DocAudit AI account has been approved',
    html:    tpl(`
      <p>Hi <strong>${fullName}</strong>,</p>
      <p>Your <strong>${role.replace(/_/g, ' ')}</strong> account on DocAudit AI has been <strong style="color:#10b981">approved</strong> by the administrator.</p>
      <p>You can now log in to your portal and start using the system.</p>
      <div style="text-align:center;margin:20px 0">
        <a href="http://localhost:3000/login" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Log In Now →</a>
      </div>
    `),
    text: `Hi ${fullName},\n\nYour ${role} account on DocAudit AI has been approved. You can now log in at http://localhost:3000/login`,
  });
}

async function sendAccountRejected(email, fullName, reason) {
  return sendEmail({
    to:      email,
    subject: 'DocAudit AI — Account application update',
    html:    tpl(`
      <p>Hi <strong>${fullName}</strong>,</p>
      <p>Unfortunately, your account application has not been approved at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please contact your administrator for more information.</p>
    `),
    text: `Hi ${fullName},\n\nYour DocAudit AI account application was not approved.\n${reason ? 'Reason: ' + reason : ''}\n\nContact your administrator for more information.`,
  });
}

async function sendAdminApprovalRequest(email, adminName, applicant) {
  const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000/users';
  return sendEmail({
    to:      email,
    subject: `Account approval needed: ${applicant.fullName || applicant.email}`,
    html:    tpl(`
      <p>Hi <strong>${adminName || 'Administrator'}</strong>,</p>
      <p>A new <strong>${String(applicant.role || 'viewer').replace(/_/g, ' ')}</strong> account needs your approval.</p>
      <div style="background:#f8fafc;border-radius:12px;padding:14px;margin:16px 0">
        <p><strong>Name:</strong> ${applicant.fullName || 'Not provided'}</p>
        <p><strong>Email:</strong> ${applicant.email}</p>
        <p><strong>Department:</strong> ${applicant.department || 'General'}</p>
      </div>
      <p>Log in to approve or reject this account.</p>
      <div style="text-align:center;margin:20px 0">
        <a href="${portalUrl}" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Review Account</a>
      </div>
    `),
    text: `Hi ${adminName || 'Administrator'},\n\nA new ${String(applicant.role || 'viewer').replace(/_/g, ' ')} account needs approval.\nName: ${applicant.fullName || 'Not provided'}\nEmail: ${applicant.email}\nDepartment: ${applicant.department || 'General'}\n\nLog in to approve or reject it: ${portalUrl}`,
  });
}

module.exports = {
  sendLoginOTP,
  sendEmailVerification,
  sendPasswordReset,
  send2FAEnabled,
  sendAuditComplete,
  sendAccountApproved,
  sendAccountRejected,
  sendAdminApprovalRequest,
  sendEmail,
  testConnection,
  isConfigured,
};
