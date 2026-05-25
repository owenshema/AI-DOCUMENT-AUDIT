'use strict';
/**
 * Rebuild SIFCO training text + corpus from reference PDFs in data/training/reference/
 * Usage: node scripts/build-sifco-training.js
 */
var fs = require('fs');
var path = require('path');
var { PDFParse } = require('pdf-parse');
var ml = require('../services/sifcoMlTrainingService');

var TRAINING_DIR = path.join(__dirname, '..', 'data', 'training');
var REF_DIR = path.join(TRAINING_DIR, 'reference');

var MAP = [
  { pdf: '01-packing-list-unique-hybrid.pdf', txt: '01-packing-list-unique-hybrid.txt' },
  { pdf: '02-shipping-agreement-john.pdf', txt: '02-shipping-agreement-john.txt' },
  { pdf: '03-hbl-unique-hybrid.pdf', txt: '03-hbl-unique-hybrid.txt' },
  { pdf: '04-freight-invoice-unique-hybrid.pdf', txt: '04-freight-invoice-unique-hybrid.txt' },
  { pdf: '05-trucking-invoice-ecmu5567458.pdf', txt: '05-trucking-invoice-ecmu5567458.txt' },
  { pdf: '06-sea-freight-john.pdf', txt: '06-sea-freight-john.txt' },
];

(async function () {
  for (var i = 0; i < MAP.length; i++) {
    var m = MAP[i];
    var pdfPath = path.join(REF_DIR, m.pdf);
    if (!fs.existsSync(pdfPath)) {
      console.warn('Skip (missing):', m.pdf);
      continue;
    }
    var parser = new PDFParse({ data: fs.readFileSync(pdfPath) });
    var result = await parser.getText();
    fs.writeFileSync(path.join(TRAINING_DIR, m.txt), (result.text || '').trim(), 'utf8');
    console.log('OK', m.txt, (result.text || '').length, 'chars');
  }
  var corpus = ml.rebuildTrainingFromDisk();
  console.log('Corpus rebuilt:', corpus.referenceCount, 'references, version', corpus.modelVersion);
})();
