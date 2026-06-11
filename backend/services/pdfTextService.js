'use strict';
/**
 * PDF / DOCX / image text extraction.
 */
var fs = require('fs');
var path = require('path');
var { execFile } = require('child_process');
var { promisify } = require('util');

var execFileAsync = promisify(execFile);
var OCR_SCRIPT = path.join(__dirname, '..', 'forgery', 'ocr_extract.py');
var IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff'];

async function extractPdfText(buffer) {
  if (!buffer || !buffer.length) return null;
  try {
    var PDFParse = require('pdf-parse').PDFParse;
    var parser = new PDFParse({ data: buffer });
    var result = await parser.getText();
    var text = result && result.text ? result.text : '';
    return text.trim() ? text : null;
  } catch (e) {
    console.warn('PDF text extraction failed:', e.message);
    return null;
  }
}

function resolveExistingPath(filePath) {
  if (!filePath) return null;
  var candidates = [
    path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath),
    path.resolve(__dirname, '..', filePath),
    path.resolve(__dirname, '..', '..', filePath),
  ];
  return candidates.find(function (candidate) { return fs.existsSync(candidate); }) || null;
}

function isImageFile(filePath, mimeType) {
  var ext = path.extname(filePath || '').toLowerCase();
  if (IMAGE_EXT.indexOf(ext) >= 0) return true;
  return !!(mimeType && String(mimeType).toLowerCase().startsWith('image/'));
}

async function extractOcrText(filePath) {
  try {
    var result = await execFileAsync('py', ['-3.12', OCR_SCRIPT, filePath], {
      cwd: path.join(__dirname, '..', 'forgery'),
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });
    var text = (result.stdout || '').trim();
    return text || null;
  } catch (e) {
    console.warn('OCR extraction failed:', e.message);
    return null;
  }
}

async function extractTextFromFile(filePath, mimeType) {
  filePath = resolveExistingPath(filePath);
  if (!filePath) return null;

  var ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf' || (mimeType && mimeType.includes('pdf'))) {
    var pdfText = await extractPdfText(fs.readFileSync(filePath));
    if (pdfText && pdfText.trim().length >= 25) return pdfText;
    // Scanned PDF — fall back to OCR on first page
    return extractOcrText(filePath);
  }

  if (isImageFile(filePath, mimeType)) {
    return extractOcrText(filePath);
  }

  if (ext === '.docx' || (mimeType && mimeType.includes('wordprocessingml'))) {
    try {
      var mammoth = require('mammoth');
      var docx = await mammoth.extractRawText({ path: filePath });
      return docx.value || null;
    } catch (e) {
      console.warn('DOCX parse failed:', e.message);
      return null;
    }
  }

  if (['.txt', '.csv', '.md'].includes(ext)) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      return null;
    }
  }

  return null;
}

module.exports = {
  extractPdfText: extractPdfText,
  extractOcrText: extractOcrText,
  extractTextFromFile: extractTextFromFile,
  resolveExistingPath: resolveExistingPath,
  isImageFile: isImageFile,
};
