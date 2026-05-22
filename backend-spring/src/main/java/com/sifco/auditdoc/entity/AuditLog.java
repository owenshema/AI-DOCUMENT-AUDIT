package com.sifco.auditdoc.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_log_user_id", columnList = "user_id"),
        @Index(name = "idx_audit_log_document_id", columnList = "document_id"),
        @Index(name = "idx_audit_log_action", columnList = "action"),
        @Index(name = "idx_audit_log_created_at", columnList = "created_at")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {

    public enum Action {
        LOGIN, LOGOUT, REGISTER,
        DOCUMENT_UPLOAD, DOCUMENT_VIEW, DOCUMENT_DOWNLOAD, DOCUMENT_DELETE,
        DOCUMENT_EDIT, DOCUMENT_SHARE, DOCUMENT_PRINT,
        AUDIT_START, AUDIT_COMPLETE,
        COMPLIANCE_CHECK, POLICY_VIOLATION,
        USER_CREATE, USER_UPDATE, USER_DELETE,
        WORKFLOW_CREATE, WORKFLOW_UPDATE,
        TASK_CREATE, TASK_COMPLETE,
        SETTINGS_CHANGE, SECURITY_CHANGE,
        SEARCH_PERFORMED, REPORT_GENERATED,
        FAILED_LOGIN, ACCOUNT_LOCKED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", length = 36)
    private String userId;

    @Column(name = "user_email", length = 255)
    private String userEmail;

    @Column(name = "document_id", length = 36)
    private String documentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Action action;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata; // JSON

    @Column(name = "success")
    @Builder.Default
    private boolean success = true;

    @Column(name = "severity", length = 20)
    @Builder.Default
    private String severity = "INFO"; // INFO, WARNING, CRITICAL

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
