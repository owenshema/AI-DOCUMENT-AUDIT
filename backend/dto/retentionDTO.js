/**
 * Retention DTOs
 * Request and response validation objects
 */

class CreateRetentionPolicyDTO {
  constructor(name, retentionDays, departmentId, description) {
    this.name = name;
    this.retentionDays = retentionDays;
    this.departmentId = departmentId;
    this.description = description;
  }

  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim() === '') {
      errors.push('Policy name required');
    }
    if (!this.retentionDays || !Number.isInteger(this.retentionDays) || this.retentionDays < 1) {
      errors.push('Valid retention days required');
    }
    if (!this.departmentId) {
      errors.push('Department ID required');
    }
    
    return errors;
  }
}

class ArchiveDocumentDTO {
  constructor(documentId, reason, userId) {
    this.documentId = documentId;
    this.reason = reason;
    this.userId = userId;
  }

  validate() {
    const errors = [];
    
    if (!this.documentId) {
      errors.push('Document ID required');
    }
    if (!this.reason || this.reason.trim() === '') {
      errors.push('Archive reason required');
    }
    if (!this.userId) {
      errors.push('User ID required');
    }
    
    return errors;
  }
}

class RestoreArchivedDocumentDTO {
  constructor(documentId, userId) {
    this.documentId = documentId;
    this.userId = userId;
  }

  validate() {
    const errors = [];
    
    if (!this.documentId) {
      errors.push('Document ID required');
    }
    if (!this.userId) {
      errors.push('User ID required');
    }
    
    return errors;
  }
}

class SetLegalHoldDTO {
  constructor(documentId, reason, expiryDate, userId) {
    this.documentId = documentId;
    this.reason = reason;
    this.expiryDate = expiryDate;
    this.userId = userId;
  }

  validate() {
    const errors = [];
    
    if (!this.documentId) {
      errors.push('Document ID required');
    }
    if (!this.reason || this.reason.trim() === '') {
      errors.push('Legal hold reason required');
    }
    if (!this.userId) {
      errors.push('User ID required');
    }
    if (this.expiryDate && isNaN(Date.parse(this.expiryDate))) {
      errors.push('Valid expiry date required');
    }
    
    return errors;
  }
}

class RequestArchiveAccessDTO {
  constructor(documentId, reason, userId) {
    this.documentId = documentId;
    this.reason = reason;
    this.userId = userId;
  }

  validate() {
    const errors = [];
    
    if (!this.documentId) {
      errors.push('Document ID required');
    }
    if (!this.reason || this.reason.trim() === '') {
      errors.push('Access reason required');
    }
    if (!this.userId) {
      errors.push('User ID required');
    }
    
    return errors;
  }
}

module.exports = {
  CreateRetentionPolicyDTO,
  ArchiveDocumentDTO,
  RestoreArchivedDocumentDTO,
  SetLegalHoldDTO,
  RequestArchiveAccessDTO
};
