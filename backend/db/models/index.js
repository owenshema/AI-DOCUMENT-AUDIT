/**
 * Database Models — 5-Module Audit System
 *
 * Tables kept:
 *   users            — Module 1: Authentication & User Management
 *   documents        — Module 2: Document Hub
 *   document_analyses — Module 3: AI Analysis
 *   policies         — Module 3: Compliance rules
 *   compliance_checks — Module 3: Compliance results
 *   audit_reports    — Module 4: Audit Reports
 *   tasks            — Module 5: Workflow & Task Tracker
 *   audit_logs       — Cross-cutting: activity trail
 *
 * Tables removed: document_versions, notifications, searches,
 *                 security_controls, dashboards, retention_policies, workflows
 */

const { sequelize, Sequelize } = require('../../config/database');

const UserModel             = require('./User');
const DocumentModel         = require('./Document');
const DocumentAnalysisModel = require('./DocumentAnalysis');
const PolicyModel           = require('./Policy');
const ComplianceCheckModel  = require('./ComplianceCheck');
const AuditReportModel      = require('./AuditReport');
const TaskModel             = require('./Task');
const AuditLogModel         = require('./AuditLog');
const WorkflowModel         = require('./Workflow');
const SearchModel           = require('./Search');
const RetentionPolicyModel  = require('./RetentionPolicy');
const NotificationModel     = require('./Notification');

// Initialise
const User             = UserModel(sequelize);
const Document         = DocumentModel(sequelize);
const DocumentAnalysis = DocumentAnalysisModel(sequelize);
const Policy           = PolicyModel(sequelize);
const ComplianceCheck  = ComplianceCheckModel(sequelize);
const AuditReport      = AuditReportModel(sequelize);
const Task             = TaskModel(sequelize);
const AuditLog         = AuditLogModel(sequelize);
const Workflow         = WorkflowModel(sequelize);
const Search           = SearchModel(sequelize);
const RetentionPolicy  = RetentionPolicyModel(sequelize);
const Notification     = NotificationModel(sequelize);

// ── Associations ──────────────────────────────────────────────────────────────

// User ↔ Document
User.hasMany(Document, { foreignKey: 'uploadedBy', as: 'documentsUploaded' });
Document.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

// User ↔ Task
User.hasMany(Task, { foreignKey: 'assignedTo', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

// User ↔ AuditLog
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

// User ↔ AuditReport
User.hasMany(AuditReport, { foreignKey: 'createdBy', as: 'auditReports' });
AuditReport.belongsTo(User, { foreignKey: 'createdBy' });

// Document ↔ DocumentAnalysis
Document.hasMany(DocumentAnalysis, { foreignKey: 'documentId', as: 'analyses' });
DocumentAnalysis.belongsTo(Document, { foreignKey: 'documentId' });

// Document ↔ ComplianceCheck
Document.hasMany(ComplianceCheck, { foreignKey: 'documentId', as: 'complianceChecks' });
ComplianceCheck.belongsTo(Document, { foreignKey: 'documentId' });

// Document ↔ Task
Document.hasMany(Task, { foreignKey: 'documentId', as: 'tasks' });
Task.belongsTo(Document, { foreignKey: 'documentId' });

Workflow.hasMany(Task, { foreignKey: 'workflowId', as: 'tasks' });
Task.belongsTo(Workflow, { foreignKey: 'workflowId', as: 'workflow' });

// Policy ↔ ComplianceCheck
Policy.hasMany(ComplianceCheck, { foreignKey: 'policyId', as: 'checks' });
ComplianceCheck.belongsTo(Policy, { foreignKey: 'policyId' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Document,
  DocumentAnalysis,
  Policy,
  ComplianceCheck,
  AuditReport,
  Task,
  AuditLog,
  Workflow,
  Search,
  RetentionPolicy,
  Notification,
};
