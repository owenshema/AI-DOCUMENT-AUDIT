/**
 * Retention Service
 * Business logic for document retention and archival
 */

const retentionRepository = require('../repositories/retentionRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const { ArchiveDocumentDTO, SetLegalHoldDTO } = require('../dto');

class RetentionService {
  async createRetentionPolicy(policyData) {
    const policy = await retentionRepository.createPolicy(policyData);

    // Log policy creation
    await auditLogRepository.create({
      action: 'retention_policy_created',
      resourceType: 'retention_policy',
      resourceId: policy.id,
      description: `Retention policy created: ${policyData.name}`
    });

    return policy;
  }

  async archiveDocument(archiveDTO) {
    // Validate DTO
    const errors = archiveDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    await retentionRepository.archiveDocument(archiveDTO.documentId, archiveDTO.reason);

    // Log archival
    await auditLogRepository.create({
      userId: archiveDTO.userId,
      action: 'document_archived',
      resourceType: 'document',
      resourceId: archiveDTO.documentId,
      description: `Document archived: ${archiveDTO.reason}`
    });

    return { success: true, documentId: archiveDTO.documentId };
  }

  async restoreArchivedDocument(restoreDTO) {
    // Validate DTO
    const errors = restoreDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    await retentionRepository.restoreArchivedDocument(restoreDTO.documentId);

    // Log restoration
    await auditLogRepository.create({
      userId: restoreDTO.userId,
      action: 'document_restored',
      resourceType: 'document',
      resourceId: restoreDTO.documentId,
      description: 'Document restored from archive'
    });

    return { success: true, documentId: restoreDTO.documentId };
  }

  async setLegalHold(setLegalHoldDTO) {
    // Validate DTO
    const errors = setLegalHoldDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    await retentionRepository.setLegalHold(
      setLegalHoldDTO.documentId,
      setLegalHoldDTO.reason,
      setLegalHoldDTO.expiryDate
    );

    // Log legal hold
    await auditLogRepository.create({
      userId: setLegalHoldDTO.userId,
      action: 'legal_hold_activated',
      resourceType: 'document',
      resourceId: setLegalHoldDTO.documentId,
      description: `Legal hold activated: ${setLegalHoldDTO.reason}`
    });

    return { success: true, documentId: setLegalHoldDTO.documentId };
  }

  async removeLegalHold(documentId, userId) {
    await retentionRepository.removeLegalHold(documentId);

    // Log removal
    await auditLogRepository.create({
      userId,
      action: 'legal_hold_removed',
      resourceType: 'document',
      resourceId: documentId,
      description: 'Legal hold removed'
    });

    return { success: true, documentId };
  }

  async getArchivedDocuments(page = 1, limit = 10) {
    return await retentionRepository.getArchivedDocuments(page, limit);
  }

  async getDocumentsOnLegalHold(page = 1, limit = 10) {
    return await retentionRepository.getDocumentsOnLegalHold(page, limit);
  }

  async getExpiringDocuments(daysThreshold = 30, page = 1, limit = 10) {
    return await retentionRepository.getExpiringDocuments(daysThreshold, page, limit);
  }

  async getRetentionPolicies(filters = {}, page = 1, limit = 10) {
    return await retentionRepository.getAllPolicies(filters, page, limit);
  }

  async getAllPolicies() {
    return await retentionRepository.getAllPolicies();
  }
}

module.exports = new RetentionService();
