/**
 * Analysis Service
 * Business logic for document analysis
 */

const analysisRepository = require('../repositories/analysisRepository');
const documentRepository = require('../repositories/documentRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const { AnalyzeDocumentDTO } = require('../dto');

class AnalysisService {
  async analyzeDocument(analyzeDTO) {
    // Validate DTO
    const errors = analyzeDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    const document = await documentRepository.findById(analyzeDTO.documentId);
    if (!document) throw new Error('Document not found');

    // Create analysis record
    const analysis = await analysisRepository.create({
      documentId: analyzeDTO.documentId,
      analysisTypes: analyzeDTO.analysisTypes,
      status: 'in_progress',
      sentiment: 0,
      keyTerms: [],
      riskLevel: 'medium',
      confidenceScore: 0.85
    });

    // Log analysis start
    await auditLogRepository.create({
      userId: analyzeDTO.userId,
      action: 'document_analysis_started',
      resourceType: 'analysis',
      resourceId: analysis.id,
      description: `Analysis started: ${analyzeDTO.analysisTypes.join(', ')}`
    });

    // Simulate analysis completion
    setTimeout(async () => {
      await analysisRepository.updateStatus(analysis.id, 'completed');
    }, 1000);

    return analysis;
  }

  async getDocumentInsights(documentId) {
    const analysis = await analysisRepository.getLatestAnalysis(documentId);
    if (!analysis) throw new Error('No analysis found for document');

    return {
      documentId,
      sentiment: analysis.sentiment,
      keyTerms: analysis.keyTerms,
      riskLevel: analysis.riskLevel,
      recommendations: this.generateRecommendations(analysis),
      lastAnalyzed: analysis.createdAt
    };
  }

  async bulkAnalyze(bulkDTO) {
    // Validate DTO
    const errors = bulkDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    const results = [];

    for (const docId of bulkDTO.documentIds) {
      try {
        const analyzeDTO = new AnalyzeDocumentDTO(docId, bulkDTO.analysisTypes, bulkDTO.userId);
        const result = await this.analyzeDocument(analyzeDTO);
        results.push({ documentId: docId, success: true, analysisId: result.id });
      } catch (error) {
        results.push({ documentId: docId, success: false, error: error.message });
      }
    }

    // Log bulk analysis
    await auditLogRepository.create({
      userId: bulkDTO.userId,
      action: 'bulk_analysis_started',
      description: `Bulk analysis started for ${bulkDTO.documentIds.length} documents`
    });

    return {
      queued: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  async getAnalysisStatus(documentId) {
    return await analysisRepository.getAnalysisStatus(documentId);
  }

  async getAnalysisTrend(startDate, endDate) {
    return await analysisRepository.getAnalysisTrend(startDate, endDate);
  }

  async getAnalysisStats(startDate, endDate) {
    return await analysisRepository.getAnalysisStats(startDate, endDate);
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.riskLevel === 'high' || analysis.riskLevel === 'critical') {
      recommendations.push('High risk detected. Review document for sensitive information.');
    }

    if (analysis.sentiment < 0) {
      recommendations.push('Negative sentiment detected. Review for potential issues.');
    }

    if (analysis.keyTerms.length === 0) {
      recommendations.push('No key terms extracted. Document may need OCR processing.');
    }

    return recommendations;
  }
}

module.exports = new AnalysisService();
