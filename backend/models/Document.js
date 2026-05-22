/**
 * Document Model
 * Core document storage and metadata
 */

const DocumentSchema = {
  id: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  description: { type: String },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number },
  fileFormat: { type: String, enum: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'TXT'], required: true },
  mimeType: { type: String },
  category: { type: String, enum: ['Financial', 'Legal', 'Technical', 'Administrative', 'Compliance', 'Other'], required: true },
  status: { 
    type: String, 
    enum: ['draft', 'uploaded', 'processing', 'reviewed', 'approved', 'archived'],
    default: 'draft'
  },
  department: { type: String, required: true },
  project: { type: String },
  tags: [{ type: String }],
  classificationLevel: { 
    type: String, 
    enum: ['public', 'internal', 'confidential', 'restricted'],
    default: 'internal'
  },
  retentionDays: { type: Number, default: 365 },
  uploadedBy: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  lastModifiedBy: { type: String },
  lastModifiedAt: { type: Date },
  expiryDate: { type: Date },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  isDuplicate: { type: Boolean, default: false },
  duplicateOf: { type: String },
  ocrProcessed: { type: Boolean, default: false },
  extractedText: { type: String },
  metadata: {
    author: { type: String },
    creationDate: { type: Date },
    modificationDate: { type: Date },
    version: { type: String },
    customFields: { type: Object }
  },
  accessLogs: [{
    userId: { type: String },
    action: { type: String, enum: ['view', 'download', 'share', 'print'] },
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date }
};

module.exports = DocumentSchema;
