package com.sifco.auditdoc.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "tasks", indexes = {
        @Index(name = "idx_task_assigned_to", columnList = "assigned_to"),
        @Index(name = "idx_task_workflow_id", columnList = "workflow_id"),
        @Index(name = "idx_task_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Task {

    public enum TaskStatus {
        PENDING, IN_PROGRESS, COMPLETED, CANCELLED, OVERDUE
    }

    public enum TaskType {
        REVIEW, APPROVE, AUDIT, COMPLIANCE_CHECK, DATA_ENTRY, NOTIFICATION
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 400)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", length = 30)
    private TaskType taskType;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private TaskStatus status = TaskStatus.PENDING;

    @Column(name = "workflow_id", length = 36)
    private String workflowId;

    @Column(name = "document_id", length = 36)
    private String documentId;

    @Column(name = "assigned_to", length = 36)
    private String assignedTo;

    @Column(name = "assigned_by", length = 36)
    private String assignedBy;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "priority", length = 20)
    @Builder.Default
    private String priority = "MEDIUM";

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "escalated")
    @Builder.Default
    private boolean escalated = false;

    @Column(name = "escalated_to", length = 36)
    private String escalatedTo;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
