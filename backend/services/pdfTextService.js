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

// Detect the real file type from its leading bytes so a wrong/renamed
// extension (e.g. a PDF saved as .docx) can't fool the extractor.
function sniffFileType(buffer) {
  if (!buffer || buffer.length < 4) return null;
  var b = buffer;
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf';      // %PDF
  if (b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) return 'zip'; // PK.. (docx/xlsx/pptx)
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image';                       // JPEG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image';      // PNG
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image';      // GIF8
  if (b[0] === 0x42 && b[1] === 0x4d) return 'image';                                        // BMP
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) ||
      (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a)) return 'image';    // TIFF
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image';    // RIFF....WEBP
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return 'ole';        // legacy .doc/.xls (OLE2)
  return null;
}

// The OCR python script decides how to handle a file by its extension, so a
// mislabeled file (e.g. a PDF named .docx) must be presented with a correct
// extension. When `desiredExt` differs from the on-disk extension, run OCR on
// a temporary copy that carries the right extension.
function pythonCommands() {
  var commands = [];
  var envBin = process.env.PYTHON_BIN || process.env.PYTHON;
  if (envBin) {
    commands.push(envBin.trim().split(/\s+/));
  }
  commands.push(['py', '-3.12']);
  commands.push(['python3']);
  commands.push(['python']);
  return commands;
}

async function extractOcrText(filePath, desiredExt) {
  var ocrPath = filePath;
  var tempPath = null;
  if (desiredExt && path.extname(filePath).toLowerCase() !== desiredExt) {
    try {
      tempPath = path.join(path.dirname(filePath), 'ocr_' + Date.now() + desiredExt);
      fs.copyFileSync(filePath, tempPath);
      ocrPath = tempPath;
    } catch (e) {
      console.warn('Could not create OCR temp copy:', e.message);
      ocrPath = filePath;
    }
  }
  var cwd = path.join(__dirname, '..', 'forgery');
  var lastError = null;
  try {
    for (var i = 0; i < pythonCommands().length; i++) {
      var cmd = pythonCommands()[i];
      try {
        var result = await execFileAsync(cmd[0], cmd.slice(1).concat([OCR_SCRIPT, ocrPath]), {
          cwd: cwd,
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024,
        });
        var text = (result.stdout || '').trim();
        if (text) return text;
      } catch (e) {
        lastError = e;
      }
    }
    if (lastError) console.warn('OCR extraction failed:', lastError.message);
    return null;
  } finally {
    if (tempPath) {
      try { fs.unlinkSync(tempPath); } catch (e) { /* ignore cleanup errors */ }
    }
  }
}

// ── Office / text format extractors ──────────────────────────────────────────

async function extractDocxText(buffer) {
  try {
    var mammoth = require('mammoth');
    var docx = await mammoth.extractRawText({ buffer: buffer });
    var text = docx && docx.value ? docx.value.trim() : '';
    return text || null;
  } catch (e) {
    console.warn('DOCX parse failed:', e.message);
    return null;
  }
}

// Spreadsheets: .xlsx and legacy .xls are both handled by the `xlsx` package.
function extractSpreadsheetText(buffer) {
  try {
    var XLSX = require('xlsx');
    var wb = XLSX.read(buffer, { type: 'buffer' });
    var out = [];
    (wb.SheetNames || []).forEach(function (name) {
      var ws = wb.Sheets[name];
      if (!ws) return;
      var csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
      if (csv && csv.trim()) out.push('Sheet: ' + name + '\n' + csv);
    });
    var text = out.join('\n\n').trim();
    return text || null;
  } catch (e) {
    console.warn('Spreadsheet parse failed:', e.message);
    return null;
  }
}

// PowerPoint .pptx — read slide XML from the zip and pull the <a:t> text runs.
async function extractPptxText(buffer) {
  try {
    var JSZip = require('jszip');
    var zip = await JSZip.loadAsync(buffer);
    var slidePaths = Object.keys(zip.files)
      .filter(function (p) { return /ppt\/(slides|notesSlides)\/[^/]+\.xml$/i.test(p); })
      .sort();
    var texts = [];
    for (var i = 0; i < slidePaths.length; i++) {
      var xml = await zip.files[slidePaths[i]].async('string');
      var matches = xml.match(/<a:t>[\s\S]*?<\/a:t>/g) || [];
      var slideText = matches
        .map(function (m) { return m.replace(/<a:t>/, '').replace(/<\/a:t>/, ''); })
        .join(' ');
      if (slideText.trim()) texts.push(slideText);
    }
    var text = texts.join('\n')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .trim();
    return text || null;
  } catch (e) {
    console.warn('PPTX parse failed:', e.message);
    return null;
  }
}

// Rich Text Format — strip control words and groups.
function extractRtfText(buffer) {
  try {
    var rtf = buffer.toString('latin1');
    var text = rtf
      .replace(/\\par[d]?/g, '\n')
      .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
      .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
      .replace(/[{}]/g, '')
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return text || null;
  } catch (e) {
    return null;
  }
}

// Best-effort extraction of readable text runs from a binary blob (legacy .doc,
// or any unknown format). Tries both 1-byte and UTF-16LE encodings.
function extractPrintableStrings(buffer) {
  if (!buffer || !buffer.length) return null;
  function clean(s) {
    return (s || '')
      .replace(/[^\x20-\x7E\n\r\t]+/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim();
  }
  var latin = clean(buffer.toString('latin1'));
  var utf16 = '';
  try { utf16 = clean(buffer.toString('utf16le')); } catch (e) { utf16 = ''; }
  var best = latin.length >= utf16.length ? latin : utf16;
  return best.length > 20 ? best : null;
}

function looksLikeText(str) {
  if (!str) return false;
  var sample = str.slice(0, 4000);
  var printable = (sample.match(/[\x20-\x7E\n\r\t]/g) || []).length;
  return sample.length > 0 && printable / sample.length > 0.85;
}

async function extractTextFromFile(filePath, mimeType) {
  filePath = resolveExistingPath(filePath);
  if (!filePath) return null;

  var ext = path.extname(filePath).toLowerCase();
  var buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch (e) {
    console.warn('Could not read file from disk:', e.message);
    return null;
  }

  // Trust the actual content over the (possibly wrong/renamed) extension.
  var realType = sniffFileType(buffer);
  if (realType && realType !== 'zip') {
    var sniffedExt = path.extname(filePath).toLowerCase();
    if ((realType === 'pdf' && sniffedExt !== '.pdf') ||
        (realType === 'image' && IMAGE_EXT.indexOf(sniffedExt) < 0) ||
        (realType === 'ole' && sniffedExt !== '.doc' && sniffedExt !== '.xls')) {
      console.warn('File extension mismatch: ' + path.basename(filePath) +
        ' has extension "' + sniffedExt + '" but content is ' + realType + '. Using detected type.');
    }
  }

  if (realType === 'pdf' || (!realType && (ext === '.pdf' || (mimeType && mimeType.includes('pdf'))))) {
    var pdfText = await extractPdfText(buffer);
    if (pdfText && pdfText.trim().length >= 25) return pdfText;
    // Scanned PDF — fall back to OCR on first page
    return extractOcrText(filePath, '.pdf');
  }

  if (realType === 'image' || (!realType && isImageFile(filePath, mimeType))) {
    // OCR script only accepts .png/.jpg/.jpeg; normalize unknown image exts.
    var imgExt = path.extname(filePath).toLowerCase();
    var desiredImgExt = ['.png', '.jpg', '.jpeg'].indexOf(imgExt) >= 0 ? imgExt : '.jpg';
    return extractOcrText(filePath, desiredImgExt);
  }

  var mime = (mimeType || '').toLowerCase();

  // Office Open XML containers (zip): .docx / .xlsx / .pptx
  if (realType === 'zip' ||
      (!realType && (['.docx', '.xlsx', '.pptx'].indexOf(ext) >= 0 ||
        mime.includes('officedocument')))) {
    var isXlsx = ext === '.xlsx' || mime.includes('spreadsheetml');
    var isPptx = ext === '.pptx' || mime.includes('presentationml');
    var isDocx = ext === '.docx' || mime.includes('wordprocessingml');

    if (isXlsx) { var xl = extractSpreadsheetText(buffer); if (xl) return xl; }
    if (isPptx) { var pp = await extractPptxText(buffer); if (pp) return pp; }
    if (isDocx) { var dx = await extractDocxText(buffer); if (dx) return dx; }

    // Unknown/renamed zip — try each format until one yields text.
    return (await extractDocxText(buffer)) ||
      extractSpreadsheetText(buffer) ||
      (await extractPptxText(buffer)) ||
      null;
  }

  // Legacy OLE2 Office files: .doc / .xls
  if (realType === 'ole' || (!realType && (ext === '.doc' || ext === '.xls'))) {
    if (ext === '.xls' || mime.includes('ms-excel')) {
      var xls = extractSpreadsheetText(buffer);
      if (xls) return xls;
    }
    // Legacy .doc has no clean parser here — extract readable strings.
    return extractPrintableStrings(buffer);
  }

  if (ext === '.rtf' || mime.includes('rtf')) {
    return extractRtfText(buffer);
  }

  if (['.txt', '.csv', '.md', '.json', '.log', '.tsv', '.html', '.htm', '.xml'].indexOf(ext) >= 0) {
    try {
      return buffer.toString('utf8');
    } catch (e) {
      return null;
    }
  }

  // Last resort for any other/unknown type: decode as text if it looks textual,
  // otherwise pull readable strings out of the binary so SOMETHING is audited.
  try {
    var utf8 = buffer.toString('utf8');
    if (looksLikeText(utf8)) return utf8.trim() || null;
  } catch (e) { /* fall through */ }
  return extractPrintableStrings(buffer);
}

module.exports = {
  extractPdfText: extractPdfText,
  extractOcrText: extractOcrText,
  extractTextFromFile: extractTextFromFile,
  extractDocxText: extractDocxText,
  extractSpreadsheetText: extractSpreadsheetText,
  extractPptxText: extractPptxText,
  extractRtfText: extractRtfText,
  extractPrintableStrings: extractPrintableStrings,
  resolveExistingPath: resolveExistingPath,
  isImageFile: isImageFile,
  sniffFileType: sniffFileType,
};
