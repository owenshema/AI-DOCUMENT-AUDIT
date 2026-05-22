/**
 * Enhanced Role-Based Authorization Middleware
 * Provides flexible role checking with multiple authorization patterns
 */

const verifyRolePermissions = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Allow if user role matches any of the allowed roles
    if (Array.isArray(allowedRoles) && allowedRoles.includes(req.user.role)) {
      return next();
    }

    // Allow if allowedRoles is 'any' (no restriction)
    if (allowedRoles === 'any') {
      return next();
    }

    // Deny access
    return res.status(403).json({
      error: 'Insufficient permissions',
      required: allowedRoles,
      userRole: req.user.role,
      message: `This action requires one of the following roles: ${Array.isArray(allowedRoles) ? allowedRoles.join(', ') : allowedRoles}`
    });
  };
};

// Role permission mappings
const rolePermissions = {
  administrator: ['read', 'write', 'delete', 'admin', 'audit', 'compliance'],
  auditor: ['read', 'audit', 'compliance'],
  document_manager: ['read', 'write', 'delete'],
  viewer: ['read']
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userPermissions = rolePermissions[req.user.role] || [];

    if (userPermissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      error: 'Insufficient permissions',
      required: permission,
      userRole: req.user.role
    });
  };
};

module.exports = {
  verifyRolePermissions,
  requirePermission,
  rolePermissions
};
