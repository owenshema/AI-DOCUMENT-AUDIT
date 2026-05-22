/**
 * Document Service
 * Business logic for document management
 */

const documentRepository = require('../repositories/documentRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const { UploadDocumentDTO, UpdateDocumentDTO } = require('../dto');
const crypto = require('crypto');

class DocumentService {
  async uploadDocument(uploadDTO) {
    // Validate DTO
    const errors = uploadDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    // Generate file hash (simplified)
    const fileHash = crypto
      .createHash('sha256')
      .update(uploadDTO.fileName + Date.now())
      .digest('hex');

    // Check for duplicates
    const duplicate = await documentRepository.findByFileHash(fileHash);
    if (duplicate) {
      throw new Error('Document already exists (duplicate detected)');
    }

    // Create document
    const document = await documentRepository.create({
      title: uploadDTO.title,
      fileName: uploadDTO.fileName,
      fileFormat: uploadDTO.fileFormat,
      fileSize: uploadDTO.fileSize,
      classificationLevel: uploadDTO.classificationLevel,
      category: uploadDTO.category,
      department: uploadDTO.department,
      uploadedBy: uploadDTO.userId,
      fileHash,
      status: 'uploaded',
      ocrEnabled: uploadDTO.fileFormat.toLowerCase() === 'pdf'
    });

    // Log upload
    await auditLogRepository.create({
      userId: uploadDTO.userId,
      action: 'document_uploaded',
      resourceType: 'document',
      resourceId: document.id,
      description: `Document uploaded: ${uploadDTO.title}`
    });

    return document;
  }

  async updateDocument(updateDTO) {
    // Validate DTO
    const errors = updateDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    const document = await documentRepository.findById(updateDTO.documentId);
    if (!document) throw new Error('Document not found');

    const updates = {};
    if (updateDTO.title) updates.title = updateDTO.title;
    if (updateDTO.category) updates.category = updateDTO.category;
    if (updateDTO.department) updates.department = updateDTO.department;
    if (updateDTO.classificationLevel) updates.classificationLevel = updateDTO.classificationLevel;
    if (updateDTO.tags) updates.tags = updateDTO.tags;

    const updated = await documentRepository.update(updateDTO.documentId, updates);

    // Log update
    await auditLogRepository.create({
      action: 'document_updated',
      resourceType: 'document',
      resourceId: updateDTO.documentId,
      description: `Document updated: ${updateDTO.title}`
    });

    return updated;
  }

  async deleteDocument(documentId, hardDelete = false) {
    const document = await documentRepository.findById(documentId);
    if (!document) throw new Error('Document not found');

    await documentRepository.delete(documentId, !hardDelete);

    // Log deletion
    await auditLogRepository.create({
      action: 'document_deleted',
      resourceType: 'document',
      resourceId: documentId,
      description: `Document deleted: ${document.title} (${hardDelete ? 'permanent' : 'soft delete'})`
    });

    return { success: true };
  }

  async shareDocument(documentId, sharedWithIds, permission) {
    const document = await documentRepository.findById(documentId);
    if (!document) throw new Error('Document not found');

    await documentRepository.shareDocument(documentId, sharedWithIds, permission);

    // Log sharing
    await auditLogRepository.create({
      action: 'document_shared',
      resourceType: 'document',
      resourceId: documentId,
      description: `Document shared with ${sharedWithIds.length} users`
    });

    return { success: true, shared: sharedWithIds.length };
  }

  async getDocumentById(documentId) {
    const document = await documentRepository.findById(documentId);
    if (!document) throw new Error('Document not found');

    // Log access
    await auditLogRepository.create({
      action: 'document_viewed',
      resourceType: 'document',
      resourceId: documentId,
      description: `Document accessed: ${document.title}`
    });

    return document;
  }

  async searchDocuments(query, filters = {}, page = 1, limit = 10) {
    const results = await documentRepository.searchByFullText(query, filters);
    
    // Log search
    await auditLogRepository.create({
      action: 'document_searched',
      resourceType: 'search',
      description: `Full-text search: "${query}"`
    });

    return {
      query,
      totalResults: results.length,
      page,
      limit,
      results: results.slice((page - 1) * limit, page * limit)
    };
  }

  async getAccessLogs(documentId) {
    const logs = await documentRepository.getAccessLogs(documentId);
    return logs;
  }

  async bulkUpload(documents, userId) {
    const uploadResults = [];

    for (const doc of documents) {
      try {
        const uploadDTO = new UploadDocumentDTO(
          doc.title,
          doc.fileName,
          doc.fileFormat,
          doc.fileSize,
          doc.classificationLevel,
          doc.category,
          doc.department,
          userId
        );

        const result = await this.uploadDocument(uploadDTO);
        uploadResults.push({ success: true, documentId: result.id });
      } catch (error) {
        uploadResults.push({ success: false, error: error.message });
      }
    }

    // Log bulk upload
    await auditLogRepository.create({
      userId,
      action: 'bulk_upload',
      description: `Bulk uploaded ${uploadResults.filter(r => r.success).length}/${documents.length} documents`
    });

    return uploadResults;
  }

  async downloadDocument(documentId, userId) {
    const document = await documentRepository.findById(documentId);
    if (!document) throw new Error('Document not found');

    // Log download
    await auditLogRepository.create({
      userId,
      action: 'document_downloaded',
      resourceType: 'document',
      resourceId: documentId,
      description: `Document downloaded: ${document.title}`
    });

    return document;
  }
}

module.exports = new DocumentService();
