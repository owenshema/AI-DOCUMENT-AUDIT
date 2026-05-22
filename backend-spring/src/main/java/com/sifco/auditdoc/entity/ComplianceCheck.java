package com.sifco.auditdoc.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "compliance_checks", indexes = {
        @Index(name = "idx_compliance_document_id", columnList = "document_id"),
        @Index(name = "idx_compliance_policy_id", columnList = "policy_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComplianceCheck {

    public enum CheckStatus {
        PENDING, COMPLIANT, NON_COMPLIANT, PARTIALLY_COMPLIANT, EXCEPTION_GRANTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "document_id", nullable = false, length = 36)
    private String documentId;

    @Column(name = "policy_id", length = 36)
    private String policyId;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private CheckStatus status = CheckStatus.PENDING;

    @Column(name = "compliance_score", precision = 5, scale = 2)
    private BigDecimal complianceScore;

    @Column(name = "violations", columnDefinition = "TEXT")
    private String violations; // JSON array stored as text

    @Column(name = "remediation_notes", columnDefinition = "TEXT")
    private String remediationNotes;

    @Column(name = "checked_by", length = 36)
    private String checkedBy;

    @Column(name = "regulatory_framework", length = 100)
    private String regulatoryFramework;

    @Column(name = "exception_reason", columnDefinition = "TEXT")
    private String exceptionReason;

    @Column(name = "exception_approved_by", length = 36)
    private String exceptionApprovedBy;

    @Column(name = "next_review_date")
    private LocalDateTime nextReviewDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
