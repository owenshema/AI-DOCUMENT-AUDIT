package com.sifco.auditdoc.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "documents", indexes = {
        @Index(name = "idx_doc_uploaded_by", columnList = "uploaded_by"),
        @Index(name = "idx_doc_status", columnList = "status"),
        @Index(name = "idx_doc_department", columnList = "department")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Document {

    public enum Status {
        DRAFT, PENDING_REVIEW, REVIEWED, APPROVED, ARCHIVED, REJECTED
    }

    public enum Classification {
        PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private String id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "file_name", length = 500)
    private String fileName;

    @Column(name = "file_path", length = 1000)
    private String filePath;

    @Column(name = "file_type", length = 50)
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "document_type", length = 100)
    private String documentType;

    @Column(length = 100)
    private String department;

    @Column(length = 100)
    private String project;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private Classification classification = Classification.INTERNAL;

    @Column(name = "uploaded_by", length = 36)
    private String uploadedBy;

    @Column(name = "version_number")
    @Builder.Default
    private Integer versionNumber = 1;

    @Column(name = "is_duplicate")
    @Builder.Default
    private boolean duplicate = false;

    @Column(name = "ocr_processed")
    @Builder.Default
    private boolean ocrProcessed = false;

    @Column(name = "ocr_text", columnDefinition = "TEXT")
    private String ocrText;

    @ElementCollection
    @CollectionTable(name = "document_tags", joinColumns = @JoinColumn(name = "document_id"))
    @Column(name = "tag")
    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;

    @Column(name = "is_active")
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
