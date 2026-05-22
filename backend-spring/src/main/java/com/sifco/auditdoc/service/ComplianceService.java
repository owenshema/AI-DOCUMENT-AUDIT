package com.sifco.auditdoc.service;

import com.sifco.auditdoc.entity.*;
import com.sifco.auditdoc.exception.ResourceNotFoundException;
import com.sifco.auditdoc.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ComplianceService {

    private final ComplianceCheckRepository complianceCheckRepository;
    private final PolicyRepository policyRepository;
    private final DocumentRepository documentRepository;

    @Transactional(readOnly = true)
    public Page<ComplianceCheck> getAll(int page, int size) {
        return complianceCheckRepository.findAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }

    @Transactional(readOnly = true)
    public List<ComplianceCheck> getByDocument(String documentId) {
        return complianceCheckRepository.findByDocumentId(documentId);
    }

    @Transactional
    public ComplianceCheck runComplianceCheck(String documentId, String policyId, String checkedBy) {
        documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));

        Policy policy = policyId != null ?
                policyRepository.findById(policyId).orElse(null) : null;

        // Simulate compliance check
        ComplianceCheck check = ComplianceCheck.builder()
                .documentId(documentId)
                .policyId(policyId)
                .status(ComplianceCheck.CheckStatus.COMPLIANT)
                .complianceScore(new BigDecimal("92.00"))
                .regulatoryFramework(policy != null ? policy.getRegulatoryFrameworks() : "GENERAL")
                .checkedBy(checkedBy)
                .remediationNotes("Document meets all required compliance standards.")
                .build();

        return complianceCheckRepository.save(check);
    }

    @Transactional(readOnly = true)
    public Page<Policy> getPolicies(int page, int size) {
        return policyRepository.findAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }

    @Transactional
    public Policy createPolicy(Policy policy) {
        return policyRepository.save(policy);
    }

    @Transactional
    public Policy updatePolicy(String id, Policy updates) {
        Policy existing = policyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Policy not found: " + id));
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
        return policyRepository.save(existing);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getComplianceStats() {
        long compliant = complianceCheckRepository.countCompliant();
        long nonCompliant = complianceCheckRepository.countNonCompliant();
        long total = compliant + nonCompliant;
        double score = total > 0 ? (double) compliant / total * 100 : 0;
        return Map.of(
                "complianceScore", Math.round(score * 10.0) / 10.0,
                "compliant", compliant,
                "nonCompliant", nonCompliant,
                "total", total
        );
    }
}
