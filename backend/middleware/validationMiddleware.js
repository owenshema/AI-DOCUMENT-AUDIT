/**
 * Validation Middleware
 */

const validateRequest = (req, res, next) => {
  // Skip body check for multipart/form-data — multer parses it per-route
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) return next();

  // These POST routes intentionally have no body — skip validation
  const noBodyRoutes = [
    '/analyze', '/archive', '/restore', '/start', '/complete',
    '/logout', '/verify-email', '/export', '/distribute',
    '/verify-otp', '/verify-totp', '/resend-otp',
    '/confirm-totp', '/disable-totp', '/setup-totp',
  ];
  const pathHasNoBody = noBodyRoutes.some(r => req.path.includes(r));
  if (pathHasNoBody) return next();

  if (req.method === 'POST' || req.method === 'PUT') {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body is required' });
    }
  }
  next();
};

const validateDocumentUpload = (req, res, next) => {
  const { title, category, department } = req.body;

  if (!title || !category || !department) {
    return res.status(400).json({
      error: 'title, category, and department are required for document upload'
    });
  }

  next();
};

const validatePolicyCreation = (req, res, next) => {
  const { name, policyType, rules } = req.body;

  if (!name || !policyType || !rules) {
    return res.status(400).json({
      error: 'name, policyType, and rules are required'
    });
  }

  next();
};

const validateWorkflowCreation = (req, res, next) => {
  const { name, workflowType, steps } = req.body;

  if (!name || !workflowType || !steps || steps.length === 0) {
    return res.status(400).json({
      error: 'name, workflowType, and at least one step are required'
    });
  }

  next();
};

module.exports = {
  validateRequest,
  validateDocumentUpload,
  validatePolicyCreation,
  validateWorkflowCreation
};
