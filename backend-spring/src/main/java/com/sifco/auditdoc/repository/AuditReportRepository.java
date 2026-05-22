package com.sifco.auditdoc.repository;
import com.sifco.auditdoc.entity.AuditReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AuditReportRepository extends JpaRepository<AuditReport, String> {
    Page<AuditReport> findByCreatedByOrderByCreatedAtDesc(String userId, Pageable pageable);
    Page<AuditReport> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<AuditReport> findByStatus(AuditReport.ReportStatus status);
}
