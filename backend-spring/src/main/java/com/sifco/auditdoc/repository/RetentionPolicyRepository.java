package com.sifco.auditdoc.repository;
import com.sifco.auditdoc.entity.RetentionPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RetentionPolicyRepository extends JpaRepository<RetentionPolicy, String> {
    List<RetentionPolicy> findByActiveTrue();
    List<RetentionPolicy> findByDocumentType(String documentType);
    List<RetentionPolicy> findByDepartment(String department);
    List<RetentionPolicy> findByLegalHoldTrue();
}
