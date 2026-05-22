/**
 * Security Model
 * Document security and access controls
 */

const SecuritySchema = {
  id: { type: String, unique: true, required: true },
  documentId: { type: String, required: true },
  classificationLevel: { 
    type: String, 
    enum: ['public', 'internal', 'confidential', 'restricted'],
    default: 'internal'
  },
  securityClearanceRequired: {
    minimumLevel: { type: String, enum: ['none', 'basic', 'confidential', 'secret', 'top_secret'] },
    requiredClearances: [{ type: String }]
  },
  accessControls: {
    isPublic: { type: Boolean, default: false },
    restrictedUsers: [{ type: String }],
    restrictedRoles: [{ type: String }],
    allowedUsers: [{ type: String }],
    allowedRoles: [{ type: String }],
    allowedDepartments: [{ type: String }],
    requireMFA: { type: Boolean, default: false },
    allowNetworkRanges: [{ type: String }],
    requireVPN: { type: Boolean, default: false }
  },
  encryption: {
    isEncrypted: { type: Boolean, default: false },
    encryptionMethod: { type: String },
    keyId: { type: String }
  },
  watermarking: {
    enabled: { type: Boolean, default: false },
    visibleWatermark: { type: String },
    invisibleWatermark: { type: String },
    includeViewerInfo: { type: Boolean, default: true },
    includeTimestamp: { type: Boolean, default: true }
  },
  restrictions: {
    allowDownload: { type: Boolean, default: true },
    allowPrint: { type: Boolean, default: true },
    allowScreenCapture: { type: Boolean, default: false },
    allowCopyPaste: { type: Boolean, default: false },
    allowForwarding: { type: Boolean, default: false },
    allowAnnotation: { type: Boolean, default: false },
    expiryDate: { type: Date }
  },
  screenCaptureDetection: {
    enabled: { type: Boolean, default: false },
    alertOnCapture: { type: Boolean, default: true },
    blockCapture: { type: Boolean, default: false }
  },
  dataLossPrevention: {
    dlpRulesApplied: [{ type: String }],
    exfiltrationDetected: { type: Boolean, default: false },
    detectionDetails: [{ type: Object }]
  },
  shares: [{
    sharedWith: { type: String },
    sharedAt: { type: Date },
    expiryDate: { type: Date },
    accessLevel: { type: String, enum: ['view', 'download', 'edit'] },
    notificationSent: { type: Boolean }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

module.exports = SecuritySchema;
