/**
 * DocumentAnalysis Model
 * AI-powered document analysis and extraction
 */

const DocumentAnalysisSchema = {
  id: { type: String, unique: true, required: true },
  documentId: { type: String, required: true },
  analysisType: { 
    type: String, 
    enum: ['full', 'ocr', 'entity_extraction', 'sentiment', 'anomaly', 'classification'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued'
  },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  startedAt: { type: Date },
  completedAt: { type: Date },
  results: {
    extractedText: { type: String },
    keyInformation: [{
      type: { type: String },
      value: { type: String },
      confidence: { type: Number, min: 0, max: 1 }
    }],
    entities: [{
      type: { type: String, enum: ['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE', 'AMOUNT', 'EMAIL', 'PHONE'] },
      value: { type: String },
      confidence: { type: Number, min: 0, max: 1 },
      occurrences: { type: Number }
    }],
    classification: {
      primaryCategory: { type: String },
      confidence: { type: Number, min: 0, max: 1 },
      suggestedCategories: [{ type: String }]
    },
    sentiment: {
      score: { type: Number, min: -1, max: 1 },
      sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
      confidence: { type: Number, min: 0, max: 1 }
    },
    anomalies: [{
      type: { type: String },
      description: { type: String },
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      confidence: { type: Number, min: 0, max: 1 }
    }],
    summary: { type: String },
    overallConfidence: { type: Number, min: 0, max: 1 }
  },
  manualCorrections: [{
    correctionType: { type: String },
    originalValue: { type: String },
    correctedValue: { type: String },
    madeBy: { type: String },
    madeAt: { type: Date }
  }],
  aiModel: { type: String },
  apiUsage: {
    tokensUsed: { type: Number },
    costEstimate: { type: Number }
  },
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

module.exports = DocumentAnalysisSchema;
