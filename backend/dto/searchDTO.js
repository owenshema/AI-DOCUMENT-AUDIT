/**
 * Search DTOs
 * Request and response validation objects
 */

class SearchDocumentsDTO {
  constructor(query, filters = {}, userId) {
    this.query = query;
    this.filters = filters; // classification, format, status, dateRange
    this.userId = userId;
  }

  validate() {
    const errors = [];
    
    if (!this.query || this.query.trim() === '') {
      errors.push('Search query required');
    }
    if (!this.userId) {
      errors.push('User ID required');
    }
    
    if (this.filters.classification && !['public', 'internal', 'confidential', 'restricted', 'top_secret'].includes(this.filters.classification)) {
      errors.push('Invalid classification filter');
    }
    
    return errors;
  }
}

class AdvancedSearchDTO {
  constructor(criteria, userId) {
    this.criteria = criteria; // complex search criteria
    this.userId = userId;
  }

  validate() {
    const errors = [];
    
    if (!this.criteria || typeof this.criteria !== 'object') {
      errors.push('Advanced search criteria required');
    }
    if (!this.userId) {
      errors.push('User ID required');
    }
    
    return errors;
  }
}

class SaveSearchDTO {
  constructor(name, query, filters, userId) {
    this.name = name;
    this.query = query;
    this.filters = filters;
    this.userId = userId;
  }

  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim() === '') {
      errors.push('Search name required');
    }
    if (!this.query || this.query.trim() === '') {
      errors.push('Search query required');
    }
    if (!this.userId) {
      errors.push('User ID required');
    }
    
    return errors;
  }
}

class SearchResponseDTO {
  constructor(id, title, fileName, classification, department, relevanceScore, createdAt) {
    this.id = id;
    this.title = title;
    this.fileName = fileName;
    this.classification = classification;
    this.department = department;
    this.relevanceScore = relevanceScore;
    this.createdAt = createdAt;
  }
}

module.exports = {
  SearchDocumentsDTO,
  AdvancedSearchDTO,
  SaveSearchDTO,
  SearchResponseDTO
};
