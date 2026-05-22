package com.sifco.auditdoc.service;

import com.sifco.auditdoc.entity.AuditLog;
import com.sifco.auditdoc.entity.Document;
import com.sifco.auditdoc.entity.User;
import com.sifco.auditdoc.exception.ResourceNotFoundException;
import com.sifco.auditdoc.repository.AuditLogRepository;
import com.sifco.auditdoc.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final AuditLogRepository auditLogRepository;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    @Transactional(readOnly = true)
    public Page<Document> getDocuments(String userId, User.Role role, int page, int size, String status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (status != null && !status.isBlank()) {
            try {
                Document.Status s = Document.Status.valueOf(status.toUpperCase());
                return documentRepository.findByStatusAndActiveTrueOrderByCreatedAtDesc(s, pageable);
            } catch (IllegalArgumentException ignored) {}
        }
        if (role == User.Role.VIEWER) {
            return documentRepository.findByUploadedByAndActiveTrueOrderByCreatedAtDesc(userId, pageable);
        }
        return documentRepository.findByActiveTrueOrderByCreatedAtDesc(pageable);
    }

    @Transactional(readOnly = true)
    public Document getDocument(String id) {
        return documentRepository.findById(id)
                .filter(Document::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
    }

    @Transactional
    public Document uploadDocument(MultipartFile file, Map<String, String> metadata,
                                   String uploadedById, String ipAddress) throws IOException {
        String originalName = file.getOriginalFilename();
        boolean isDuplicate = documentRepository
                .existsByFileNameAndActiveTrueAndUploadedBy(originalName, uploadedById);

        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);
        String uniqueName = UUID.randomUUID() + "_" + originalName;
        Path filePath = uploadPath.resolve(uniqueName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        Document doc = Document.builder()
                .title(metadata.getOrDefault("title", originalName))
                .description(metadata.get("description"))
                .fileName(originalName)
                .filePath(filePath.toString())
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .documentType(metadata.get("documentType"))
                .department(metadata.get("department"))
                .project(metadata.get("project"))
                .uploadedBy(uploadedById)
                .duplicate(isDuplicate)
                .status(Document.Status.DRAFT)
                .build();

        Document saved = documentRepository.save(doc);

        auditLogRepository.save(AuditLog.builder()
                .userId(uploadedById)
                .documentId(saved.getId())
                .action(AuditLog.Action.DOCUMENT_UPLOAD)
                .description("Uploaded: " + originalName)
                .ipAddress(ipAddress)
                .success(true).severity("INFO").build());

        return saved;
    }

    @Transactional
    public Document updateDocument(String id, Map<String, String> updates, String userId) {
        Document doc = getDocument(id);
        if (updates.containsKey("title")) doc.setTitle(updates.get("title"));
        if (updates.containsKey("description")) doc.setDescription(updates.get("description"));
        if (updates.containsKey("department")) doc.setDepartment(updates.get("department"));
        if (updates.containsKey("status")) {
            try { doc.setStatus(Document.Status.valueOf(updates.get("status").toUpperCase())); }
            catch (IllegalArgumentException ignored) {}
        }
        auditLogRepository.save(AuditLog.builder()
                .userId(userId).documentId(id)
                .action(AuditLog.Action.DOCUMENT_EDIT)
                .description("Document updated").success(true).severity("INFO").build());
        return documentRepository.save(doc);
    }

    @Transactional
    public void deleteDocument(String id, String userId) {
        Document doc = getDocument(id);
        doc.setActive(false);
        doc.setDeletedAt(LocalDateTime.now());
        documentRepository.save(doc);
        auditLogRepository.save(AuditLog.builder()
                .userId(userId).documentId(id)
                .action(AuditLog.Action.DOCUMENT_DELETE)
                .description("Document deleted").success(true).severity("WARNING").build());
    }

    @Transactional(readOnly = true)
    public Page<Document> searchDocuments(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return documentRepository.searchDocuments(query, pageable);
    }
}
