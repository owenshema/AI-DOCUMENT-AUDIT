package com.sifco.auditdoc.service;

import com.sifco.auditdoc.entity.*;
import com.sifco.auditdoc.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SearchService {
    private final DocumentRepository documentRepository;
    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public Page<Document> searchDocuments(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (query == null || query.isBlank()) {
            return documentRepository.findByActiveTrueOrderByCreatedAtDesc(pageable);
        }
        return documentRepository.searchDocuments(query, pageable);
    }

    @Transactional
    public void logSearch(String userId, String query) {
        auditLogRepository.save(AuditLog.builder()
                .userId(userId)
                .action(AuditLog.Action.SEARCH_PERFORMED)
                .description("Search: " + query)
                .success(true).severity("INFO").build());
    }
}
