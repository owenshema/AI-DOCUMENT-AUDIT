package com.sifco.auditdoc.service;

import com.sifco.auditdoc.entity.*;
import com.sifco.auditdoc.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final ComplianceCheckRepository complianceCheckRepository;
    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;

    public Map<String, Object> getDashboardStats(String userId, User.Role role) {
        Map<String, Object> stats = new LinkedHashMap<>();

        long totalDocs    = documentRepository.countActiveDocuments();
        long pending      = documentRepository.countByStatus(Document.Status.PENDING_REVIEW);
        long approved     = documentRepository.countByStatus(Document.Status.APPROVED);
        long draft        = documentRepository.countByStatus(Document.Status.DRAFT);

        long compliant    = complianceCheckRepository.countCompliant();
        long nonCompliant = complianceCheckRepository.countNonCompliant();
        long total        = compliant + nonCompliant;
        double score      = total > 0 ? Math.round((double) compliant / total * 1000.0) / 10.0 : 0.0;

        long myTasks      = taskRepository.countByAssignedToAndStatus(userId, Task.TaskStatus.PENDING);
        long unread       = notificationRepository.countByUserIdAndReadFalse(userId);
        long activity24h  = auditLogRepository.countByCreatedAtAfter(LocalDateTime.now().minusHours(24));

        stats.put("documents",     Map.of("total", totalDocs, "pending", pending, "approved", approved, "draft", draft));
        stats.put("compliance",    Map.of("score", score, "compliant", compliant, "nonCompliant", nonCompliant));
        stats.put("tasks",         Map.of("pending", myTasks));
        stats.put("notifications", Map.of("unread", unread));
        stats.put("activity",      Map.of("last24h", activity24h));

        if (role == User.Role.ADMINISTRATOR) {
            stats.put("users", Map.of(
                    "total",    userRepository.countActiveUsers(),
                    "auditors", userRepository.countByRole(User.Role.AUDITOR.name()),
                    "managers", userRepository.countByRole(User.Role.DOCUMENT_MANAGER.name())));
        }
        return stats;
    }
}
