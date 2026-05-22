const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import middleware
const { verifyToken, verifyRole } = require('./middleware/authMiddleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');
const { auditLogger, requestLogger } = require('./middleware/loggingMiddleware');
const { validateRequest } = require('./middleware/validationMiddleware');

// Import database
const { initializeDatabase } = require('./db/initialize');
const { sequelize } = require('./config/database');
const models = require('./db/models');

// Import routes
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const complianceRoutes = require('./routes/complianceRoutes');
const auditRoutes = require('./routes/auditRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const taskRoutes = require('./routes/taskRoutes');
const searchRoutes = require('./routes/searchRoutes');
const retentionRoutes = require('./routes/retentionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const versionRoutes = require('./routes/versionRoutes');
const securityRoutes = require('./routes/securityRoutes');

const app = express();
const port = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false
});

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging and validation
app.use(requestLogger);
app.use(auditLogger);
app.use(validateRequest);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Attach models to app for use in controllers
app.locals.models = models;

// Health check endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'AI Document Audit System API is running',
    database: sequelize.authenticate ? 'connected' : 'connecting',
    modules: {
      authentication: 'active',
      documents: 'active',
      analysis: 'active',
      compliance: 'active',
      audit: 'active',
      workflows: 'active',
      search: 'active',
      retention: 'active',
      dashboard: 'active',
      logging: 'active',
      versionControl: 'active',
      security: 'active'
    },
    timestamp: new Date(),
    version: '1.0.0'
  });
});

// API Routes - Public (no auth required)
app.use('/api/auth', authLimiter, authRoutes);

// API Routes - Protected (auth required)
app.use('/api/documents', verifyToken, apiLimiter, documentRoutes);
app.use('/api/documents/:documentId/versions', verifyToken, apiLimiter, versionRoutes);
app.use('/api/analysis', verifyToken, apiLimiter, analysisRoutes);
app.use('/api/compliance', verifyToken, apiLimiter, complianceRoutes);
app.use('/api/audits', verifyToken, apiLimiter, auditRoutes);
app.use('/api/workflows', verifyToken, apiLimiter, workflowRoutes);
app.use('/api/tasks', verifyToken, apiLimiter, taskRoutes);
app.use('/api/search', verifyToken, apiLimiter, searchRoutes);
app.use('/api/retention', verifyToken, apiLimiter, retentionRoutes);
app.use('/api/dashboard', verifyToken, apiLimiter, dashboardRoutes);
app.use('/api/security', verifyToken, apiLimiter, securityRoutes);
app.use('/api/audit-logs', verifyToken, verifyRole(['administrator', 'auditor']), apiLimiter, auditLogRoutes);

// Serve static UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Database initialization and server startup
const startServer = async () => {
  try {
    // Initialize database
    const dbReady = await initializeDatabase();

    if (dbReady) {
      app.listen(port, () => {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║  AI-Powered Document Audit System  v1.0.0                 ║
║  PostgreSQL Database: AIDOCUMENT_DB                        ║
║  Running on http://localhost:${port}                         ║
╚════════════════════════════════════════════════════════════╝

All 13 Modules Active:
  ✓ 1.  User Registration & Authentication
  ✓ 2.  Dashboard & Metrics
  ✓ 3.  Document Ingestion & Management
  ✓ 4.  AI Document Analysis
  ✓ 5.  Compliance & Policy Checking
  ✓ 6.  Audit Reporting
  ✓ 7.  Document Management
  ✓ 8.  Workflow & Task Management
  ✓ 9.  Version Control & History
  ✓ 10. Advanced Search & Discovery
  ✓ 11. Confidentiality & Security
  ✓ 12. Retention & Archival
  ✓ 13. Audit Trail & Logging

API Base: http://localhost:${port}/api
Status:   GET /api/status
        `);
      });
    }
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n✗ SIGTERM signal received: closing HTTP server');
  sequelize.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n✗ SIGINT signal received: closing HTTP server');
  sequelize.close();
  process.exit(0);
});
