/**
 * Analysis DTOs
 * Request and response validation objects
 */

class AnalyzeDocumentDTO {
  constructor(documentId, analysisTypes = ['sentiment', 'entities', 'risk'], userId) {
    this.documentId = documentId;
    this.analysisTypes = analysisTypes; // array of analysis types
    this.userId = userId;
  }

  validate() {
    const errors = [];
    const validTypes = ['sentiment', 'entities', 'risk', 'compliance', 'anomaly'];
    
    if (!this.documentId) {
      errors.push('Document ID required');
    }
    if (!Array.isArray(this.analysisTypes) || this.analysisTypes.length === 0) {
      errors.push('At least one analysis type required');
    }
    
    this.analysisTypes.forEach(type => {
      if (!validTypes.includes(type)) {
        errors.push(`Invalid analysis type: ${type}`);
      }
    });
    
    if (!this.userId) {
      errors.push('User ID required');
    }
    
    return errors;
  }
}

class BulkAnalyzeDTO {
  constructor(documentIds, analysisTypes = ['sentiment', 'risk'], userId) {
    this.documentIds = documentIds;
    this.analysisTypes = analysisTypes;
    this.userId = userId;
  }

  validate() {
    const errors = [];
    
    if (!Array.isArray(this.documentIds) || this.documentIds.length === 0) {
      errors.push('At least one document ID required');
    }
    if (!Array.isArray(this.analysisTypes) || this.analysisTypes.length === 0) {
      errors.push('At least one analysis type required');
    }
    if (!this.userId) {
      errors.push('User ID required');
    }
    
    return errors;
  }
}

class AnalysisResponseDTO {
  constructor(analysis) {
    this.id = analysis.id;
    this.documentId = analysis.documentId;
    this.analysisType = analysis.analysisType;
    this.sentiment = analysis.sentiment;
    this.keyTerms = analysis.keyTerms;
    this.riskLevel = analysis.riskLevel;
    this.confidenceScore = analysis.confidenceScore;
    this.status = analysis.status;
    this.createdAt = analysis.createdAt;
  }
}

class GetAnalysisStatusDTO {
  constructor(documentId) {
    this.documentId = documentId;
  }

  validate() {
    const errors = [];
    
    if (!this.documentId) {
      errors.push('Document ID required');
    }
    
    return errors;
  }
}

module.exports = {
  AnalyzeDocumentDTO,
  BulkAnalyzeDTO,
  AnalysisResponseDTO,
  GetAnalysisStatusDTO
};
