'use strict';
/**
 * Marked document PDF for ALL file types:
 * Page 1+ = AUDIT MARKS (always first)
 * Then original PDF pages / image page / extracted text pages
 */
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts, PageSizes } = require('pdf-lib');
const { attachMarkupPositions } = require('./auditMarkupService');

const MARK_COLOR = rgb(0.86, 0.15, 0.15);
const BANNER_BG = rgb(1, 0.94, 0.94);
const TEXT_DARK = rgb(0.2, 0.2, 0.2);
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff'];

function wrapText(text, maxChars) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return ['Issue flagged'];
  if (s.length <= maxChars) return [s];
  const lines = [];
  let rest = s;
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf(' ', maxChars);
    if (cut < maxChars * 0.5) cut = maxChars;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) lines.push(rest);
  return lines;
}

function drawMarkBlock(page, font, fontReg, margin, y, header, bodyLines, width) {
  page.drawText(header, {
    x: margin,
    y,
    size: 10,
    font,
    color: MARK_COLOR,
  });
  let ty = y - 13;
  bodyLines.forEach((line) => {
    page.drawText(line, {
      x: margin + 18,
      y: ty,
      size: 9,
      font: fontReg,
      color: MARK_COLOR,
      maxWidth: width - margin * 2 - 18,
    });
    ty -= 12;
  });
  return 14 + bodyLines.length * 12 + 10;
}

async function appendMarksPages(outDoc, font, fontReg, positioned, title) {
  let page = outDoc.addPage(PageSizes.A4);
  let { width, height } = page.getSize();
  const margin = 48;
  let y = height - 48;

  page.drawRectangle({
    x: margin - 8,
    y: y - 28,
    width: width - (margin - 8) * 2,
    height: 36,
    color: BANNER_BG,
    borderColor: MARK_COLOR,
    borderWidth: 1.5,
  });

  page.drawText('AUDIT MARKS', {
    x: margin,
    y: y - 10,
    size: 16,
    font,
    color: MARK_COLOR,
  });
  page.drawText('First page — applies to every marked document', {
    x: margin + 140,
    y: y - 8,
    size: 8,
    font: fontReg,
    color: TEXT_DARK,
  });
  y -= 50;

  if (title) {
    page.drawText(String(title).slice(0, 90), {
      x: margin,
      y,
      size: 10,
      font: fontReg,
      color: TEXT_DARK,
      maxWidth: width - margin * 2,
    });
    y -= 18;
  }

  page.drawText(
    positioned.length
      ? `${positioned.length} mistake(s) found during audit — review before release:`
      : 'No mistakes flagged — document passed audit.',
    {
      x: margin,
      y,
      size: 10,
      font: fontReg,
      color: TEXT_DARK,
      maxWidth: width - margin * 2,
    }
  );
  y -= 24;

  for (let i = 0; i < positioned.length; i++) {
    const m = positioned[i];
    const typeLabel = String(m.type || 'issue').replace(/_/g, ' ').toUpperCase();
    const severity = String(m.severity || '').toUpperCase();
    const header = `X  ${i + 1}. [${typeLabel}${severity ? ' · ' + severity : ''}]`;
    const bodyLines = wrapText(m.text, 88);
    const blockH = 14 + bodyLines.length * 12 + 10;

    if (y - blockH < 56) {
      page.drawText('Continued on next page…', {
        x: margin,
        y: 40,
        size: 8,
        font: fontReg,
        color: TEXT_DARK,
      });
      page = outDoc.addPage(PageSizes.A4);
      ({ width, height } = page.getSize());
      y = height - 48;
      page.drawText('AUDIT MARKS (continued)', {
        x: margin,
        y,
        size: 14,
        font,
        color: MARK_COLOR,
      });
      y -= 28;
    }

    y -= drawMarkBlock(page, font, fontReg, margin, y, header, bodyLines, width);
  }

  if (y > 50) {
    page.drawText('Original document follows.', {
      x: margin,
      y: Math.max(40, y - 8),
      size: 9,
      font: fontReg,
      color: TEXT_DARK,
    });
  }
}

async function appendPdfSource(outDoc, filePath) {
  const raw = fs.readFileSync(filePath);
  const srcDoc = await PDFDocument.load(raw, { ignoreEncryption: true });
  const pages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices());
  pages.forEach((p) => outDoc.addPage(p));
}

async function appendImageSource(outDoc, filePath) {
  const bytes = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  let image;
  if (ext === '.png') {
    image = await outDoc.embedPng(bytes);
  } else {
    // jpg/jpeg and most browser-uploaded photos
    image = await outDoc.embedJpg(bytes);
  }
  const page = outDoc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  const margin = 36;
  const maxW = width - margin * 2;
  const maxH = height - margin * 2;
  const scale = Math.min(maxW / image.width, maxH / image.height, 1);
  const w = image.width * scale;
  const h = image.height * scale;
  page.drawImage(image, {
    x: (width - w) / 2,
    y: (height - h) / 2,
    width: w,
    height: h,
  });
}

async function appendTextSource(outDoc, font, fontReg, extractedText, title) {
  const lines = String(extractedText || '').split(/\r?\n/);
  let page = outDoc.addPage(PageSizes.A4);
  let { width, height } = page.getSize();
  const margin = 48;
  let y = height - 48;

  page.drawText('Original document text', {
    x: margin,
    y,
    size: 12,
    font,
    color: TEXT_DARK,
  });
  y -= 16;
  if (title) {
    page.drawText(String(title).slice(0, 90), {
      x: margin,
      y,
      size: 9,
      font: fontReg,
      color: TEXT_DARK,
    });
    y -= 18;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = String(lines[i] || ' ').slice(0, 110);
    if (y < 50) {
      page = outDoc.addPage(PageSizes.A4);
      ({ width, height } = page.getSize());
      y = height - 48;
    }
    page.drawText(line || ' ', {
      x: margin,
      y,
      size: 9,
      font: fontReg,
      color: TEXT_DARK,
      maxWidth: width - margin * 2,
    });
    y -= 12;
  }
}

function detectKind(filePath, mimeType, fileName) {
  const ext = path.extname(filePath || fileName || '').toLowerCase();
  const mime = String(mimeType || '').toLowerCase();
  if (ext === '.pdf' || mime.includes('pdf')) return 'pdf';
  if (IMAGE_EXT.indexOf(ext) >= 0 || mime.startsWith('image/')) return 'image';
  return 'text';
}

/**
 * Unified marked download for every document type.
 * Always starts with AUDIT MARKS page(s), then original content.
 */
async function buildMarkedDownloadPdf(options) {
  const {
    filePath,
    extractedText,
    markup,
    title,
    mimeType,
    fileName,
  } = options || {};

  const positioned = attachMarkupPositions(extractedText, markup);
  const outDoc = await PDFDocument.create();
  const font = await outDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await outDoc.embedFont(StandardFonts.Helvetica);

  await appendMarksPages(outDoc, font, fontReg, positioned, title || fileName || 'Document');

  const kind = filePath && fs.existsSync(filePath)
    ? detectKind(filePath, mimeType, fileName)
    : 'text';

  try {
    if (kind === 'pdf') {
      await appendPdfSource(outDoc, filePath);
    } else if (kind === 'image') {
      await appendImageSource(outDoc, filePath);
    } else {
      await appendTextSource(outDoc, font, fontReg, extractedText, title || fileName);
    }
  } catch (err) {
    // If embedding original fails, still return marks + text fallback
    console.warn('Marked download: could not embed original file, using text fallback:', err.message);
    await appendTextSource(outDoc, font, fontReg, extractedText, title || fileName);
  }

  return outDoc.save();
}

/** @deprecated Prefer buildMarkedDownloadPdf — kept for callers that pass a PDF path. */
async function buildMarkedDocumentPdf(filePath, extractedText, markup) {
  return buildMarkedDownloadPdf({
    filePath,
    extractedText,
    markup,
    title: path.basename(filePath || 'document'),
  });
}

function buildMarkedTextView(extractedText, markup) {
  const positioned = attachMarkupPositions(extractedText, markup);
  const lines = String(extractedText || '').split(/\r?\n/);
  const markByLine = {};
  positioned.forEach(m => {
    if (m.lineIndex == null) return;
    if (!markByLine[m.lineIndex]) markByLine[m.lineIndex] = [];
    markByLine[m.lineIndex].push(m);
  });

  const renderedLines = lines.map((line, idx) => ({
    lineNumber: idx + 1,
    text: line,
    marks: markByLine[idx] || [],
    hasMark: Boolean(markByLine[idx]?.length),
  }));

  return {
    lines: renderedLines,
    unplacedMarks: positioned.filter(m => m.lineIndex == null),
    markup: positioned,
    totalMarks: positioned.length,
  };
}

async function buildMarkedTextPdf(extractedText, markup, title = 'Document') {
  return buildMarkedDownloadPdf({
    extractedText,
    markup,
    title,
    fileName: title,
  });
}

module.exports = {
  buildMarkedDownloadPdf,
  buildMarkedDocumentPdf,
  buildMarkedTextView,
  buildMarkedTextPdf,
};
