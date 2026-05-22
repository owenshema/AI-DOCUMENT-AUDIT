/**
 * Document DTOs
 * Request and response validation objects
 */

class UploadDocumentDTO {
  constructor(title, fileName, fileFormat, fileSize, classificationLevel, category, department, userId) {
    this.title = title;
    this.fileName = fileName;
    this.fileFormat = fileFormat;
    this.fileSize = fileSize;
    this.classificationLevel = classificationLevel;
    this.category = category;
    this.department = department;
    this.userId = userId;
  }

  validate() {
    const errors = [];
    
    if (!this.title || this.title.trim() === '') {
      errors.push('Document title required');
    }
    if (!this.fileName || this.fileName.trim() === '') {
      errors.push('File name required');
    }
    if (!this.fileFormat || !['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg', 'txt'].includes(this.fileFormat.toLowerCase())) {
      errors.push('Unsupported file format');
    }
    if (!this.classificationLevel || !['public', 'internal', 'confidential', 'restricted', 'top_secret'].includes(this.classificationLevel)) {
      errors.push('Invalid classification level');
    }
    if (!this.category || this.category.trim() === '') {
      errors.push('Category required');
    }
    if (!this.department || this.department.trim() === '') {
      errors.push('Department required');
    }
    if (!this.userId) {
      errors.push('User ID required');
    }
    
    return errors;
  }
}

class UpdateDocumentDTO {
  constructor(documentId, title, category, department, classificationLevel, tags = []) {
    this.documentId = documentId;
    this.title = title;
    this.category = category;
    this.department = department;
    this.classificationLevel = classificationLevel;
    this.tags = tags;
  }

  validate() {
    const errors = [];
    
    if (!this.documentId) {
      errors.push('Document ID required');
    }
    if (this.title && this.title.trim() === '') {
      errors.push('Title cannot be empty');
    }
    if (this.classificationLevel && !['public', 'internal', 'confidential', 'restricted', 'top_secret'].includes(this.classificationLevel)) {
      errors.push('Invalid classification level');
    }
    
    return errors;
  }
}

class ShareDocumentDTO {
  constructor(documentId, sharedWith, permission = 'view') {
    this.documentId = documentId;
    this.sharedWith = sharedWith; // array of user IDs or emails
    this.permission = permission; // 'view', 'edit', 'comment'
  }

  validate() {
    const errors = [];
    
    if (!this.documentId) {
      errors.push('Document ID required');
    }
    if (!Array.isArray(this.sharedWith) || this.sharedWith.length === 0) {
      errors.push('At least one user to share with required');
    }
    if (!['view', 'edit', 'comment'].includes(this.permission)) {
      errors.push('Invalid permission level');
    }
    
    return errors;
  }
}

class BulkUploadDTO {
  constructor(documents, userId) {
    this.documents = documents; // array of document objects
    this.userId = userId;
  }

  validate() {
    const errors = [];
    
    if (!Array.isArray(this.documents) || this.documents.length === 0) {
      errors.push('At least one document required');
    }
    if (!this.userId) {
      errors.push('User ID required');
    }
    
    // Validate each document
    this.documents.forEach((doc, index) => {
      if (!doc.title || !doc.fileName || !doc.fileFormat) {
        errors.push(`Document ${index + 1} missing required fields`);
      }
    });
    
    return errors;
  }
}

class DocumentResponseDTO {
  constructor(document) {
    this.id = document.id;
    this.title = document.title;
    this.fileName = document.fileName;
    this.fileFormat = document.fileFormat;
    this.fileSize = document.fileSize;
    this.classificationLevel = document.classificationLevel;
    this.category = document.category;
    this.department = document.department;
    this.status = document.status;
    this.createdAt = document.createdAt;
    this.updatedAt = document.updatedAt;
  }
}

module.exports = {
  UploadDocumentDTO,
  UpdateDocumentDTO,
  ShareDocumentDTO,
  BulkUploadDTO,
  DocumentResponseDTO
};
