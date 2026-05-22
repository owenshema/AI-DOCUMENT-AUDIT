/**
 * Search Model
 * Saved searches and search history
 */

const SearchSchema = {
  id: { type: String, unique: true, required: true },
  userId: { type: String, required: true },
  queryType: { type: String, enum: ['full_text', 'metadata', 'advanced', 'boolean'], required: true },
  searchQuery: { type: String, required: true },
  filters: {
    documentType: [{ type: String }],
    category: [{ type: String }],
    department: [{ type: String }],
    dateRange: {
      startDate: { type: Date },
      endDate: { type: Date }
    },
    status: [{ type: String }],
    classificationLevel: [{ type: String }],
    author: { type: String },
    searchWithin: { type: String }
  },
  results: [{
    documentId: { type: String },
    title: { type: String },
    relevanceScore: { type: Number, min: 0, max: 1 },
    snippet: { type: String },
    matchedFields: [{ type: String }]
  }],
  isSavedSearch: { type: Boolean, default: false },
  searchName: { type: String },
  frequency: { type: String, enum: ['once', 'daily', 'weekly', 'monthly'] },
  lastExecuted: { type: Date },
  executionCount: { type: Number, default: 1 },
  resultCount: { type: Number },
  executionTime: { type: Number },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

module.exports = SearchSchema;
