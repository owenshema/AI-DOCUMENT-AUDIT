'use strict';
/**
 * Quick check: PDF extraction + paper audit for shipping agreement.
 * Usage: node test-pdf-extract.js [path-to.pdf]
 */
var path = require('path');
var { extractTextFromFile } = require('./services/pdfTextService');
var { runPaperAudit } = require('./services/organizationTrainingService');

var defaultPdf = path.join(
  process.env.USERPROFILE || '',
  'AppData/Roaming/Cursor/User/workspaceStorage/54eb8f7600e3a9e9cbd3720c5135c210/pdfs/4206e0eb-7cea-4596-a428-9c8ceff64684/shippimg agreement J0HN.pdf'
);

var pdfPath = process.argv[2] || defaultPdf;

(async function () {
  var text = await extractTextFromFile(pdfPath, 'application/pdf');
  console.log('Extracted chars:', text ? text.length : 0);
  if (!text || text.length < 50) {
    console.error('FAIL: PDF text not extracted');
    process.exit(1);
  }
  var audit = runPaperAudit(text, { fileName: 'shippimg agreement J0HN.pdf' });
  console.log('organization_match:', audit.organization_match);
  console.log('compliance_score:', audit.compliance_score);
  if (!audit.organization_match) {
    console.error('FAIL: training shipping agreement rejected');
    process.exit(1);
  }
  console.log('OK: shipping agreement accepted');
})();
