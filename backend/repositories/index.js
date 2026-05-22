/**
 * Central Repository Export
 * All repository instances
 */

module.exports = {
  userRepository: require('./userRepository'),
  documentRepository: require('./documentRepository'),
  complianceRepository: require('./complianceRepository'),
  auditLogRepository: require('./auditLogRepository'),
  taskRepository: require('./taskRepository'),
  workflowRepository: require('./workflowRepository'),
  analysisRepository: require('./analysisRepository'),
  retentionRepository: require('./retentionRepository'),
  searchRepository: require('./searchRepository')
};
