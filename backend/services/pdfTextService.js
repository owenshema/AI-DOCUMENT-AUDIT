'use strict';
/**
 * PDF text extraction — pdf-parse v2 API (PDFParse class, not a callable default export).
 */
var fs = require('fs');
var path = require('path');

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

async function extractTextFromFile(filePath, mimeType) {
  filePath = resolveExistingPath(filePath);
  if (!filePath) return null;

  var ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf' || (mimeType && mimeType.includes('pdf'))) {
    return extractPdfText(fs.readFileSync(filePath));
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
  extractTextFromFile: extractTextFromFile,
  resolveExistingPath: resolveExistingPath,
};
