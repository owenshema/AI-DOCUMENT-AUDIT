'use strict';
/**
 * Overlay red ✕ marks on the original document PDF at mistake locations.
 */
const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { attachMarkupPositions } = require('./auditMarkupService');

const MARK_COLOR = rgb(0.86, 0.15, 0.15);
const LINE_HEIGHT = 14;
const TOP_MARGIN = 50;
const BOTTOM_MARGIN = 50;

function linesPerPage(pageHeight) {
  return Math.max(20, Math.floor((pageHeight - TOP_MARGIN - BOTTOM_MARGIN) / LINE_HEIGHT));
}

/**
 * Draw red ✕ and a short strike line on PDF pages at estimated line positions.
 */
async function buildMarkedDocumentPdf(filePath, extractedText, markup) {
  const positioned = attachMarkupPositions(extractedText, markup);
  const raw = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(raw, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const allLines = String(extractedText || '').split(/\r?\n/);
  const totalLines = Math.max(allLines.length, 1);

  if (pages.length === 0) {
    throw new Error('PDF has no pages');
  }

  const pageMetrics = pages.map(p => {
    const { height, width } = p.getSize();
    return { height, width, lpp: linesPerPage(height) };
  });

  // Always put a marks legend at the top of page 1 so mistakes are visible first.
  if (positioned.length && pages[0]) {
    const p0 = pages[0];
    const { height, width } = p0.getSize();
    let y = height - 28;
    p0.drawText(`AUDIT MARKS (${positioned.length}) — see red X on document`, {
      x: 36, y, size: 9, font, color: MARK_COLOR,
    });
    y -= 12;
    positioned.slice(0, 8).forEach((m, i) => {
      drawCrossMark(p0, font, 36, y, 12);
      p0.drawText(`${i + 1}. ${String(m.text).slice(0, 72)}`, {
        x: 52, y: y - 2, size: 7, font, color: MARK_COLOR,
        maxWidth: width - 70,
      });
      y -= 11;
    });
    if (positioned.length > 8) {
      p0.drawText(`… and ${positioned.length - 8} more (inline below)`, {
        x: 52, y: y - 2, size: 7, font, color: MARK_COLOR,
      });
    }
  }

  positioned.forEach((mark, markIdx) => {
    if (mark.lineIndex == null) return;

    let remaining = mark.lineIndex;
    let pageIdx = 0;
    for (let i = 0; i < pageMetrics.length; i++) {
      if (remaining < pageMetrics[i].lpp) {
        pageIdx = i;
        break;
      }
      remaining -= pageMetrics[i].lpp;
      if (i === pageMetrics.length - 1) {
        pageIdx = i;
        remaining = Math.min(remaining, pageMetrics[i].lpp - 1);
      }
    }

    const page = pages[pageIdx];
    const { height, width } = pageMetrics[pageIdx];
    const y = height - TOP_MARGIN - remaining * LINE_HEIGHT;

    drawCrossMark(page, font, 18, y, 16);
    page.drawCircle({
      x: 42,
      y: y + 2,
      size: 3,
      borderColor: MARK_COLOR,
      borderWidth: 1.5,
    });

    // Red strike-through band across the text area
    page.drawLine({
      start: { x: 48, y: y + 4 },
      end: { x: width - 36, y: y + 4 },
      thickness: 1.5,
      color: MARK_COLOR,
      opacity: 0.85,
    });

    const snippet = String(mark.matchedLine || allLines[mark.lineIndex] || '').trim().slice(0, 40);
    if (snippet) {
      page.drawText(snippet, {
        x: 48,
        y: y - 1,
        size: 7,
        font,
        color: MARK_COLOR,
        maxWidth: width - 90,
      });
    }

    page.drawText(String(markIdx + 1), {
      x: width - 28,
      y: y - 2,
      size: 8,
      font,
      color: MARK_COLOR,
    });
  });

  return pdfDoc.save();
}

function drawCrossMark(page, font, x, y, size) {
  page.drawText('X', {
    x,
    y: y - 2,
    size,
    font,
    color: MARK_COLOR,
  });
  // Second stroke for thicker cross appearance
  page.drawLine({
    start: { x: x + 2, y: y + size - 4 },
    end: { x: x + size - 2, y: y - 4 },
    thickness: 1.2,
    color: MARK_COLOR,
  });
  page.drawLine({
    start: { x: x + size - 2, y: y + size - 4 },
    end: { x: x + 2, y: y - 4 },
    thickness: 1.2,
    color: MARK_COLOR,
  });
}

/**
 * Text/HTML marked view for non-PDF or in-app preview.
 */
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

  const unplacedMarks = positioned.filter(m => m.lineIndex == null);

  return {
    lines: renderedLines,
    unplacedMarks,
    markup: positioned,
    totalMarks: positioned.length,
  };
}

/**
 * PDF reproduction of document text with red ✕ on mistake lines (non-PDF originals).
 */
async function buildMarkedTextPdf(extractedText, markup, title = 'Document') {
  const PDFDocument = require('pdfkit');
  const view = buildMarkedTextView(extractedText, markup);
  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(14).fillColor('#dc2626').text('Document with audit marks', { align: 'center' });
    doc.fontSize(10).fillColor('#374151').text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(8).fillColor('#dc2626').text('Red X marks indicate mistakes found during audit.');
    doc.moveDown(0.5);

    // Marks summary always at the top of the document
    const allMarks = [
      ...(view.markup || []).filter(m => m.lineIndex != null),
      ...(view.unplacedMarks || []),
    ];
    if (allMarks.length) {
      doc.fontSize(11).fillColor('#dc2626').text(`AUDIT MARKS (${allMarks.length}) — listed at top of document`);
      doc.moveDown(0.3);
      allMarks.forEach((m, i) => {
        const lineHint = m.lineIndex != null ? ` [line ${m.lineIndex + 1}]` : '';
        doc.fontSize(9).fillColor('#dc2626').text(`X  ${i + 1}. ${String(m.text).slice(0, 100)}${lineHint}`);
      });
      doc.moveDown(0.8);
      doc.fontSize(9).fillColor('#374151').text('Document text with inline marks:');
      doc.moveDown(0.3);
    }

    view.lines.forEach(row => {
      if (row.hasMark) {
        doc.fontSize(10).fillColor('#dc2626').text(`X  ${row.text || ''}`);
        (row.marks || []).slice(0, 1).forEach(m => {
          doc.fontSize(7).fillColor('#991b1b').text(`      >> ${String(m.text).slice(0, 90)}`);
        });
      } else {
        doc.fontSize(9).fillColor('#374151').text(row.text || ' ');
      }
    });

    doc.end();
  });
}

module.exports = {
  buildMarkedDocumentPdf,
  buildMarkedTextView,
  buildMarkedTextPdf,
};
