package com.sifco.auditdoc.repository;
import com.sifco.auditdoc.entity.SecurityRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SecurityRecordRepository extends JpaRepository<SecurityRecord, String> {
    Optional<SecurityRecord> findByDocumentId(String documentId);
    List<SecurityRecord> findByUserId(String userId);
    List<SecurityRecord> findByClassification(String classification);
    List<SecurityRecord> findByDlpAlertTrue();
}
