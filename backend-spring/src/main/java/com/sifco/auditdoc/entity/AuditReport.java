package com.sifco.auditdoc.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_reports", indexes = {
        @Index(name = "idx_audit_report_created_by", columnList = "created_by"),
        @Index(name = "idx_audit_report_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditReport {

    public enum ReportType {
        SUMMARY, DETAILED, EXCEPTION_ONLY, COMPLIANCE, CUSTOM
    }

    public enum ReportStatus {
        DRAFT, GENERATED, PUBLISHED, ARCHIVED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 300)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", length = 30)
    private ReportType reportType;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private ReportStatus status = ReportStatus.DRAFT;

    @Column(name = "date_from")
    private LocalDateTime dateFrom;

    @Column(name = "date_to")
    private LocalDateTime dateTo;

    @Column(name = "document_ids", columnDefinition = "TEXT")
    private String documentIds; // JSON array

    @Column(name = "findings", columnDefinition = "TEXT")
    private String findings; // JSON

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "total_documents")
    @Builder.Default
    private Integer totalDocuments = 0;

    @Column(name = "compliant_count")
    @Builder.Default
    private Integer compliantCount = 0;

    @Column(name = "non_compliant_count")
    @Builder.Default
    private Integer nonCompliantCount = 0;

    @Column(name = "critical_issues")
    @Builder.Default
    private Integer criticalIssues = 0;

    @Column(name = "export_format", length = 20)
    private String exportFormat; // PDF, EXCEL, WORD

    @Column(name = "file_path", length = 1000)
    private String filePath;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
