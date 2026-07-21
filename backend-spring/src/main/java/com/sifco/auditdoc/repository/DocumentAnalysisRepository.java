package com.sifco.auditdoc.repository;

import com.sifco.auditdoc.entity.DocumentAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentAnalysisRepository extends JpaRepository<DocumentAnalysis, String> {
    Optional<DocumentAnalysis> findByDocumentId(String documentId);
    List<DocumentAnalysis> findByStatus(DocumentAnalysis.AnalysisStatus status);
    List<DocumentAnalysis> findByAnomalyDetectedTrue();
    long countByStatus(DocumentAnalysis.AnalysisStatus status);

    @Query(value = """
            SELECT AVG(COALESCE(
                NULLIF(results->>'compliance_score', '')::double precision,
                NULLIF(results->>'overall_audit_score', '')::double precision
            ))
            FROM document_analyses
            WHERE status = 'completed'
              AND (
                results->>'compliance_score' IS NOT NULL
                OR results->>'overall_audit_score' IS NOT NULL
              )
            """, nativeQuery = true)
    Double averageComplianceScore();

    @Query(value = """
            SELECT COUNT(*)
            FROM document_analyses
            WHERE status = 'completed'
              AND COALESCE(
                    NULLIF(results->>'compliance_score', '')::double precision,
                    NULLIF(results->>'overall_audit_score', '')::double precision,
                    -1
              ) >= :threshold
            """, nativeQuery = true)
    long countPassingCompliance(@Param("threshold") double threshold);

    @Query(value = """
            SELECT COUNT(*)
            FROM document_analyses
            WHERE status = 'completed'
              AND (
                results->>'compliance_score' IS NOT NULL
                OR results->>'overall_audit_score' IS NOT NULL
              )
            """, nativeQuery = true)
    long countScoredAnalyses();
}
