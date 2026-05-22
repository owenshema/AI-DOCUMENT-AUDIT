/**
 * Search Service
 * Business logic for document search
 */

const searchRepository = require('../repositories/searchRepository');
const documentRepository = require('../repositories/documentRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const { SearchDocumentsDTO, SaveSearchDTO } = require('../dto');

class SearchService {
  async searchDocuments(searchDTO) {
    // Validate DTO
    const errors = searchDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    const documents = await searchRepository.searchDocuments(
      searchDTO.query,
      searchDTO.filters
    );

    // Log search
    await auditLogRepository.create({
      userId: searchDTO.userId,
      action: 'document_searched',
      description: `Search executed: "${searchDTO.query}"`
    });

    return {
      query: searchDTO.query,
      totalResults: documents.length,
      results: documents
    };
  }

  async advancedSearch(criteria, userId) {
    const documents = await searchRepository.advancedSearch(criteria);

    // Log advanced search
    await auditLogRepository.create({
      userId,
      action: 'advanced_search',
      description: 'Advanced search executed'
    });

    return {
      criteria,
      totalResults: documents.length,
      results: documents
    };
  }

  async saveSearch(saveDTO) {
    // Validate DTO
    const errors = saveDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    const saved = await searchRepository.saveSearch({
      name: saveDTO.name,
      query: saveDTO.query,
      filters: saveDTO.filters,
      userId: saveDTO.userId
    });

    // Log save
    await auditLogRepository.create({
      userId: saveDTO.userId,
      action: 'search_saved',
      description: `Search saved: ${saveDTO.name}`
    });

    return saved;
  }

  async getSavedSearches(userId, page = 1, limit = 10) {
    return await searchRepository.getSavedSearches(userId, page, limit);
  }

  async getSearchHistory(userId, page = 1, limit = 50) {
    return await searchRepository.getSearchHistory(userId, page, limit);
  }

  async deleteSavedSearch(searchId, userId) {
    await searchRepository.deleteSavedSearch(searchId);

    // Log deletion
    await auditLogRepository.create({
      userId,
      action: 'search_deleted',
      resourceType: 'search',
      resourceId: searchId,
      description: 'Saved search deleted'
    });

    return { success: true, searchId };
  }

  async getPopularSearches(days = 30) {
    return await searchRepository.getPopularSearches(days);
  }

  async getRecentSearches(userId, limit = 5) {
    return await searchRepository.getRecentSearches(userId, limit);
  }
}

module.exports = new SearchService();
