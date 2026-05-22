package com.sifco.auditdoc.service;

import com.sifco.auditdoc.entity.*;
import com.sifco.auditdoc.exception.ResourceNotFoundException;
import com.sifco.auditdoc.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkflowService {
    private final WorkflowRepository workflowRepository;

    @Transactional(readOnly = true)
    public Page<Workflow> getAll(int page, int size) {
        return workflowRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public Workflow getById(String id) {
        return workflowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + id));
    }

    @Transactional
    public Workflow create(Workflow workflow, String userId) {
        workflow.setCreatedBy(userId);
        workflow.setStatus(Workflow.WorkflowStatus.ACTIVE);
        return workflowRepository.save(workflow);
    }

    @Transactional
    public Workflow update(String id, Workflow updates) {
        Workflow existing = getById(id);
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
        if (updates.getAssignedTo() != null) existing.setAssignedTo(updates.getAssignedTo());
        if (updates.getDueDate() != null) existing.setDueDate(updates.getDueDate());
        return workflowRepository.save(existing);
    }

    @Transactional
    public void delete(String id) {
        workflowRepository.deleteById(id);
    }
}
