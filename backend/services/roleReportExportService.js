'use strict';
/**
 * Multi-format exporter for role reports (PDF, Excel, CSV, Word).
 * All formats carry the SIFCO brand for a consistent, user-friendly look.
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const layout = require('./reportLayout');

const SIFCO_LOGO_PATH = path.join(__dirname, '..', 'assets', 'sifco-logo.png');
const SIFCO_LOGO_EXISTS = fs.existsSync(SIFCO_LOGO_PATH);

function formatCell(value) {
  if (value == null || value === '') return '';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function summaryEntries(report) {
  return report && report.summary ? Object.entries(report.summary) : [];
}

function safeFileBase(report) {
  return (report.id || 'report').replace(/[^a-z0-9_-]+/gi, '_');
}

// ── CSV ───────────────────────────────────────────────────────────────────
function toCsv(report) {
  const cols = report.columns || [];
  const header = cols.map(function (c) { return '"' + String(c.label).replace(/"/g, '""') + '"'; }).join(',');
  const lines = (report.rows || []).map(function (row) {
    return cols.map(function (c) {
      return '"' + formatCell(row[c.key]).replace(/"/g, '""') + '"';
    }).join(',');
  });
  return [header].concat(lines).join('\r\n');
}

// ── Plain text ──────────────────────────────────────────────────────────────
function toTxt(report) {
  const cols = report.columns || [];
  const out = [];
  out.push('='.repeat(64));
  out.push('SIFCO - SUPER INTERNATIONAL FREIGHT');
  out.push('DocAudit AI  -  ' + (report.title || 'Report'));
  out.push('='.repeat(64));
  out.push('');
  if (report.scopeLabel) out.push('Scope     : ' + report.scopeLabel);
  if (report.periodDays) out.push('Period    : Last ' + report.periodDays + ' days');
  out.push('Prepared By: ' + (report.preparedBy || 'System'));
  out.push('Generated : ' + new Date(report.generatedAt || Date.now()).toLocaleString());
  out.push('Rows      : ' + ((report.rows || []).length));
  out.push('');
  const entries = summaryEntries(report);
  if (entries.length) {
    out.push('-- Summary --');
    entries.forEach(function (e) { out.push('  ' + e[0] + ': ' + formatCell(e[1])); });
    out.push('');
  }
  out.push('-- Records --');
  out.push(cols.map(function (c) { return c.label; }).join(' | '));
  out.push('-'.repeat(64));
  (report.rows || []).forEach(function (row) {
    out.push(cols.map(function (c) { return formatCell(row[c.key]); }).join(' | '));
  });
  out.push('');
  out.push('='.repeat(64));
  out.push('Super International Freight / SIFCO  -  CONFIDENTIAL');
  return out.join('\n');
}

// ── Excel (.xlsx) ─────────────────────────────────────────────────────────
function toXlsxBuffer(report) {
  const cols = report.columns || [];
  const wb = XLSX.utils.book_new();

  const header = cols.map(function (c) { return c.label; });
  const dataRows = (report.rows || []).map(function (row) {
    return cols.map(function (c) { return formatCell(row[c.key]); });
  });
  const ws = XLSX.utils.aoa_to_sheet([header].concat(dataRows));
  ws['!cols'] = header.map(function (h, i) {
    let max = String(h).length;
    dataRows.forEach(function (r) { max = Math.max(max, String(r[i] || '').length); });
    return { wch: Math.min(Math.max(max + 2, 10), 60) };
  });
  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  const entries = summaryEntries(report);
  const metaAoa = [
    ['SIFCO - Super International Freight'],
    ['Report', report.title || ''],
    ['Scope', report.scopeLabel || ''],
    ['Period', report.periodDays ? 'Last ' + report.periodDays + ' days' : ''],
    ['Generated', new Date(report.generatedAt || Date.now()).toLocaleString()],
    [],
  ];
  if (entries.length) {
    metaAoa.push(['Summary', '']);
    entries.forEach(function (e) { metaAoa.push([e[0], formatCell(e[1])]); });
  }
  const metaWs = XLSX.utils.aoa_to_sheet(metaAoa);
  metaWs['!cols'] = [{ wch: 24 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, metaWs, 'Summary');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// ── Word (.doc — Word-compatible HTML with embedded logo) ──────────────────
let LOGO_DATA_URI = null;
function logoDataUri() {
  if (LOGO_DATA_URI !== null) return LOGO_DATA_URI;
  try {
    LOGO_DATA_URI = SIFCO_LOGO_EXISTS
      ? 'data:image/png;base64,' + fs.readFileSync(SIFCO_LOGO_PATH).toString('base64')
      : '';
  } catch (e) { LOGO_DATA_URI = ''; }
  return LOGO_DATA_URI;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toWordHtml(report) {
  const cols = report.columns || [];
  const logo = logoDataUri();
  const entries = summaryEntries(report);
  const B = layout.BRAND;
  const preparedBy = report.preparedBy || 'System';
  const period = reportPeriodLabel(report);
  const dateGenerated = layout.fmtDate(report.generatedAt || Date.now());
  const centeredTitle = (report.title || 'Report') + ' &ndash; ' + layout.monthYear(report.generatedAt);

  const summaryHtml = entries.length
    ? '<table class="summary"><tr>' + entries.map(function (e) {
        return '<td><div class="k">' + esc(e[0]) + '</div><div class="v">' + esc(formatCell(e[1])) + '</div></td>';
      }).join('') + '</tr></table>'
    : '';

  const head = '<tr>' + cols.map(function (c) { return '<th>' + esc(c.label) + '</th>'; }).join('') + '</tr>';
  const body = (report.rows || []).map(function (row) {
    return '<tr>' + cols.map(function (c) {
      const val = formatCell(row[c.key]);
      const tint = layout.cellColor(c.label, val);
      const style = tint ? ' style="color:' + tint + ';font-weight:bold;"' : '';
      return '<td' + style + '>' + esc(val) + '</td>';
    }).join('') + '</tr>';
  }).join('');

  const detailRow = function (k, v) {
    return '<div class="drow"><span class="dk">' + esc(k) + ':</span> ' + esc(v) + '</div>';
  };

  return '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" '
    + 'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
    + '<head><meta charset="utf-8"><title>' + esc(report.title || 'Report') + '</title>'
    + '<style>'
    + 'body{font-family:Calibri,Arial,sans-serif;color:#1a1d24;font-size:11pt;}'
    + '.hdr{border-bottom:3px solid #1f3a5f;padding-bottom:8px;margin-bottom:14px;overflow:hidden;}'
    + '.hdr .l{float:left;}'
    + '.hdr .r{float:right;text-align:right;color:#1a2b48;font-weight:bold;font-size:9pt;}'
    + '.hdr img{height:40px;display:block;margin-bottom:6px;}'
    + '.hdr .co{font-size:13pt;font-weight:bold;}'
    + '.hdr .brand{font-size:10pt;font-weight:bold;color:#1a2b48;}'
    + '.hdr .tag{font-size:8pt;font-weight:bold;color:#1a2b48;}'
    + '.section-h{font-size:12pt;font-weight:bold;color:#1a2b48;margin-top:6px;}'
    + '.rule-orange{border-bottom:2px solid #e8702a;margin:4px 0 8px;}'
    + '.rule-green{border-bottom:2px solid #2e8b57;margin:8px 0 14px;}'
    + '.rname{font-size:11pt;font-weight:bold;margin-bottom:4px;}'
    + '.drow{font-size:10pt;margin:2px 0;}'
    + '.dk{font-weight:bold;}'
    + '.title{font-size:17pt;font-weight:bold;margin:6px 0 12px;text-align:center;}'
    + 'table{border-collapse:collapse;width:100%;margin-top:10px;}'
    + 'th{background:#1f3a5f;color:#fff;text-align:left;padding:6px 8px;font-size:9pt;}'
    + 'td{border:1px solid #e5e7eb;padding:5px 8px;font-size:9pt;}'
    + 'tr:nth-child(even) td{background:#f9fafb;}'
    + '.summary{margin-top:10px;}'
    + '.summary td{border:1px solid #e5e7eb;background:#f9fafb;padding:8px;}'
    + '.summary .k{color:#6b7280;font-size:8pt;text-transform:uppercase;}'
    + '.summary .v{font-size:13pt;font-weight:bold;}'
    + '.sign{margin-top:26px;font-size:10pt;}'
    + '.sign div{margin:6px 0;}'
    + '.footer{margin-top:24px;text-align:center;color:#9ca3af;font-size:9pt;font-style:italic;}'
    + '</style></head><body>'
    + '<div class="hdr">'
    + '<div class="l">'
    + (logo ? '<img src="' + logo + '"/>' : '')
    + '<div class="co">' + esc(B.company) + '</div>'
    + '<div class="brand">' + esc(B.name) + '</div>'
    + '<div class="tag">' + esc(B.taglines[0]) + '</div>'
    + '<div class="tag">' + esc(B.taglines[1]) + '</div>'
    + '</div>'
    + '<div class="r">' + esc(B.email) + '<br/>' + esc(B.website) + '</div>'
    + '</div>'
    + '<div class="section-h">REPORT DETAILS</div>'
    + '<div class="rule-orange"></div>'
    + '<div class="rname">' + esc(report.title || 'Report') + '</div>'
    + detailRow('Report Period', period)
    + (report.scopeLabel ? detailRow('Scope', report.scopeLabel) : '')
    + detailRow('Prepared By', preparedBy)
    + detailRow('Date Generated', dateGenerated)
    + '<div class="rule-green"></div>'
    + '<div class="title">' + centeredTitle + '</div>'
    + summaryHtml
    + '<table>' + head + body + '</table>'
    + '<div class="sign">'
    + '<div><b>Prepared By:</b> ' + esc(preparedBy) + '</div>'
    + '<div><b>Signature:</b> _______________________________________</div>'
    + '<div><b>Date:</b> ' + esc(dateGenerated) + '</div>'
    + '</div>'
    + '<div class="footer">' + esc(B.footer) + '</div>'
    + '</body></html>';
}

// ── PDF (branded — shared DocAudit AI layout) ───────────────────────────────
function reportPeriodLabel(report) {
  const end = new Date(report.generatedAt || Date.now());
  if (report.periodDays) {
    const start = new Date(end.getTime() - report.periodDays * 86400000);
    return layout.fmtDate(start) + ' - ' + layout.fmtDate(end);
  }
  return layout.fmtDate(end);
}

function writePdf(report, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape', bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="' + safeFileBase(report) + '.pdf"');
  doc.pipe(res);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const usable = right - left;
  const C = layout.COLORS;

  // 1. Header
  let y = layout.drawHeader(doc);

  // 2. Report details
  const detailPairs = [
    ['Report Period', reportPeriodLabel(report)],
  ];
  if (report.scopeLabel) detailPairs.push(['Scope', report.scopeLabel]);
  detailPairs.push(['Records', String((report.rows || []).length)]);
  detailPairs.push(['Prepared By', report.preparedBy || 'System']);
  detailPairs.push(['Date Generated', layout.fmtDate(report.generatedAt || Date.now())]);
  y = layout.drawReportDetails(doc, y, detailPairs, report.title);

  // 3. Centered title
  y = layout.drawCenteredTitle(doc, y, (report.title || 'Report') + ' – ' + layout.monthYear(report.generatedAt));

  // Summary cards
  const entries = summaryEntries(report);
  if (entries.length) {
    const perRow = 4;
    const gap = 10;
    const cardW = (usable - gap * (perRow - 1)) / perRow;
    entries.forEach(function (e, i) {
      const col = i % perRow;
      if (col === 0 && i > 0) y += 46;
      const x = left + col * (cardW + gap);
      if (col === 0 && y + 44 > doc.page.height - 70) { doc.addPage(); y = 60; }
      doc.roundedRect(x, y, cardW, 40, 4).fillColor(C.zebra).fill();
      doc.fillColor(C.muted).fontSize(7).font('Helvetica-Bold')
        .text(String(e[0]).toUpperCase(), x + 8, y + 7, { width: cardW - 16 });
      doc.fillColor(C.text).fontSize(13).font('Helvetica-Bold')
        .text(formatCell(e[1]), x + 8, y + 18, { width: cardW - 16, ellipsis: true, lineBreak: false });
    });
    y += 56;
  }

  // 4. Table
  const cols = report.columns || [];
  const colW = cols.length ? usable / cols.length : usable;

  const drawTableHeader = function () {
    doc.rect(left, y, usable, 20).fillColor(C.navy).fill();
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    cols.forEach(function (c, i) {
      doc.text(String(c.label), left + i * colW + 5, y + 6, { width: colW - 10, ellipsis: true, lineBreak: false });
    });
    y += 20;
  };

  if (cols.length) {
    if (y + 40 > doc.page.height - 70) { doc.addPage(); y = 60; }
    drawTableHeader();

    const rows = report.rows || [];
    rows.forEach(function (row, idx) {
      const cells = cols.map(function (c) { return formatCell(row[c.key]); });
      let rowH = 14;
      doc.font('Helvetica').fontSize(7.5);
      cells.forEach(function (val) {
        const h = doc.heightOfString(val, { width: colW - 10 }) + 6;
        if (h > rowH) rowH = h;
      });
      rowH = Math.min(rowH, 60);

      if (y + rowH > doc.page.height - 60) {
        doc.addPage();
        y = 60;
        drawTableHeader();
      }

      if (idx % 2 === 1) { doc.rect(left, y, usable, rowH).fillColor(C.zebra).fill(); }
      doc.font('Helvetica').fontSize(7.5);
      cells.forEach(function (val, i) {
        const tint = layout.cellColor(cols[i].label, val);
        doc.font(tint ? 'Helvetica-Bold' : 'Helvetica').fillColor(tint || C.body);
        doc.text(val, left + i * colW + 5, y + 4, { width: colW - 10, height: rowH - 6, ellipsis: true });
      });
      doc.moveTo(left, y + rowH).lineTo(right, y + rowH).lineWidth(0.3).strokeColor(C.line).stroke();
      y += rowH;
    });

    if (!rows.length) {
      doc.fillColor(C.faint).fontSize(9).font('Helvetica-Oblique')
        .text('No records in this period.', left, y + 8);
      y += 24;
    }
  }

  // 5. Signature block + 6. Footer
  layout.drawSignatureBlock(doc, y, report.preparedBy || 'System');
  layout.drawFooter(doc);

  doc.end();
}

function sendReport(report, format, res) {
  const fmt = String(format || 'pdf').toLowerCase();
  const base = safeFileBase(report);

  if (fmt === 'pdf') return writePdf(report, res);

  if (fmt === 'excel' || fmt === 'xlsx') {
    const buf = toXlsxBuffer(report);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="' + base + '.xlsx"');
    return res.send(buf);
  }

  if (fmt === 'word' || fmt === 'doc') {
    res.setHeader('Content-Type', 'application/msword');
    res.setHeader('Content-Disposition', 'attachment; filename="' + base + '.doc"');
    return res.send(toWordHtml(report));
  }

  if (fmt === 'txt') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + base + '.txt"');
    return res.send(toTxt(report));
  }

  // default CSV
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="' + base + '.csv"');
  return res.send(toCsv(report));
}

module.exports = {
  sendReport: sendReport,
  toCsv: toCsv,
  toTxt: toTxt,
  toXlsxBuffer: toXlsxBuffer,
  toWordHtml: toWordHtml,
  writePdf: writePdf,
};
