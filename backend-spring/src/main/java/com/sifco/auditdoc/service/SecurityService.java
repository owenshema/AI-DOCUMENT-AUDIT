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
public class SecurityService {
    private final SecurityRecordRepository securityRecordRepository;

    @Transactional(readOnly = true)
    public Page<SecurityRecord> getAll(int page, int size) {
        return securityRecordRepository.findAll(PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public SecurityRecord getByDocument(String documentId) {
        return securityRecordRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Security record not found for document: " + documentId));
    }

    @Transactional
    public SecurityRecord create(SecurityRecord record, String userId) {
        record.setCreatedBy(userId);
        return securityRecordRepository.save(record);
    }

    @Transactional
    public SecurityRecord update(String id, SecurityRecord updates) {
        SecurityRecord existing = securityRecordRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Security record not found: " + id));
        if (updates.getClassification() != null) existing.setClassification(updates.getClassification());
        existing.setCanDownload(updates.isCanDownload());
        existing.setCanPrint(updates.isCanPrint());
        existing.setCanShare(updates.isCanShare());
        existing.setWatermarkEnabled(updates.isWatermarkEnabled());
        if (updates.getWatermarkText() != null) existing.setWatermarkText(updates.getWatermarkText());
        existing.setEncryptionEnabled(updates.isEncryptionEnabled());
        return securityRecordRepository.save(existing);
    }

    @Transactional
    public void delete(String id) {
        securityRecordRepository.deleteById(id);
    }
}
