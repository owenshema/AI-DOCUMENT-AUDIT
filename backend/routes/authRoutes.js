/**
 * Auth Routes — with OTP, TOTP 2FA, validation, role guards
 */

const express    = require('express');
const rateLimit  = require('express-rate-limit');
const router     = express.Router();
const ctrl       = require('../controllers/authController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Strict rate limiter for auth endpoints
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'Too many OTP attempts. Try again in 5 minutes.' },
});

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/register',               authLimit, ctrl.register);
router.post('/login',                  authLimit, ctrl.login);
router.post('/logout',                 ctrl.logout);
router.post('/verify-otp',             otpLimit,  ctrl.verifyOTP);
router.post('/verify-totp',            otpLimit,  ctrl.verifyTOTP);
router.post('/resend-otp',             otpLimit,  ctrl.resendOTP);
router.post('/request-password-reset', authLimit, ctrl.requestPasswordReset);
router.post('/reset-password',         authLimit, ctrl.resetPassword);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.post('/setup-totp',    verifyToken, ctrl.setupTOTP);
router.post('/confirm-totp',  verifyToken, ctrl.confirmTOTP);
router.post('/disable-totp',  verifyToken, ctrl.disableTOTP);
router.post('/test-email',    verifyToken, verifyRole(['administrator']), ctrl.testEmail);

// ── Admin / Auditor ───────────────────────────────────────────────────────────
router.get('/users',
  verifyToken, verifyRole(['administrator', 'auditor']), ctrl.listUsers);
router.get('/users/:userId',
  verifyToken, verifyRole(['administrator', 'auditor']), ctrl.getUserById);
router.patch('/users/:userId/role',
  verifyToken, verifyRole(['administrator']), ctrl.updateUserRole);
router.patch('/users/:userId/status',
  verifyToken, verifyRole(['administrator']), ctrl.updateUserStatus);

module.exports = router;
