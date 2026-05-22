package com.sifco.auditdoc.service;

import com.sifco.auditdoc.entity.*;
import com.sifco.auditdoc.exception.ResourceNotFoundException;
import com.sifco.auditdoc.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AuditService {
    private final AuditReportRepository auditReportRepository;

    @Transactional(readOnly = true)
    public Page<AuditReport> getReports(int page, int size) {
        return auditReportRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }

    @Transactional(readOnly = true)
    public AuditReport getReport(String id) {
        return auditReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Audit report not found: " + id));
    }

    @Transactional
    public AuditReport createReport(AuditReport report, String userId) {
        report.setCreatedBy(userId);
        report.setStatus(AuditReport.ReportStatus.DRAFT);
        return auditReportRepository.save(report);
    }

    @Transactional
    public AuditReport generateReport(String id) {
        AuditReport report = getReport(id);
        report.setStatus(AuditReport.ReportStatus.GENERATED);
        report.setTotalDocuments(10);
        report.setCompliantCount(8);
        report.setNonCompliantCount(2);
        report.setSummary("8 of 10 documents compliant.");
        return auditReportRepository.save(report);
    }

    @Transactional
    public void deleteReport(String id) {
        auditReportRepository.deleteById(id);
    }
}
