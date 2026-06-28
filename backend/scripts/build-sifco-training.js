'use strict';
/**
 * Rebuild SIFCO training text + corpus from reference PDFs and SIFCO_Audit_Report.xlsx
 * Usage: node scripts/build-sifco-training.js
 */
var fs = require('fs');
var path = require('path');
var { PDFParse } = require('pdf-parse');
var ml = require('../services/sifcoMlTrainingService');
var auditReportTraining = require('../services/auditReportTrainingService');
var notebookTraining = require('../services/notebookTrainingService');

var TRAINING_DIR = path.join(__dirname, '..', 'data', 'training');
var REF_DIR = path.join(TRAINING_DIR, 'reference');

var MAP = [
  { pdf: '01-packing-list-unique-hybrid.pdf', txt: '01-packing-list-unique-hybrid.txt' },
  { pdf: '02-shipping-agreement-john.pdf', txt: '02-shipping-agreement-john.txt' },
  { pdf: '03-hbl-unique-hybrid.pdf', txt: '03-hbl-unique-hybrid.txt' },
  { pdf: '04-freight-invoice-unique-hybrid.pdf', txt: '04-freight-invoice-unique-hybrid.txt' },
  { pdf: '05-trucking-invoice-ecmu5567458.pdf', txt: '05-trucking-invoice-ecmu5567458.txt' },
  { pdf: '06-sea-freight-john.pdf', txt: '06-sea-freight-john.txt' },
  { img: '07-shipping-instruction-sifco-3452.png', txt: '07-shipping-instruction-sifco-3452.txt' },
];

(async function () {
  for (var i = 0; i < MAP.length; i++) {
    var m = MAP[i];
    var sourceName = m.pdf || m.img;
    var sourcePath = path.join(REF_DIR, sourceName);
    var txtPath = path.join(TRAINING_DIR, m.txt);

    if (!fs.existsSync(sourcePath)) {
      if (fs.existsSync(txtPath)) {
        console.log('Keep existing', m.txt, '(source missing:', sourceName + ')');
      } else {
        console.warn('Skip (missing source and txt):', sourceName);
      }
      continue;
    }

    if (m.pdf) {
      var parser = new PDFParse({ data: fs.readFileSync(sourcePath) });
      var result = await parser.getText();
      fs.writeFileSync(txtPath, (result.text || '').trim(), 'utf8');
      console.log('OK', m.txt, (result.text || '').length, 'chars');
    } else if (m.img) {
      console.log('Image reference present:', sourceName, '— using curated', m.txt);
    }
  }

  console.log('\nIngesting SIFCO_Audit_Report.xlsx (if present)...');
  var excelResult = auditReportTraining.ingestAuditReportExcel();
  if (excelResult.ok) {
    console.log('Excel OK:', excelResult.rowCount, 'rows ->', excelResult.labelsPath);
    console.log('By document type:', JSON.stringify(excelResult.bySpec));
  } else if (excelResult.skipped) {
    console.warn('Excel skipped:', excelResult.message);
    console.warn('Place your file at:', auditReportTraining.DEFAULT_XLSX);
  } else {
    console.warn('Excel ingest failed:', excelResult.error || excelResult.message);
  }

  console.log('\nIngesting Untitled3.ipynb audit rules (reference PDF audit)...');
  var notebookResult = notebookTraining.runNotebookIngest();
  if (notebookResult.meta && notebookResult.meta.auditedCount) {
    console.log('Notebook OK:', notebookResult.meta.auditedCount, 'reference audits ->', notebookTraining.LABELS_PATH);
  } else {
    console.warn('Notebook ingest failed:', notebookResult.error || 'unknown error');
    console.warn('Install: py -3.12 -m pip install pdfplumber fuzzywuzzy python-Levenshtein pdf2image pytesseract');
  }

  var corpus = ml.rebuildTrainingFromDisk();
  console.log('Corpus rebuilt:', corpus.referenceCount, 'references, version', corpus.modelVersion);
})();
