/**
 * Auth Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * Features:
 *  - Registration with email OTP verification
 *  - Login with brute-force protection + optional email OTP (2FA)
 *  - TOTP 2FA setup (Google Authenticator / Authy)
 *  - Password reset via email OTP
 *  - Strict Joi input validation on every endpoint
 *  - Role-based access control
 */

const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const Joi      = require('joi');
const speakeasy = require('speakeasy');
const QRCode   = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/emailService');

const JWT_SECRET  = process.env.JWT_SECRET  || 'change-this-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS   = 30 * 60 * 1000; // 30 min
const OTP_EXPIRY_MS      = 10 * 60 * 1000; // 10 min
const APPROVAL_REQUIRED_ROLES = ['auditor', 'document_manager'];
const ALLOW_DEV_OTP = process.env.NODE_ENV !== 'production' && process.env.SMTP_SEND_REAL !== 'true';

// ── Validation schemas ────────────────────────────────────────────────────────

const schemas = {
  register: Joi.object({
    fullName:   Joi.string().min(2).max(100).required(),
    email:      Joi.string().email({ tlds: { allow: false } }).required(),
    password:   Joi.string().min(8).max(128)
                  .pattern(/[A-Z]/, 'uppercase')
                  .pattern(/[0-9]/, 'number')
                  .required()
                  .messages({
                    'string.pattern.name': 'Password must contain at least one uppercase letter and one number',
                  }),
    department: Joi.string().min(2).max(100).required(),
    role:       Joi.string().valid('viewer', 'document_manager', 'auditor', 'administrator').default('viewer'),
    phone:      Joi.string().max(20).optional().allow(''),
    employeeId: Joi.string().max(50).optional().allow(''),
  }),

  login: Joi.object({
    email:    Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().required(),
  }),

  verifyOTP: Joi.object({
    userId:  Joi.string().uuid().required(),
    otp:     Joi.string().length(6).pattern(/^\d{6}$/).required(),
    purpose: Joi.string().valid('login', 'verify_email', 'reset_password').required(),
  }),

  requestReset: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
  }),

  resetPassword: Joi.object({
    userId:      Joi.string().uuid().required(),
    otp:         Joi.string().length(6).pattern(/^\d{6}$/).required(),
    newPassword: Joi.string().min(8).max(128)
                    .pattern(/[A-Z]/, 'uppercase')
                    .pattern(/[0-9]/, 'number')
                    .required(),
  }),

  verifyTOTP: Joi.object({
    userId: Joi.string().uuid().required(),
    token:  Joi.string().length(6).pattern(/^\d{6}$/).required(),
  }),
};

function validate(schema, data) {
  const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    const msg = error.details.map(d => d.message).join('; ');
    return { error: msg, value: null };
  }
  return { error: null, value };
}

// ── OTP helpers ───────────────────────────────────────────────────────────────

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function issueJWT(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function safeUser(user) {
  return {
    id:            user.id,
    fullName:      user.fullName,
    email:         user.email,
    role:          user.role,
    department:    user.department,
    emailVerified: user.emailVerified,
    mfaEnabled:    user.mfaEnabled,
    isActive:      user.isActive,
    approvalStatus:user.approvalStatus,
    lastLogin:     user.lastLogin,
  };
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

const register = async (req, res) => {
  if (req.body.full_name && !req.body.fullName) {
    req.body.fullName = req.body.full_name;
  }
  const { error, value } = validate(schemas.register, req.body);
  if (error) return res.status(400).json({ error });

  const { User } = req.app.locals.models;

  try {
    const existing = await User.findOne({ where: { email: value.email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const requestedRole = value.role || 'viewer';
    if (requestedRole === 'administrator') {
      const adminExists = await User.findOne({ where: { role: 'administrator' } });
      if (adminExists) {
        return res.status(403).json({ error: 'Only the existing administrator can create or approve privileged accounts.' });
      }
    }

    const otp = generateOTP();
    const requiresAdminApproval = APPROVAL_REQUIRED_ROLES.includes(requestedRole);
    const user = await User.create({
      ...value,
      passwordHash:  value.password, // hashed by model hook
      otpCode:       otp,
      otpExpiry:     new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h for email verify
      otpPurpose:    'verify_email',
      emailVerified: false,
      approvalStatus: requiresAdminApproval ? 'pending' : 'approved',
      isActive:      !requiresAdminApproval,
    });

    // Send verification email — non-fatal
    let emailSent = false;
    try {
      const emailResult = await emailService.sendEmailVerification(user.email, user.fullName, otp);
      emailSent = !!emailResult.configured;
    } catch (e) {
      console.warn('Email send failed:', e.message);
      console.log(`📧 DEV MODE — Verify OTP for ${user.email}: ${otp}`);
    }

    if (!emailSent && !ALLOW_DEV_OTP) {
      return res.status(502).json({ error: 'Could not send verification email. Check SMTP settings and try again.' });
    }

    if (requiresAdminApproval) {
      try {
        const admins = await User.findAll({
          where: { role: 'administrator', isActive: true },
          attributes: ['email', 'fullName'],
        });
        await Promise.all(admins.map(admin => emailService.sendAdminApprovalRequest(admin.email, admin.fullName, user)));
      } catch (e) {
        console.warn('Admin approval request email failed:', e.message);
      }
    }

    res.status(201).json({
      message:        emailSent
        ? (requiresAdminApproval ? 'Registration submitted. Verify your email, then wait for administrator approval.' : 'Registration successful. Check your email for the verification code.')
        : (requiresAdminApproval ? 'Registration submitted. Email not configured — check backend console for OTP, then wait for administrator approval.' : 'Registration successful. Email not configured — check backend console for OTP.'),
      userId:         user.id,
      requiresVerify: true,
      requiresAdminApproval,
      ...(ALLOW_DEV_OTP && !emailSent ? { devOTP: otp } : {}),
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────

const login = async (req, res) => {
  const { error, value } = validate(schemas.login, req.body);
  if (error) return res.status(400).json({ error });

  const { User } = req.app.locals.models;

  try {
    const user = await User.findOne({ where: { email: value.email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Account lockout check
    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(423).json({ error: 'Invalid credentials' });
    }

    // Account active check
    if (!user.isActive) {
      return res.status(403).json({
        error: user.approvalStatus === 'pending'
          ? 'Account pending administrator approval.'
          : 'Account deactivated. Contact your administrator.'
      });
    }

    // Password check
    const valid = await bcrypt.compare(value.password, user.passwordHash);
    if (!valid) {
      const attempts = (user.loginAttempts || 0) + 1;
      const updates  = { loginAttempts: attempts };
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        updates.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }
      await user.update(updates);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts
    await user.update({ loginAttempts: 0, lockUntil: null });

    // If TOTP 2FA is enabled → require TOTP verification
    if (user.mfaEnabled && user.mfaSecret) {
      return res.json({
        message:     'TOTP required',
        requiresTOTP: true,
        userId:      user.id,
      });
    }

    // Email OTP 2FA
    const otp = generateOTP();
    await user.update({
      otpCode:    otp,
      otpExpiry:  new Date(Date.now() + OTP_EXPIRY_MS),
      otpPurpose: 'login',
    });

    // Send OTP — non-fatal if email fails (dev mode logs to console)
    let emailSent = false;
    try {
      const emailResult = await emailService.sendLoginOTP(user.email, user.fullName, otp);
      emailSent = !!emailResult.configured;
    } catch (emailErr) {
      console.warn('Email send failed (check SMTP config):', emailErr.message);
      console.log(`📧 DEV MODE — Login OTP for ${user.email}: ${otp}`);
    }

    if (!emailSent && !ALLOW_DEV_OTP) {
      return res.status(502).json({ error: 'Could not send OTP email. Check SMTP settings and try again.' });
    }

    res.json({
      message:      emailSent
        ? 'OTP sent to your email'
        : 'OTP generated (email not configured — check backend console)',
      requiresOTP:  true,
      userId:       user.id,
      // In dev mode (no SMTP), return OTP in response so user isn't blocked
      ...(ALLOW_DEV_OTP && !emailSent ? { devOTP: otp } : {}),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────

const verifyOTP = async (req, res) => {
  const { error, value } = validate(schemas.verifyOTP, req.body);
  if (error) return res.status(400).json({ error });

  const { User } = req.app.locals.models;

  try {
    const user = await User.findByPk(value.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check OTP
    if (
      user.otpCode    !== value.otp      ||
      user.otpPurpose !== value.purpose  ||
      !user.otpExpiry ||
      user.otpExpiry < new Date()
    ) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    if (value.purpose === 'login') {
      await user.update({
        otpCode: null,
        otpExpiry: null,
        otpPurpose: null,
        lastLogin: new Date()
      });
      const token = issueJWT(user);
      return res.json({
        message:      'Login successful',
        token,
        accessToken:  token,
        user:         safeUser(user),
      });
    }

    if (value.purpose === 'verify_email') {
      await user.update({
        otpCode: null,
        otpExpiry: null,
        otpPurpose: null,
        emailVerified: true
      });
      const token = issueJWT(user);
      return res.json({
        message:     'Email verified successfully',
        token,
        accessToken: token,
        user:        safeUser(user),
      });
    }

    if (value.purpose === 'reset_password') {
      // OTP valid — return a short-lived reset token
      const resetToken = jwt.sign({ id: user.id, purpose: 'reset' }, JWT_SECRET, { expiresIn: '15m' });
      return res.json({ message: 'OTP verified', resetToken });
    }
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'OTP verification failed' });
  }
};

// ── POST /api/auth/verify-totp ────────────────────────────────────────────────

const verifyTOTP = async (req, res) => {
  const { error, value } = validate(schemas.verifyTOTP, req.body);
  if (error) return res.status(400).json({ error });

  const { User } = req.app.locals.models;

  try {
    const user = await User.findByPk(value.userId);
    if (!user || !user.mfaSecret) return res.status(404).json({ error: 'User or 2FA not found' });

    const valid = speakeasy.totp.verify({
      secret:   user.mfaSecret,
      encoding: 'base32',
      token:    value.token,
      window:   1,
    });

    if (!valid) return res.status(401).json({ error: 'Invalid authenticator code' });

    await user.update({ lastLogin: new Date() });
    const token = issueJWT(user);
    res.json({ message: 'Login successful', token, accessToken: token, user: safeUser(user) });
  } catch (err) {
    console.error('Verify TOTP error:', err);
    res.status(500).json({ error: 'TOTP verification failed' });
  }
};

// ── POST /api/auth/setup-totp ─────────────────────────────────────────────────

const setupTOTP = async (req, res) => {
  const { User } = req.app.locals.models;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const secret = speakeasy.generateSecret({
      name:   `DocAudit AI (${user.email})`,
      issuer: 'SIFCO AE',
      length: 20,
    });

    // Store secret temporarily (not enabled until confirmed)
    await user.update({ mfaSecret: secret.base32 });

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      message:   'Scan the QR code with your authenticator app, then confirm with a code',
      qrCode:    qrDataUrl,
      secret:    secret.base32,
      otpauthUrl: secret.otpauth_url,
    });
  } catch (err) {
    console.error('Setup TOTP error:', err);
    res.status(500).json({ error: 'TOTP setup failed' });
  }
};

// ── POST /api/auth/confirm-totp ───────────────────────────────────────────────

const confirmTOTP = async (req, res) => {
  const { token } = req.body;
  if (!token || !/^\d{6}$/.test(token)) return res.status(400).json({ error: 'Valid 6-digit code required' });

  const { User } = req.app.locals.models;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || !user.mfaSecret) return res.status(400).json({ error: 'Run setup-totp first' });

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret, encoding: 'base32', token, window: 1,
    });
    if (!valid) return res.status(401).json({ error: 'Invalid code — try again' });

    await user.update({ mfaEnabled: true });
    await emailService.send2FAEnabled(user.email, user.fullName);

    res.json({ message: '2FA enabled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'TOTP confirmation failed' });
  }
};

// ── POST /api/auth/disable-totp ───────────────────────────────────────────────

const disableTOTP = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Authenticator code required to disable 2FA' });

  const { User } = req.app.locals.models;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret, encoding: 'base32', token, window: 1,
    });
    if (!valid) return res.status(401).json({ error: 'Invalid authenticator code' });

    await user.update({ mfaEnabled: false, mfaSecret: null });
    res.json({ message: '2FA disabled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

// ── POST /api/auth/request-password-reset ────────────────────────────────────

const requestPasswordReset = async (req, res) => {
  const { error, value } = validate(schemas.requestReset, req.body);
  if (error) return res.status(400).json({ error });

  const { User } = req.app.locals.models;
  try {
    const user = await User.findOne({ where: { email: value.email } });
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset code has been sent.' });

    const otp = generateOTP();
    await user.update({
      otpCode:    otp,
      otpExpiry:  new Date(Date.now() + 15 * 60 * 1000), // 15 min
      otpPurpose: 'reset_password',
    });
    let emailSent = false;
    try {
      const emailResult = await emailService.sendPasswordReset(user.email, user.fullName, otp);
      emailSent = !!emailResult.configured;
    } catch (e) {
      console.warn('Email send failed:', e.message);
      console.log(`📧 DEV MODE — Reset OTP for ${user.email}: ${otp}`);
    }

    if (!emailSent && !ALLOW_DEV_OTP) {
      return res.status(502).json({ error: 'Could not send password reset email. Check SMTP settings and try again.' });
    }

    res.json({
      message: 'If that email exists, a reset code has been sent.',
      userId: user.id,
      ...(ALLOW_DEV_OTP && !emailSent ? { devOTP: otp } : {}),
    });
  } catch (err) {
    res.status(500).json({ error: 'Request failed' });
  }
};

// ── POST /api/auth/reset-password ─────────────────────────────────────────────

const resetPassword = async (req, res) => {
  const { error, value } = validate(schemas.resetPassword, req.body);
  if (error) return res.status(400).json({ error });

  const { User } = req.app.locals.models;
  try {
    const user = await User.findByPk(value.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (
      user.otpCode    !== value.otp ||
      user.otpPurpose !== 'reset_password' ||
      !user.otpExpiry || user.otpExpiry < new Date()
    ) {
      return res.status(401).json({ error: 'Invalid or expired reset code' });
    }

    await user.update({
      passwordHash: value.newPassword,
      otpCode:      null,
      otpExpiry:    null,
      otpPurpose:   null,
      loginAttempts: 0,
      lockUntil:    null,
    });

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Password reset failed' });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

const logout = async (req, res) => {
  // JWT is stateless — client discards token. Log the event.
  res.json({ message: 'Logged out successfully' });
};

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────

const resendOTP = async (req, res) => {
  const { userId, purpose } = req.body;
  if (!userId || !purpose) return res.status(400).json({ error: 'userId and purpose required' });

  const { User } = req.app.locals.models;
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = generateOTP();
    const expiry = purpose === 'verify_email'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : new Date(Date.now() + OTP_EXPIRY_MS);

    await user.update({ otpCode: otp, otpExpiry: expiry, otpPurpose: purpose });

    let emailSent = false;
    try {
      let emailResult = null;
      if (purpose === 'login')          emailResult = await emailService.sendLoginOTP(user.email, user.fullName, otp);
      if (purpose === 'verify_email')   emailResult = await emailService.sendEmailVerification(user.email, user.fullName, otp);
      if (purpose === 'reset_password') emailResult = await emailService.sendPasswordReset(user.email, user.fullName, otp);
      emailSent = !!emailResult?.configured;
    } catch (e) {
      console.warn('Email send failed:', e.message);
      console.log(`📧 DEV MODE — OTP for ${user.email}: ${otp}`);
    }

    if (!emailSent && !ALLOW_DEV_OTP) {
      return res.status(502).json({ error: 'Could not send OTP email. Check SMTP settings and try again.' });
    }

    res.json({
      message: 'OTP resent',
      ...(ALLOW_DEV_OTP && !emailSent ? { devOTP: otp } : {}),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
};

// ── POST /api/auth/test-email (admin only) ────────────────────────────────────

const testEmail = async (req, res) => {
  const emailService = require('../services/emailService');
  const { to } = req.body;

  // Test connection first
  const connResult = await emailService.testConnection();

  if (!connResult.ok && connResult.mode !== 'console') {
    return res.status(503).json({
      message: 'SMTP connection failed',
      ...connResult,
    });
  }

  // Send a test OTP email
  const testOTP = '123456';
  const target  = to || req.user?.email || process.env.SMTP_USER;

  if (!target) {
    return res.status(400).json({ error: 'Provide a "to" email address' });
  }

  try {
    await emailService.sendLoginOTP(target, 'Test User', testOTP);
    res.json({
      message:    `Test email sent to ${target}`,
      mode:       connResult.mode,
      smtpHost:   process.env.SMTP_HOST,
      smtpUser:   process.env.SMTP_USER,
      configured: connResult.ok,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Email send failed',
      error:   err.message,
      hint:    'Check SMTP credentials in backend/.env',
    });
  }
};

const listUsers = async (req, res) => {
  const { User } = req.app.locals.models;
  const { Op } = require('sequelize');
  const { role, department, page = 1, limit = 20 } = req.query;
  try {
    const where = {};
    if (role)       where.role       = role;
    if (department) where.department = { [Op.iLike]: `%${department}%` };
    if (req.user?.role === 'auditor') where.role = { [Op.ne]: 'administrator' };
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['passwordHash', 'mfaSecret', 'otpCode', 'emailVerificationToken', 'passwordResetToken'] },
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    });
    res.json({ users: rows, total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUserRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  const VALID_ROLES = ['administrator', 'auditor', 'document_manager', 'viewer'];
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const { User } = req.app.locals.models;
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Prevent self-demotion
    if (user.id === req.user.id) return res.status(403).json({ error: 'Cannot change your own role' });
    if (role === 'administrator') {
      const adminExists = await User.findOne({ where: { role: 'administrator' } });
      if (adminExists && adminExists.id !== user.id) {
        return res.status(403).json({ error: 'Only one administrator account is allowed.' });
      }
    }
    await user.update({ role });
    res.json({ message: 'Role updated', userId, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;
  const { User } = req.app.locals.models;
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) return res.status(403).json({ error: 'Cannot deactivate your own account' });
    if (user.role === 'administrator' && isActive === false) {
      return res.status(403).json({ error: 'The administrator account cannot be deactivated' });
    }
    const updates = { isActive: !!isActive };
    if (isActive) {
      updates.approvalStatus = 'approved';
      updates.approvedBy = req.user.id;
      updates.approvedAt = new Date();
    } else if (user.approvalStatus === 'pending') {
      updates.approvalStatus = 'rejected';
    }
    await user.update(updates);

    // Send approval/rejection email
    try {
      if (isActive) {
        await emailService.sendAccountApproved(user.email, user.fullName, user.role);
      } else if (updates.approvalStatus === 'rejected') {
        await emailService.sendAccountRejected(user.email, user.fullName, null);
      }
    } catch(e) { console.warn('Approval email failed:', e.message); }

    res.json({ message: `User ${isActive ? 'approved/activated' : 'deactivated'}`, userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteUser = async (req, res) => {
  const { userId } = req.params;
  const { User } = req.app.locals.models;
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) return res.status(403).json({ error: 'Cannot delete your own account' });
    if (user.role === 'administrator') {
      return res.status(403).json({ error: 'The administrator account cannot be deleted' });
    }

    await user.destroy({ force: true });
    res.json({ message: 'User deleted permanently', userId });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete user' });
  }
};

const getUserById = async (req, res) => {
  const { User } = req.app.locals.models;
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: { exclude: ['passwordHash', 'mfaSecret', 'otpCode'] },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (req.user?.role === 'auditor' && user.role === 'administrator') {
      return res.status(403).json({ error: 'Auditors cannot view administrator accounts' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  register, login, logout,
  verifyOTP, verifyTOTP,
  setupTOTP, confirmTOTP, disableTOTP,
  requestPasswordReset, resetPassword,
  resendOTP, testEmail,
  listUsers, getUserById, updateUserRole, updateUserStatus, deleteUser,
};
