package com.sifco.auditdoc.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "security_records", indexes = {
        @Index(name = "idx_security_document_id", columnList = "document_id"),
        @Index(name = "idx_security_user_id", columnList = "user_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SecurityRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "document_id", length = 36)
    private String documentId;

    @Column(name = "user_id", length = 36)
    private String userId;

    @Column(name = "classification", length = 20)
    private String classification; // PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED

    @Column(name = "can_download")
    @Builder.Default
    private boolean canDownload = true;

    @Column(name = "can_print")
    @Builder.Default
    private boolean canPrint = true;

    @Column(name = "can_share")
    @Builder.Default
    private boolean canShare = true;

    @Column(name = "watermark_enabled")
    @Builder.Default
    private boolean watermarkEnabled = false;

    @Column(name = "watermark_text", length = 200)
    private String watermarkText;

    @Column(name = "encryption_enabled")
    @Builder.Default
    private boolean encryptionEnabled = false;

    @Column(name = "access_control_list", columnDefinition = "TEXT")
    private String accessControlList; // JSON

    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;

    @Column(name = "auto_destroy")
    @Builder.Default
    private boolean autoDestroy = false;

    @Column(name = "dlp_alert")
    @Builder.Default
    private boolean dlpAlert = false;

    @Column(name = "dlp_details", columnDefinition = "TEXT")
    private String dlpDetails;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
