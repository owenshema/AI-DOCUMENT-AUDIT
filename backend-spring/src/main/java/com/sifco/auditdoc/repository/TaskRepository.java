package com.sifco.auditdoc.repository;
import com.sifco.auditdoc.entity.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {
    Page<Task> findByAssignedToOrderByDueDateAsc(String userId, Pageable pageable);
    Page<Task> findByAssignedByOrderByCreatedAtDesc(String userId, Pageable pageable);
    List<Task> findByWorkflowId(String workflowId);
    List<Task> findByStatus(Task.TaskStatus status);
    List<Task> findByEscalatedTrue();
    Page<Task> findAllByOrderByCreatedAtDesc(Pageable pageable);
    long countByAssignedToAndStatus(String userId, Task.TaskStatus status);
}
