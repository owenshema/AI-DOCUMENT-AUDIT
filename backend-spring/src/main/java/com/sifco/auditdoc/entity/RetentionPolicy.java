package com.sifco.auditdoc.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "retention_policies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RetentionPolicy {

    public enum RetentionAction {
        ARCHIVE, DELETE, NOTIFY, LEGAL_HOLD
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 300)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "document_type", length = 100)
    private String documentType;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "retention_period_days")
    private Integer retentionPeriodDays;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_on_expiry", length = 30)
    @Builder.Default
    private RetentionAction actionOnExpiry = RetentionAction.ARCHIVE;

    @Column(name = "legal_hold")
    @Builder.Default
    private boolean legalHold = false;

    @Column(name = "legal_hold_reason", columnDefinition = "TEXT")
    private String legalHoldReason;

    @Column(name = "is_active")
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
