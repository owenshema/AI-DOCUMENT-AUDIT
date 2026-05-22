package com.sifco.auditdoc.repository;
import com.sifco.auditdoc.entity.Policy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PolicyRepository extends JpaRepository<Policy, String> {
    List<Policy> findByStatus(Policy.PolicyStatus status);
    List<Policy> findByDepartment(String department);
    boolean existsByName(String name);
}
