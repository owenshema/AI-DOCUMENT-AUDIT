package com.sifco.auditdoc.repository;

import com.sifco.auditdoc.entity.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, String> {
    List<DocumentVersion> findByDocumentIdOrderByVersionNumberDesc(String documentId);
    Optional<DocumentVersion> findByDocumentIdAndVersionNumber(String documentId, Integer versionNumber);
    long countByDocumentId(String documentId);
    Optional<DocumentVersion> findFirstByDocumentIdOrderByVersionNumberDesc(String documentId);
}
