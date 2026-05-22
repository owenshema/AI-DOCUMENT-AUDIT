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
public class RetentionService {
    private final RetentionPolicyRepository retentionPolicyRepository;

    @Transactional(readOnly = true)
    public Page<RetentionPolicy> getAll(int page, int size) {
        return retentionPolicyRepository.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }

    @Transactional(readOnly = true)
    public RetentionPolicy getById(String id) {
        return retentionPolicyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Retention policy not found: " + id));
    }

    @Transactional
    public RetentionPolicy create(RetentionPolicy policy, String userId) {
        policy.setCreatedBy(userId);
        policy.setActive(true);
        return retentionPolicyRepository.save(policy);
    }

    @Transactional
    public RetentionPolicy update(String id, RetentionPolicy updates) {
        RetentionPolicy existing = getById(id);
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getRetentionPeriodDays() != null) existing.setRetentionPeriodDays(updates.getRetentionPeriodDays());
        if (updates.getActionOnExpiry() != null) existing.setActionOnExpiry(updates.getActionOnExpiry());
        existing.setLegalHold(updates.isLegalHold());
        if (updates.getLegalHoldReason() != null) existing.setLegalHoldReason(updates.getLegalHoldReason());
        return retentionPolicyRepository.save(existing);
    }

    @Transactional
    public void delete(String id) {
        retentionPolicyRepository.deleteById(id);
    }
}
