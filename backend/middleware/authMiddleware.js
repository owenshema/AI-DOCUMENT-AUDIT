/**
 * Authentication Middleware
 * Real JWT token verification
 */

const jwt = require('jsonwebtoken');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const allowQueryToken = req.method === 'GET' && /\/export(?:\?|$)/i.test(req.originalUrl || req.url || '');
  const queryToken = allowQueryToken ? req.query.token : null;

  const raw = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : queryToken;

  if (!raw) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-secret')) {
    return res.status(503).json({ error: 'Server security misconfiguration' });
  }

  try {
    const decoded = jwt.verify(
      raw,
      process.env.JWT_SECRET || 'change-this-secret'
    );

    const { User } = require('../db/models');
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User session invalid. Please sign out and sign in again.' });
    }
    if (!user.isActive) {
      return res.status(403).json({
        error: user.approvalStatus === 'pending'
          ? 'Account pending administrator approval.'
          : 'Account deactivated. Contact your administrator.'
      });
    }

    if (decoded.role && decoded.role !== user.role) {
      return res.status(401).json({ error: 'Session role mismatch. Please sign in again.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    return res.status(401).json({ error: 'Invalid session' });
  }
};

const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
};

const verifyMFA = (req, res, next) => {
  const mfaCode = req.headers['x-mfa-code'];

  // In production, validate MFA code against user's TOTP secret
  // For now, just log the requirement
  if (!mfaCode) {
    console.warn(`MFA code not provided for user: ${req.user?.id}`);
  }

  next();
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.user = null;
    return next();
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'change-this-secret'
    );

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    req.user = null;
  }

  next();
};

module.exports = {
  verifyToken,
  verifyRole,
  verifyMFA,
  optionalAuth
};
