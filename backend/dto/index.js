/**
 * Central DTO Export
 * All Data Transfer Objects
 */

module.exports = {
  // Auth DTOs
  ...require('./authDTO'),
  
  // Document DTOs
  ...require('./documentDTO'),
  
  // Compliance DTOs
  ...require('./complianceDTO'),
  
  // Task DTOs
  ...require('./taskDTO'),
  
  // Workflow DTOs
  ...require('./workflowDTO'),
  
  // Analysis DTOs
  ...require('./analysisDTO'),
  
  // Retention DTOs
  ...require('./retentionDTO'),
  
  // Search DTOs
  ...require('./searchDTO'),
  
  // Audit DTOs
  ...require('./auditDTO')
};
