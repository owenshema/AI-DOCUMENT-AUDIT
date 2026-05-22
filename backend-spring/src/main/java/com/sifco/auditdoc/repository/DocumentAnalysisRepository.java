package com.sifco.auditdoc.repository;

import com.sifco.auditdoc.entity.DocumentAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentAnalysisRepository extends JpaRepository<DocumentAnalysis, String> {
    Optional<DocumentAnalysis> findByDocumentId(String documentId);
    List<DocumentAnalysis> findByStatus(DocumentAnalysis.AnalysisStatus status);
    List<DocumentAnalysis> findByAnomalyDetectedTrue();
    long countByStatus(DocumentAnalysis.AnalysisStatus status);
}
