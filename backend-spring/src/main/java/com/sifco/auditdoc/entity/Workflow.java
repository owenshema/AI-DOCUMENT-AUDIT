package com.sifco.auditdoc.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workflows", indexes = {
        @Index(name = "idx_workflow_document_id", columnList = "document_id"),
        @Index(name = "idx_workflow_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Workflow {

    public enum WorkflowStatus {
        DRAFT, ACTIVE, IN_REVIEW, APPROVED, REJECTED, COMPLETED, CANCELLED
    }

    public enum WorkflowType {
        REVIEW, APPROVAL, AUDIT, COMPLIANCE_CHECK, ARCHIVAL
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 300)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "workflow_type", length = 30)
    private WorkflowType workflowType;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private WorkflowStatus status = WorkflowStatus.DRAFT;

    @Column(name = "document_id", length = 36)
    private String documentId;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "assigned_to", length = 36)
    private String assignedTo;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "steps", columnDefinition = "TEXT")
    private String steps; // JSON array of workflow steps

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    @Column(name = "priority", length = 20)
    @Builder.Default
    private String priority = "MEDIUM"; // LOW, MEDIUM, HIGH, CRITICAL

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
