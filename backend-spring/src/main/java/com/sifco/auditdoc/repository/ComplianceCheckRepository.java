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

    /** Accepts both Node (`passed`) and Spring (`COMPLIANT`) status vocabularies. */
    @Query(value = """
            SELECT COUNT(*) FROM compliance_checks
            WHERE UPPER(status) IN ('COMPLIANT', 'PASSED')
            """, nativeQuery = true)
    long countCompliant();

    /** Accepts both Node (`failed`) and Spring (`NON_COMPLIANT`) status vocabularies. */
    @Query(value = """
            SELECT COUNT(*) FROM compliance_checks
            WHERE UPPER(status) IN ('NON_COMPLIANT', 'FAILED')
            """, nativeQuery = true)
    long countNonCompliant();
}
