/**
 * Compliance DTOs
 * Request and response validation objects
 */

class CreatePolicyDTO {
  constructor(name, framework, description, rules, department) {
    this.name = name;
    this.framework = framework; // GDPR, HIPAA, SOX, etc.
    this.description = description;
    this.rules = rules;
    this.department = department;
  }

  validate() {
    const errors = [];
    const validFrameworks = ['GDPR', 'HIPAA', 'SOX', 'ISO27001', 'ISO9001', 'CCPA', 'LGPD'];
    
    if (!this.name || this.name.trim() === '') {
      errors.push('Policy name required');
    }
    if (!this.framework || !validFrameworks.includes(this.framework)) {
      errors.push('Valid regulatory framework required');
    }
    if (!this.description || this.description.trim() === '') {
      errors.push('Policy description required');
    }
    if (!Array.isArray(this.rules) || this.rules.length === 0) {
      errors.push('At least one policy rule required');
    }
    if (!this.department || this.department.trim() === '') {
      errors.push('Department required');
    }
    
    return errors;
  }
}

class UpdatePolicyDTO {
  constructor(policyId, name, description, rules, status) {
    this.policyId = policyId;
    this.name = name;
    this.description = description;
    this.rules = rules;
    this.status = status;
  }

  validate() {
    const errors = [];
    
    if (!this.policyId) {
      errors.push('Policy ID required');
    }
    if (this.status && !['active', 'inactive', 'archived'].includes(this.status)) {
      errors.push('Invalid policy status');
    }
    
    return errors;
  }
}

class CheckComplianceDTO {
  constructor(documentId, policyIds = []) {
    this.documentId = documentId;
    this.policyIds = policyIds;
  }

  validate() {
    const errors = [];
    
    if (!this.documentId) {
      errors.push('Document ID required');
    }
    if (!Array.isArray(this.policyIds)) {
      errors.push('Policy IDs must be an array');
    }
    
    return errors;
  }
}

class ComplianceExceptionDTO {
  constructor(documentId, reason, exceptionType, approverIds, expiryDate) {
    this.documentId = documentId;
    this.reason = reason;
    this.exceptionType = exceptionType; // 'policy_exception', 'deadline_extension'
    this.approverIds = approverIds;
    this.expiryDate = expiryDate;
  }

  validate() {
    const errors = [];
    
    if (!this.documentId) {
      errors.push('Document ID required');
    }
    if (!this.reason || this.reason.trim() === '') {
      errors.push('Exception reason required');
    }
    if (!['policy_exception', 'deadline_extension'].includes(this.exceptionType)) {
      errors.push('Invalid exception type');
    }
    if (!Array.isArray(this.approverIds) || this.approverIds.length === 0) {
      errors.push('At least one approver ID required');
    }
    
    return errors;
  }
}

class BulkComplianceCheckDTO {
  constructor(documentIds, policyIds = []) {
    this.documentIds = documentIds;
    this.policyIds = policyIds;
  }

  validate() {
    const errors = [];
    
    if (!Array.isArray(this.documentIds) || this.documentIds.length === 0) {
      errors.push('At least one document ID required');
    }
    if (!Array.isArray(this.policyIds)) {
      errors.push('Policy IDs must be an array');
    }
    
    return errors;
  }
}

class ComplianceResponseDTO {
  constructor(compliance) {
    this.id = compliance.id;
    this.documentId = compliance.documentId;
    this.complianceScore = compliance.complianceScore;
    this.status = compliance.status;
    this.violations = compliance.violations || [];
    this.lastCheckedAt = compliance.lastCheckedAt;
  }
}

module.exports = {
  CreatePolicyDTO,
  UpdatePolicyDTO,
  CheckComplianceDTO,
  ComplianceExceptionDTO,
  BulkComplianceCheckDTO,
  ComplianceResponseDTO
};
