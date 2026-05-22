package com.sifco.auditdoc.repository;

import com.sifco.auditdoc.entity.ComplianceCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComplianceCheckRepository extends JpaRepository<ComplianceCheck, String> {

    List<ComplianceCheck> findByDocumentId(String documentId);
    List<ComplianceCheck> findByPolicyId(String policyId);
    List<ComplianceCheck> findByStatus(ComplianceCheck.CheckStatus status);

    @Query(value = "SELECT COUNT(*) FROM compliance_checks WHERE status = 'COMPLIANT'", nativeQuery = true)
    long countCompliant();

    @Query(value = "SELECT COUNT(*) FROM compliance_checks WHERE status = 'NON_COMPLIANT'", nativeQuery = true)
    long countNonCompliant();
}
