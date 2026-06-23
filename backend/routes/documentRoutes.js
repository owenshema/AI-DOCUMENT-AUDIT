/**
 * Document Routes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const documentController = require('../controllers/documentController');

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 },
  fileFilter: (req, file, cb) => {
    // Accept any document type. Only executable/installer files are blocked for safety.
    const blocked = /^(exe|bat|cmd|com|scr|msi|dll|sys|sh|bash|ps1|jar|app|deb|rpm|apk|bin|run)$/i;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (ext && blocked.test(ext)) {
      return cb(new Error('For security, executable files (.' + ext + ') cannot be uploaded.'));
    }
    return cb(null, true);
  }
});

router.get('/', documentController.getAllDocuments);
router.post('/', upload.single('file'), documentController.uploadDocument);
router.post('/bulk/upload', upload.array('files', 20), documentController.bulkUpload);
router.get('/:id', documentController.getDocumentById);
router.put('/:id', documentController.updateDocument);
router.post('/:id/reupload', upload.single('file'), documentController.reuploadDocument);
router.patch('/:id/status', documentController.updateDocumentStatus);
router.delete('/:id', documentController.deleteDocument);
router.get('/:id/download', documentController.downloadDocument);
router.get('/:id/preview-text', documentController.previewDocumentText);
router.post('/:id/share', documentController.shareDocument);
router.get('/:id/access-logs', documentController.getAccessLogs);

module.exports = router;
