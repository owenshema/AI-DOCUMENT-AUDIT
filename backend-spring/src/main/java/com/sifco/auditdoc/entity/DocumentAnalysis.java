package com.sifco.auditdoc.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "document_analyses", indexes = {
        @Index(name = "idx_analysis_document_id", columnList = "document_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DocumentAnalysis {

    public enum AnalysisStatus {
        PENDING, IN_PROGRESS, COMPLETED, FAILED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "document_id", nullable = false, length = 36)
    private String documentId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private AnalysisStatus status = AnalysisStatus.PENDING;

    @Column(name = "document_classification", length = 100)
    private String documentClassification;

    @Column(name = "sentiment", length = 50)
    private String sentiment;

    @Column(name = "confidence_score", precision = 5, scale = 2)
    private BigDecimal confidenceScore;

    @Column(name = "anomaly_detected")
    @Builder.Default
    private boolean anomalyDetected = false;

    @Column(name = "anomaly_details", columnDefinition = "TEXT")
    private String anomalyDetails;

    @Column(name = "key_entities", columnDefinition = "TEXT")
    private String keyEntities; // JSON stored as text

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "analyzed_by", length = 36)
    private String analyzedBy;

    @Column(name = "ai_model", length = 100)
    private String aiModel;

    @Column(name = "analysis_duration_ms")
    private Long analysisDurationMs;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
