/**
 * Central Services Export (Real Database-Integrated Services)
 * Replacing placeholder services with production-ready implementations
 */

module.exports = {
  authService: require('./authService'),
  documentService: require('./documentService'),
  complianceService: require('./complianceService'),
  auditService: require('./auditService'),
  taskService: require('./taskService'),
  workflowService: require('./workflowService'),
  analysisService: require('./analysisService'),
  searchService: require('./searchService'),
  retentionService: require('./retentionService')
};
