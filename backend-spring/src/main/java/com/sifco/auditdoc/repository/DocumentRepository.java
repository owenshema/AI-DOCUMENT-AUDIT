package com.sifco.auditdoc.repository;

import com.sifco.auditdoc.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, String> {
    Page<Document> findByActiveTrueOrderByCreatedAtDesc(Pageable pageable);
    Page<Document> findByUploadedByAndActiveTrueOrderByCreatedAtDesc(String userId, Pageable pageable);
    Page<Document> findByDepartmentAndActiveTrueOrderByCreatedAtDesc(String department, Pageable pageable);
    Page<Document> findByStatusAndActiveTrueOrderByCreatedAtDesc(Document.Status status, Pageable pageable);
    List<Document> findByStatusAndActiveTrue(Document.Status status);

    @Query("SELECT d FROM Document d WHERE d.active = true AND " +
           "(LOWER(d.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(d.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(d.department) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Document> searchDocuments(@Param("query") String query, Pageable pageable);

    @Query("SELECT COUNT(d) FROM Document d WHERE d.active = true AND d.status = :status")
    long countByStatus(@Param("status") Document.Status status);

    @Query("SELECT COUNT(d) FROM Document d WHERE d.active = true")
    long countActiveDocuments();

    boolean existsByFileNameAndActiveTrueAndUploadedBy(String fileName, String uploadedBy);
}
