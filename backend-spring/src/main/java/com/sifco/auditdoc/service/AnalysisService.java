package com.sifco.auditdoc.service;

import com.sifco.auditdoc.entity.*;
import com.sifco.auditdoc.exception.ResourceNotFoundException;
import com.sifco.auditdoc.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AnalysisService {

    private final DocumentAnalysisRepository analysisRepository;
    private final DocumentRepository documentRepository;

    @Transactional(readOnly = true)
    public Page<DocumentAnalysis> getAll(int page, int size) {
        return analysisRepository.findAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }

    @Transactional(readOnly = true)
    public DocumentAnalysis getByDocumentId(String documentId) {
        return analysisRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Analysis not found for document: " + documentId));
    }

    @Transactional
    public DocumentAnalysis analyzeDocument(String documentId, String analyzedBy) {
        documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));

        // Remove existing analysis if any
        analysisRepository.findByDocumentId(documentId)
                .ifPresent(analysisRepository::delete);

        // Simulate AI analysis
        DocumentAnalysis analysis = DocumentAnalysis.builder()
                .documentId(documentId)
                .status(DocumentAnalysis.AnalysisStatus.COMPLETED)
                .documentClassification("FINANCIAL_REPORT")
                .sentiment("NEUTRAL")
                .confidenceScore(new BigDecimal("87.50"))
                .anomalyDetected(false)
                .keyEntities("{\"persons\":[],\"dates\":[],\"amounts\":[]}")
                .summary("Document analyzed successfully using AI content analysis.")
                .analyzedBy(analyzedBy)
                .aiModel("Internal-AI-v1.0")
                .analysisDurationMs(1250L)
                .build();

        return analysisRepository.save(analysis);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAnalysisStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("pending", analysisRepository.countByStatus(DocumentAnalysis.AnalysisStatus.PENDING));
        stats.put("inProgress", analysisRepository.countByStatus(DocumentAnalysis.AnalysisStatus.IN_PROGRESS));
        stats.put("completed", analysisRepository.countByStatus(DocumentAnalysis.AnalysisStatus.COMPLETED));
        stats.put("failed", analysisRepository.countByStatus(DocumentAnalysis.AnalysisStatus.FAILED));
        stats.put("anomaliesDetected", analysisRepository.findByAnomalyDetectedTrue().size());
        return stats;
    }
}
