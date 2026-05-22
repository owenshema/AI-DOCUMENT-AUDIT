/**
 * Logging Middleware
 * Writes request logs and audit events to the database
 */

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });

  next();
};

const auditLogger = (req, res, next) => {
  // Capture response to log after completion
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Only log mutating operations to the audit trail
    const shouldLog = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const isAuthRoute = req.path.startsWith('/api/auth');

    if (shouldLog && !isAuthRoute && req.user) {
      // Fire-and-forget DB write — don't block the response
      setImmediate(async () => {
        try {
          const models = req.app?.locals?.models;
          if (!models?.AuditLog) return;

          await models.AuditLog.create({
            userId: req.user.id,
            userRole: req.user.role,
            action: `${req.method.toLowerCase()}_${req.path.split('/')[2] || 'unknown'}`,
            resourceType: req.path.split('/')[2] || null,
            status: res.statusCode < 400 ? 'success' : 'failure',
            description: `${req.method} ${req.path}`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
              statusCode: res.statusCode,
              params: req.params,
              query: req.query
            }
          });
        } catch (err) {
          // Never crash the app due to logging failure
          console.error('Audit log write failed:', err.message);
        }
      });
    }

    return originalJson(body);
  };

  next();
};

module.exports = { auditLogger, requestLogger };
