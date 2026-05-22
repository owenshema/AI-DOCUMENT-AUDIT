package com.sifco.auditdoc.repository;
import com.sifco.auditdoc.entity.Workflow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WorkflowRepository extends JpaRepository<Workflow, String> {
    Page<Workflow> findByCreatedByOrderByCreatedAtDesc(String userId, Pageable pageable);
    Page<Workflow> findByAssignedToOrderByCreatedAtDesc(String userId, Pageable pageable);
    List<Workflow> findByDocumentId(String documentId);
    List<Workflow> findByStatus(Workflow.WorkflowStatus status);
    Page<Workflow> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
