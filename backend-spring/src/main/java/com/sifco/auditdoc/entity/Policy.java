package com.sifco.auditdoc.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "policies", indexes = {
        @Index(name = "idx_policy_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Policy {

    public enum PolicyStatus {
        DRAFT, ACTIVE, ARCHIVED, DEPRECATED
    }

    public enum PolicyType {
        ORGANIZATIONAL, DEPARTMENTAL, REGULATORY, PROJECT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 300)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "policy_type", length = 30)
    private PolicyType policyType;

    @Column(length = 20)
    private String version;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private PolicyStatus status = PolicyStatus.DRAFT;

    @Column(name = "regulatory_frameworks", columnDefinition = "TEXT")
    private String regulatoryFrameworks; // JSON array

    @Column(name = "rules", columnDefinition = "TEXT")
    private String rules; // JSON array of rule objects

    @Column(name = "effective_date")
    private LocalDateTime effectiveDate;

    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;

    @Column(name = "owner", length = 36)
    private String owner;

    @Column(name = "department", length = 100)
    private String department;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
