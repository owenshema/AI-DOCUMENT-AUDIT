package com.sifco.auditdoc.service;

import com.sifco.auditdoc.entity.*;
import com.sifco.auditdoc.exception.ResourceNotFoundException;
import com.sifco.auditdoc.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VersionService {
    private final DocumentVersionRepository versionRepository;
    private final DocumentRepository documentRepository;

    @Transactional(readOnly = true)
    public List<DocumentVersion> getVersions(String documentId) {
        return versionRepository.findByDocumentIdOrderByVersionNumberDesc(documentId);
    }

    @Transactional(readOnly = true)
    public DocumentVersion getVersion(String documentId, Integer versionNumber) {
        return versionRepository.findByDocumentIdAndVersionNumber(documentId, versionNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Version not found"));
    }

    @Transactional
    public DocumentVersion createVersion(String documentId, DocumentVersion version, String userId) {
        documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
        long existing = versionRepository.countByDocumentId(documentId);
        version.setDocumentId(documentId);
        version.setVersionNumber((int) existing + 1);
        version.setVersionLabel(existing + 1 + ".0");
        version.setCreatedBy(userId);
        version.setApprovalStatus("PENDING");
        return versionRepository.save(version);
    }

    @Transactional
    public DocumentVersion restoreVersion(String documentId, Integer versionNumber) {
        return getVersion(documentId, versionNumber);
    }
}
