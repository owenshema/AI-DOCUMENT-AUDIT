/**
 * Models Index - Central Export of All Models
 */

const { sequelize } = require('../config/database');

// Import all models (they are schema objects, not functions)
const User = require('./User');
const Document = require('./Document');
const DocumentVersion = require('./DocumentVersion');
const DocumentAnalysis = require('./DocumentAnalysis');
const AuditLog = require('./AuditLog');
const AuditReport = require('./AuditReport');
const ComplianceCheck = require('./ComplianceCheck');
const Dashboard = require('./Dashboard');
const Notification = require('./Notification');
const Policy = require('./Policy');
const RetentionPolicy = require('./RetentionPolicy');
const Search = require('./Search');
const Security = require('./Security');
const Task = require('./Task');
const Workflow = require('./Workflow');

module.exports = {
  sequelize,
  User,
  Document,
  DocumentVersion,
  DocumentAnalysis,
  AuditLog,
  AuditReport,
  ComplianceCheck,
  Dashboard,
  Notification,
  Policy,
  RetentionPolicy,
  Search,
  Security,
  Task,
  Workflow
};
