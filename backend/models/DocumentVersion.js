/**
 * DocumentVersion Model
 * Tracks version history and changes
 */

const DocumentVersionSchema = {
  id: { type: String, unique: true, required: true },
  documentId: { type: String, required: true },
  versionNumber: { type: Number, required: true },
  majorVersion: { type: Number },
  minorVersion: { type: Number },
  filePath: { type: String, required: true },
  fileSize: { type: Number },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  changeNotes: { type: String },
  changeDescription: { type: String },
  approvalStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'in_review'],
    default: 'pending'
  },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  comparisons: {
    previousVersionId: { type: String },
    differences: [{ type: Object }],
    changesSummary: { type: String }
  },
  isRestored: { type: Boolean, default: false },
  restoredAt: { type: Date },
  restoredBy: { type: String },
  retentionDays: { type: Number },
  expiryDate: { type: Date },
  metadata: { type: Object },
  updatedAt: { type: Date, default: Date.now }
};

module.exports = DocumentVersionSchema;
