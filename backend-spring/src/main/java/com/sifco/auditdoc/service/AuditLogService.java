package com.sifco.auditdoc.service;

import com.sifco.auditdoc.entity.*;
import com.sifco.auditdoc.exception.ResourceNotFoundException;
import com.sifco.auditdoc.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditLogService {
    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public Page<AuditLog> getAll(int page, int size) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getByUser(String userId, int page, int size) {
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getByDocument(String documentId, int page, int size) {
        return auditLogRepository.findByDocumentIdOrderByCreatedAtDesc(documentId, PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public AuditLog getById(String id) {
        return auditLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Audit log not found: " + id));
    }
}
