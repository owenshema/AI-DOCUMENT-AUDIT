'use strict';
/**
 * SIFCO AE â€” Real Document Audit Engine v4
 * Performs deep compliance analysis on actual extracted document text.
 * Covers: invoices, shipments, contracts, policies, purchase orders, receipts.
 */

// â”€â”€â”€ Document type detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function detectDocumentType(text) {
  var t = text.toLowerCase();
  if (/\b(invoice|inv\s*#|bill\s+to|amount\s+due|remit\s+to)\b/.test(t)) return 'invoice';
  if (/\b(purchase\s+order|p\.?o\.?\s*#|order\s+number|ordered\s+by)\b/.test(t)) return 'purchase_order';
  if (/\b(bill\s+of\s+lading|bol\s*#|consignee|shipper|freight|carrier|waybill)\b/.test(t)) return 'shipment';
  if (/\b(contract|agreement|parties|whereas|hereinafter|effective\s+date|expiry\s+date)\b/.test(t)) return 'contract';
  if (/\b(policy|procedure|guideline|scope|purpose|applicability|compliance)\b/.test(t)) return 'policy';
  if (/\b(receipt|received\s+from|payment\s+received|cash\s+receipt)\b/.test(t)) return 'receipt';
  if (/\b(memorandum|memo|to:|from:|subject:|re:)\b/.test(t)) return 'memo';
  return 'general';
}

// â”€â”€â”€ Required fields per document type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var REQUIRED_FIELDS = {
  invoice: {
    invoice_number:  [/invoice\s*#?\s*:?\s*([A-Z0-9\-]{3,20})/i, /inv\s*#?\s*:?\s*([A-Z0-9\-]{3,20})/i],
    invoice_date:    [/invoice\s+date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i, /date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i],
    vendor_name:     [/vendor\s*:?\s*([A-Za-z\s&.,]{3,60})/i, /supplier\s*:?\s*([A-Za-z\s&.,]{3,60})/i, /from\s*:?\s*([A-Za-z\s&.,]{3,60})/i, /bill\s+from\s*:?\s*([A-Za-z\s&.,]{3,60})/i],
    total_amount:    [/total\s*:?\s*\$?\s*([\d,]+\.?\d*)/i, /amount\s+due\s*:?\s*\$?\s*([\d,]+\.?\d*)/i, /grand\s+total\s*:?\s*\$?\s*([\d,]+\.?\d*)/i, /balance\s+due\s*:?\s*\$?\s*([\d,]+\.?\d*)/i],
    payment_terms:   [/payment\s+terms?\s*:?\s*([^\n]{3,40})/i, /net\s+\d+/i, /due\s+on\s+receipt/i, /due\s+date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i],
    bill_to:         [/bill\s+to\s*:?\s*([A-Za-z\s&.,]{3,60})/i, /customer\s*:?\s*([A-Za-z\s&.,]{3,60})/i, /client\s*:?\s*([A-Za-z\s&.,]{3,60})/i],
    authorized_by:   [/approved\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i, /authorized\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i, /signed\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i],
  },
  purchase_order: {
    po_number:       [/p\.?o\.?\s*#?\s*:?\s*([A-Z0-9\-]{3,20})/i, /purchase\s+order\s*#?\s*:?\s*([A-Z0-9\-]{3,20})/i],
    order_date:      [/order\s+date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i, /date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i],
    vendor_name:     [/vendor\s*:?\s*([A-Za-z\s&.,]{3,60})/i, /supplier\s*:?\s*([A-Za-z\s&.,]{3,60})/i],
    total_amount:    [/total\s*:?\s*\$?\s*([\d,]+\.?\d*)/i, /order\s+total\s*:?\s*\$?\s*([\d,]+\.?\d*)/i],
    delivery_address:[/ship\s+to\s*:?\s*([^\n]{5,80})/i, /deliver\s+to\s*:?\s*([^\n]{5,80})/i, /delivery\s+address\s*:?\s*([^\n]{5,80})/i],
    authorized_by:   [/approved\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i, /authorized\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i],
  },
  shipment: {
    bol_number:      [/b\.?o\.?l\.?\s*#?\s*:?\s*([A-Z0-9\-]{3,20})/i, /waybill\s*#?\s*:?\s*([A-Z0-9\-]{3,20})/i, /tracking\s*#?\s*:?\s*([A-Z0-9\-]{3,20})/i],
    shipper:         [/shipper\s*:?\s*([A-Za-z\s&.,]{3,60})/i, /from\s*:?\s*([A-Za-z\s&.,]{3,60})/i, /origin\s*:?\s*([A-Za-z\s&.,]{3,60})/i],
    consignee:       [/consignee\s*:?\s*([A-Za-z\s&.,]{3,60})/i, /ship\s+to\s*:?\s*([A-Za-z\s&.,]{3,60})/i, /deliver\s+to\s*:?\s*([A-Za-z\s&.,]{3,60})/i],
    carrier:         [/carrier\s*:?\s*([A-Za-z\s&.,]{3,60})/i, /transported\s+by\s*:?\s*([A-Za-z\s&.,]{3,60})/i],
    weight:          [/(?:gross\s+)?weight\s*:?\s*([\d,]+\.?\d*)\s*(?:lbs?|kg|pounds?)/i, /total\s+weight\s*:?\s*([\d,]+\.?\d*)/i],
    pickup_date:     [/pickup\s+date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i, /ship\s+date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i],
    delivery_date:   [/delivery\s+date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i, /eta\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i],
    authorized_by:   [/authorized\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i, /approved\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i],
  },
  contract: {
    contract_number: [/contract\s*#?\s*:?\s*([A-Z0-9\-]{3,20})/i, /agreement\s*#?\s*:?\s*([A-Z0-9\-]{3,20})/i],
    parties:         [/between\s+([A-Za-z\s&.,]{3,80})\s+and\s+([A-Za-z\s&.,]{3,80})/i, /party\s+[ab]\s*:?\s*([A-Za-z\s&.,]{3,60})/i],
    effective_date:  [/effective\s+date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i, /commencement\s+date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i],
    expiry_date:     [/expiry\s+date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i, /termination\s+date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i, /expires?\s+on\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i],
    contract_value:  [/contract\s+value\s*:?\s*\$?\s*([\d,]+\.?\d*)/i, /total\s+value\s*:?\s*\$?\s*([\d,]+\.?\d*)/i, /consideration\s*:?\s*\$?\s*([\d,]+\.?\d*)/i],
    authorized_by:   [/signed\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i, /authorized\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i, /executed\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i],
  },
  policy: {
    policy_number:   [/policy\s*#?\s*:?\s*([A-Z0-9\-]{3,20})/i, /document\s*#?\s*:?\s*([A-Z0-9\-]{3,20})/i],
    title:           [/title\s*:?\s*([^\n]{5,80})/i, /subject\s*:?\s*([^\n]{5,80})/i],
    effective_date:  [/effective\s+date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i, /date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i],
    approved_by:     [/approved\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i, /authorized\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i],
    version:         [/version\s*:?\s*([\d.]+[a-z]?)/i, /rev\.?\s*:?\s*([\d.]+)/i, /revision\s*:?\s*([\d.]+)/i],
    department:      [/department\s*:?\s*([A-Za-z\s&]{3,40})/i, /division\s*:?\s*([A-Za-z\s&]{3,40})/i],
  },
  general: {
    date:            [/date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i],
    author:          [/prepared\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i, /author\s*:?\s*([A-Za-z\s.]{3,50})/i, /submitted\s+by\s*:?\s*([A-Za-z\s.]{3,50})/i],
    title:           [/title\s*:?\s*([^\n]{5,80})/i, /subject\s*:?\s*([^\n]{5,80})/i, /re\s*:?\s*([^\n]{5,80})/i],
    organization:    [/company\s*:?\s*([A-Za-z\s&.,]{3,60})/i, /organization\s*:?\s*([A-Za-z\s&.,]{3,60})/i],
  },
};

// â”€â”€â”€ Extract field values from text â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function extractFields(text, docType) {
  var fields = REQUIRED_FIELDS[docType] || REQUIRED_FIELDS.general;
  var extracted = {};
  var missing = [];
  Object.keys(fields).forEach(function(fieldName) {
    var patterns = fields[fieldName];
    var found = false;
    var value = null;
    for (var i = 0; i < patterns.length; i++) {
      var m = text.match(patterns[i]);
      if (m) {
        found = true;
        value = (m[1] || m[0] || '').trim().slice(0, 100);
        break;
      }
    }
    extracted[fieldName] = found ? value : null;
    if (!found) missing.push(fieldName.replace(/_/g, ' '));
  });
  return { extracted: extracted, missing: missing };
}

// â”€â”€â”€ Signature analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function analyzeSignature(text) {
  var r = { present: false, signerName: null, signerTitle: null, signingDate: null, signatureType: null, issues: [] };
  var namePatterns = [
    /(?:signed|approved|authorized|authorised)\s+by\s*:?\s*([A-Za-z][A-Za-z\s.]{2,49}?)(?:\n|,|$)/i,
    /signature\s*:?\s*([A-Za-z][A-Za-z\s.]{2,49}?)(?:\n|,|$)/i,
    /(?:manager|director|officer|ceo|cfo|president)\s*:?\s*([A-Za-z][A-Za-z\s.]{2,49}?)(?:\n|,|$)/i,
  ];
  for (var i = 0; i < namePatterns.length; i++) {
    var m = text.match(namePatterns[i]);
    if (m && m[1] && m[1].trim().length > 2 && !/n\/a|tbd|pending|missing|\[/i.test(m[1])) {
      r.present = true;
      r.signerName = m[1].trim().replace(/\s+/g, ' ');
      break;
    }
  }
  // Check for empty/placeholder signature
  if (/(?:signed|approved|authorized)\s+by\s*:?\s*(?:\[.*?\]|_{3,}|N\/A|TBD|pending|missing|___)/i.test(text)) {
    r.present = false;
    r.issues.push('Signature field exists but is blank or contains placeholder â€” document is unauthorized');
  }
  // Title
  var tm = text.match(/(?:title|position|designation|role)\s*:?\s*([A-Za-z][A-Za-z\s]{2,49}?)(?:\n|,|$)/i);
  if (tm && tm[1]) r.signerTitle = tm[1].trim();
  // Signing date
  var dm = text.match(/(?:date\s+of\s+signing|signed\s+on|signature\s+date)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  if (dm) r.signingDate = dm[1];
  // Type
  if (/digital\s+signature|e-?sign|electronically\s+signed|docusign|adobe\s+sign/i.test(text)) r.signatureType = 'digital';
  else if (/wet\s+signature|ink\s+signature|handwritten/i.test(text)) r.signatureType = 'wet ink';
  else if (r.present) r.signatureType = 'typed name';
  if (!r.present && r.issues.length === 0) r.issues.push('No authorized signature found â€” document cannot be processed without approval');
  return r;
}

// â”€â”€â”€ Stamp / seal analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function analyzeStamp(text) {
  var r = { present: false, stampType: null, issues: [] };
  var m = text.match(/\b(official\s+seal|company\s+seal|corporate\s+seal|notary\s+seal|stamp|embossed|certified\s+true\s+copy|notarized)\b/i);
  if (m) { r.present = true; r.stampType = m[1]; }
  if (/\b(contract|deed|certificate|notary|legal\s+document|affidavit)\b/i.test(text) && !r.present)
    r.issues.push('Legal/formal document detected â€” official stamp or notarization may be required');
  return r;
}

// â”€â”€â”€ Organization extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function extractOrganization(text) {
  var r = { present: false, names: [], primary: null, issues: [] };
  var found = {};
  // Explicit labels
  var ms1 = text.match(/(?:company|organization|organisation|firm|entity|corporation|vendor|supplier|client|customer)\s*:?\s*([A-Za-z][A-Za-z\s&.,()-]{2,59}?)(?:\n|,|Ltd|LLC|Inc|Corp|PLC|$)/gi) || [];
  ms1.forEach(function(m) { var n = m.replace(/^[^:]+[:\s]+/, '').replace(/[,\n].*$/, '').trim(); if (n && n.length > 3 && n.length < 80) found[n] = 1; });
  // Company suffixes
  var ms2 = text.match(/\b([A-Z][A-Za-z\s&.]{2,40}(?:Ltd\.?|LLC|Inc\.?|Corp\.?|PLC|Co\.|Company|Group|Holdings|International|Enterprises|Services|Solutions))\b/g) || [];
  ms2.forEach(function(n) { n = n.trim(); if (n && n.length > 4 && n.length < 80) found[n] = 1; });
  r.names = Object.keys(found).slice(0, 5);
  r.primary = r.names[0] || null;
  r.present = r.names.length > 0;
  if (!r.present) r.issues.push('No company or organization name identified in document');
  return r;
}

// â”€â”€â”€ Purpose / subject extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function extractPurpose(text) {
  var r = { present: false, purpose: null, subject: null, issues: [] };
  var m = text.match(/(?:purpose|objective|subject|re\s*:|regarding|reference|scope)\s*:?\s*([^\n.]{5,150})/i);
  if (m && m[1] && m[1].trim().length > 4) { r.present = true; r.purpose = m[1].trim().slice(0, 150); }
  var sm = text.match(/(?:subject|re)\s*:?\s*([^\n]{5,100})/i);
  if (sm) r.subject = sm[1].trim();
  if (!r.present) r.issues.push('Document purpose or subject line not clearly stated');
  return r;
}

// â”€â”€â”€ Request / approval analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function analyzeRequest(text) {
  var r = { hasRequest: false, requestType: null, requestedBy: null, approvalStatus: null };
  var m = text.match(/(?:request\s+for|requesting|application\s+for)\s*:?\s*([^\n.]{5,100})/i);
  if (m) { r.hasRequest = true; r.requestType = m[1].trim().slice(0, 100); }
  var bm = text.match(/(?:requested\s+by|submitted\s+by|applicant)\s*:?\s*([A-Za-z][A-Za-z\s.]{2,49}?)(?:\n|,|$)/i);
  if (bm) r.requestedBy = bm[1].trim();
  if (/\b(?:approved|accepted|granted|authorized|cleared)\b/i.test(text)) r.approvalStatus = 'approved';
  else if (/\b(?:rejected|denied|refused|declined|not\s+approved)\b/i.test(text)) r.approvalStatus = 'rejected';
  else if (/\b(?:pending|under\s+review|awaiting\s+approval|in\s+progress)\b/i.test(text)) r.approvalStatus = 'pending';
  return r;
}

// â”€â”€â”€ Date validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function validateDates(text) {
  var issues = [], dates = [], now = new Date();
  var rawDates = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g) || [];
  rawDates.forEach(function(raw) {
    try { var d = new Date(raw); if (!isNaN(d.getTime()) && d.getFullYear() > 1990) dates.push({ raw: raw, parsed: d }); } catch(e) {}
  });
  // Future dates (more than 5 years out = suspicious)
  var farFuture = new Date(); farFuture.setFullYear(farFuture.getFullYear() + 5);
  var suspicious = dates.filter(function(d) { return d.parsed > farFuture; });
  if (suspicious.length) issues.push('Suspicious far-future date(s): ' + suspicious.map(function(d) { return d.raw; }).join(', '));
  // Very old dates
  var tooOld = new Date(); tooOld.setFullYear(tooOld.getFullYear() - 10);
  var old = dates.filter(function(d) { return d.parsed < tooOld; });
  if (old.length) issues.push('Document contains dates older than 10 years (' + old.map(function(d) { return d.raw; }).join(', ') + ') â€” verify document is still valid');
  // Pickup vs delivery
  var pm = text.match(/(?:pickup|ship|dispatch)\s*date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  var dm = text.match(/(?:delivery|delivered|arrival|eta)\s*date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  if (pm && dm) { try { if (new Date(dm[1]) < new Date(pm[1])) issues.push('CRITICAL: Delivery date (' + dm[1] + ') is before pickup date (' + pm[1] + ') â€” dates are inconsistent'); } catch(e) {} }
  // Effective vs expiry
  var em = text.match(/effective\s+date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  var xm = text.match(/expiry\s+date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  if (em && xm) { try { if (new Date(xm[1]) < new Date(em[1])) issues.push('CRITICAL: Expiry date (' + xm[1] + ') is before effective date (' + em[1] + ')'); } catch(e) {} }
  // Expired document
  if (xm) { try { if (new Date(xm[1]) < now) issues.push('Document has expired on ' + xm[1] + ' â€” requires renewal before use'); } catch(e) {} }
  return { dates: dates.map(function(d) { return d.raw; }), issues: issues };
}

// â”€â”€â”€ Financial analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function analyzeFinancials(text) {
  var r = { amounts: [], totalAmount: null, currency: null, issues: [], taxPresent: false, discountPresent: false };
  // Extract all monetary amounts
  var ms = text.match(/(?:USD|AED|EUR|GBP|\$|â‚¬|Â£)?\s*([\d,]+\.?\d{0,2})\s*(?:USD|AED|EUR|GBP)?/g) || [];
  var amounts = [];
  ms.forEach(function(m) {
    var n = parseFloat(m.replace(/[^0-9.]/g, ''));
    if (!isNaN(n) && n > 0 && n < 999999999) amounts.push(n);
  });
  r.amounts = amounts.slice(0, 20);
  // Detect currency
  if (/\bAED\b|\bDHS?\b|\bDIRHAM/i.test(text)) r.currency = 'AED';
  else if (/\bUSD\b|\$/.test(text)) r.currency = 'USD';
  else if (/\bEUR\b|â‚¬/.test(text)) r.currency = 'EUR';
  else if (/\bGBP\b|Â£/.test(text)) r.currency = 'GBP';
  // Total
  var tm = text.match(/(?:total|grand\s+total|amount\s+due|balance\s+due)\s*:?\s*(?:USD|AED|\$|â‚¬|Â£)?\s*([\d,]+\.?\d{0,2})/i);
  if (tm) r.totalAmount = parseFloat(tm[1].replace(/,/g, ''));
  r.taxPresent = /\b(?:vat|tax|gst|hst|sales\s+tax)\b/i.test(text);
  r.discountPresent = /\b(?:discount|rebate|deduction)\b/i.test(text);
  // High-value check
  if (r.totalAmount && r.totalAmount > 50000) r.issues.push('High-value transaction: ' + (r.currency || '$') + r.totalAmount.toLocaleString() + ' â€” requires senior management approval');
  else if (r.totalAmount && r.totalAmount > 10000) r.issues.push('Transaction value ' + (r.currency || '$') + r.totalAmount.toLocaleString() + ' exceeds $10,000 â€” dual authorization required');
  return r;
}

// â”€â”€â”€ Forgery / authenticity detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function detectForgery(text) {
  var flags = [], score = 0;
  var checks = [
    { p: /\b(?:as an ai|as a language model|i cannot|i am an ai|chatgpt|generated by ai)\b/i, msg: 'AI-generated content indicators detected â€” document may be fabricated', sev: 'high' },
    { p: /(?:lorem ipsum|placeholder text|sample text|dummy text|test document|insert text here)/i, msg: 'Template placeholder text found â€” document is incomplete or fabricated', sev: 'high' },
    { p: /(?:insert\s+(?:name|date|signature|amount|address|company)\s+here)/i, msg: 'Unfilled template fields detected â€” document not properly completed', sev: 'high' },
    { p: /(?:\[your\s+(?:name|company|address|signature)\]|\[insert\s+\w+\])/i, msg: 'Template bracket placeholders not replaced', sev: 'high' },
    { p: /(?:forged|fabricated|falsified|counterfeit|fraudulent)/i, msg: 'Forgery-related terminology found in document text', sev: 'high' },
    { p: /(?:void|cancelled|revoked|superseded|null\s+and\s+void)/i, msg: 'Document marked as void, cancelled, or superseded', sev: 'medium' },
    { p: /(?:draft|not\s+for\s+distribution|confidential\s+draft|work\s+in\s+progress)/i, msg: 'Document is a draft â€” not finalized for official use', sev: 'low' },
    { p: /(?:copy\s+of\s+copy|photocopy|scanned\s+copy|duplicate\s+copy)/i, msg: 'Document appears to be a copy â€” original may be required', sev: 'low' },
  ];
  checks.forEach(function(c) {
    if (c.p.test(text)) {
      flags.push({ message: c.msg, severity: c.sev, category: 'authenticity' });
      score += c.sev === 'high' ? 25 : c.sev === 'medium' ? 12 : 5;
    }
  });
  // Repetition check
  var sentences = text.split(/[.!?]+/).filter(function(s) { return s.trim().length > 30; });
  var seen = {}, dupes = 0;
  sentences.forEach(function(s) { var k = s.trim().toLowerCase().slice(0, 60); if (seen[k]) dupes++; else seen[k] = 1; });
  if (sentences.length > 5 && dupes / sentences.length > 0.3) {
    flags.push({ message: 'Excessive text repetition (' + dupes + ' duplicate sentences) â€” possible copy-paste fabrication', severity: 'medium', category: 'authenticity' });
    score += 12;
  }
  // Inconsistent formatting (mixed date formats)
  var dateFormats = [];
  if (/\d{4}-\d{2}-\d{2}/.test(text)) dateFormats.push('ISO');
  if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(text)) dateFormats.push('MM/DD/YYYY');
  if (/\d{1,2}-\d{1,2}-\d{4}/.test(text)) dateFormats.push('MM-DD-YYYY');
  if (dateFormats.length > 1) {
    flags.push({ message: 'Mixed date formats detected (' + dateFormats.join(', ') + ') â€” inconsistent document formatting', severity: 'low', category: 'formatting' });
    score += 3;
  }
  return { flags: flags, forgeryScore: score, isSuspicious: score >= 25 };
}

// â”€â”€â”€ Fraud pattern detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var FRAUD_PATTERNS = [
  {
    id: 'duplicate_invoice_number',
    test: function(t) {
      var ms = t.match(/(?:invoice|inv)\s*#?\s*:?\s*([A-Z0-9\-]{3,20})/gi) || [];
      var nums = ms.map(function(m) { return m.replace(/^[^:0-9A-Z]+/i, '').toUpperCase(); });
      var seen = {}, dupes = false;
      nums.forEach(function(n) { if (seen[n]) dupes = true; else seen[n] = 1; });
      return dupes && nums.length > 1;
    },
    message: 'Duplicate invoice number detected â€” possible duplicate billing or fraud',
    severity: 'high',
  },
  {
    id: 'round_number_fraud',
    test: function(t) {
      var ms = t.match(/(?:USD|AED|\$|â‚¬|Â£)?\s*([\d,]+)\.00\b/g) || [];
      var rounds = ms.map(function(m) { return parseFloat(m.replace(/[^0-9]/g, '')); }).filter(function(x) { return x >= 1000 && x % 1000 === 0; });
      return rounds.length >= 3;
    },
    message: '3+ round-number amounts (multiples of 1000) â€” possible fabricated figures',
    severity: 'medium',
  },
  {
    id: 'weight_discrepancy',
    test: function(t) {
      var ms = t.match(/([\d,]+\.?\d*)\s*(?:lbs?|kg|pounds?|tonnes?)/gi) || [];
      var weights = ms.map(function(m) { return parseFloat(m.replace(/[^0-9.]/g, '')); }).filter(function(x) { return !isNaN(x) && x > 0; });
      if (weights.length < 2) return false;
      var mx = Math.max.apply(null, weights), mn = Math.min.apply(null, weights);
      return mn > 0 && (mx - mn) / mn > 0.15;
    },
    message: 'Weight values differ by more than 15% within the same document â€” possible reweigh fraud',
    severity: 'high',
  },
  {
    id: 'pii_exposure',
    test: function(t) { return /\b\d{3}-\d{2}-\d{4}\b|\bSSN\b|social\s+security\s+number|credit\s+card\s+number|\bcvv\b|\bpassport\s+number\b/i.test(t); },
    message: 'Personally Identifiable Information (PII) detected â€” document must be classified CONFIDENTIAL',
    severity: 'high',
  },
  {
    id: 'amount_mismatch',
    test: function(t) {
      var subtotal = t.match(/sub\s*total\s*:?\s*(?:USD|AED|\$)?\s*([\d,]+\.?\d*)/i);
      var total = t.match(/(?:grand\s+)?total\s*:?\s*(?:USD|AED|\$)?\s*([\d,]+\.?\d*)/i);
      if (!subtotal || !total) return false;
      var s = parseFloat(subtotal[1].replace(/,/g, '')), tot = parseFloat(total[1].replace(/,/g, ''));
      return !isNaN(s) && !isNaN(tot) && tot < s * 0.9;
    },
    message: 'Total amount is significantly less than subtotal â€” possible calculation error or manipulation',
    severity: 'high',
  },
  {
    id: 'missing_tax_on_large_invoice',
    test: function(t) {
      var total = t.match(/(?:grand\s+)?total\s*:?\s*(?:USD|AED|\$)?\s*([\d,]+\.?\d*)/i);
      if (!total) return false;
      var amt = parseFloat(total[1].replace(/,/g, ''));
      return amt > 5000 && !/\b(?:vat|tax|gst|tax\s+exempt|zero\s+rated)\b/i.test(t);
    },
    message: 'Invoice over $5,000 with no tax information â€” verify tax-exempt status or add applicable tax',
    severity: 'medium',
  },
];

// â”€â”€â”€ Policy compliance checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function checkPolicyViolations(text, docType, financials) {
  var v = [];
  // Invoice-specific
  if (docType === 'invoice') {
    if (!/\b(?:bol|b\.o\.l|bill\s+of\s+lading|shipment\s*#|tracking\s*#|po\s*#|purchase\s+order)\b/i.test(text))
      v.push('Invoice missing reference to BOL, PO, or shipment number (SIFCO Policy P1)');
    if (!/\b(?:net\s+\d+|due\s+on\s+receipt|payment\s+terms|due\s+date)\b/i.test(text))
      v.push('Payment terms not specified on invoice (SIFCO Policy P2)');
    if (financials.totalAmount && financials.totalAmount > 10000 && !financials.taxPresent)
      v.push('Invoice over $10,000 has no VAT/tax line â€” required for SIFCO AE compliance (Policy P5)');
  }
  // Shipment-specific
  if (docType === 'shipment') {
    if (!/\b(?:hazmat|dangerous\s+goods|un\s+number|imdg|iata)\b/i.test(text) === false)
      v.push('Hazardous materials declaration required for dangerous goods shipments (Policy S1)');
    if (!/\b(?:insurance|insured\s+value|cargo\s+insurance)\b/i.test(text))
      v.push('No cargo insurance information found â€” required for shipments over $1,000 (Policy S2)');
  }
  // All documents
  if (!/\b(?:department|dept|division|cost\s+center|business\s+unit)\b/i.test(text))
    v.push('No department or cost center identified â€” required for budget allocation (Policy P3)');
  if (financials.totalAmount && financials.totalAmount > 10000) {
    var authCount = (text.match(/(?:approved\s+by|authorized\s+by|signed\s+by)\s*:?\s*[A-Za-z]/gi) || []).length;
    if (authCount < 2) v.push('Transactions over $10,000 require dual authorization â€” only ' + authCount + ' signature(s) found (Policy P4)');
  }
  if (financials.totalAmount && financials.totalAmount > 100000) {
    if (!/\b(?:board\s+approval|executive\s+approval|ceo|cfo|managing\s+director)\b/i.test(text))
      v.push('Transactions over $100,000 require board/executive approval (Policy P6)');
  }
  return v;
}

// â”€â”€â”€ Sentiment analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function analyzeSentiment(text) {
  var neg = ['failed','error','missing','incorrect','invalid','rejected','denied','fraud','violation','breach','dispute','discrepancy','overdue','penalty','non-compliant','unauthorized'];
  var pos = ['approved','compliant','verified','confirmed','authorized','complete','valid','certified','cleared','accepted','satisfactory','in order'];
  var lower = text.toLowerCase();
  var n = neg.filter(function(w) { return lower.indexOf(w) !== -1; }).length;
  var p = pos.filter(function(w) { return lower.indexOf(w) !== -1; }).length;
  return n >= 4 ? 'negative' : n > p ? 'neutral' : 'positive';
}

// â”€â”€â”€ Main audit function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function runAudit(documentText) {
  var text = (documentText || '').slice(0, 15000); // cap at 15k chars
  var docType = detectDocumentType(text);
  var fieldResult = extractFields(text, docType);
  var sigA  = analyzeSignature(text);
  var stA   = analyzeStamp(text);
  var orgA  = extractOrganization(text);
  var purA  = extractPurpose(text);
  var reqA  = analyzeRequest(text);
  var forA  = detectForgery(text);
  var dateV = validateDates(text);
  var finA  = analyzeFinancials(text);
  var polV  = checkPolicyViolations(text, docType, finA);
  var sent  = analyzeSentiment(text);

  // Fraud pattern checks
  var fraudFlags = FRAUD_PATTERNS.filter(function(p) {
    try { return p.test(text); } catch(e) { return false; }
  });

  // Build violations list
  var allViolations = [].concat(
    polV,
    sigA.issues,
    stA.issues,
    orgA.issues,
    purA.issues,
    finA.issues,
    dateV.issues.filter(function(i) { return i.indexOf('CRITICAL') === -1; }),
    forA.flags.filter(function(f) { return f.severity === 'high'; }).map(function(f) { return f.message; }),
    fraudFlags.filter(function(f) { return f.id !== 'weight_discrepancy' && f.id !== 'round_number_fraud'; }).map(function(f) { return f.message; })
  );

  var inconsistencies = [].concat(
    fraudFlags.filter(function(f) { return f.id === 'weight_discrepancy' || f.id === 'amount_mismatch'; }).map(function(f) { return f.message; }),
    dateV.issues.filter(function(i) { return i.indexOf('CRITICAL') !== -1; }),
    forA.flags.filter(function(f) { return f.severity !== 'high'; }).map(function(f) { return f.message; })
  );

  // Risk level
  var highSeverityCount = allViolations.length + forA.flags.filter(function(f) { return f.severity === 'high'; }).length;
  var riskLevel = (highSeverityCount >= 5 || forA.isSuspicious || fraudFlags.some(function(f) { return f.severity === 'high'; })) ? 'high'
    : highSeverityCount >= 2 ? 'medium' : 'low';

  // Compliance score
  var deductions =
    fieldResult.missing.length * 7 +
    polV.length * 10 +
    inconsistencies.length * 8 +
    forA.forgeryScore +
    (!sigA.present ? 20 : 0) +
    (!orgA.present ? 5 : 0) +
    (!purA.present ? 3 : 0) +
    (fraudFlags.filter(function(f) { return f.severity === 'high'; }).length * 15);
  var compliance_score = Math.max(0, Math.min(100, 100 - deductions));

  // Recommendations
  var recommendations = [];
  if (!sigA.present) recommendations.push('Obtain authorized signature from approving manager before processing');
  if (forA.isSuspicious) recommendations.push('Escalate to senior auditor â€” document authenticity is in question');
  if (fieldResult.missing.length > 0) recommendations.push('Complete missing required fields: ' + fieldResult.missing.slice(0, 5).join(', '));
  if (!orgA.present) recommendations.push('Add full company/organization name to document header');
  if (finA.totalAmount && finA.totalAmount > 10000 && !finA.taxPresent) recommendations.push('Add VAT/tax information or attach tax-exempt certificate');
  if (polV.some(function(v) { return v.indexOf('dual authorization') !== -1; })) recommendations.push('Obtain second authorized signature for high-value transaction');
  if (dateV.issues.some(function(i) { return i.indexOf('expired') !== -1; })) recommendations.push('Document has expired â€” obtain updated version before processing');
  if (riskLevel === 'low' && recommendations.length === 0) recommendations.push('Document meets SIFCO AE compliance standards â€” proceed with standard approval workflow');

  // Summary
  var wc = text.split(/\s+/).filter(Boolean).length;
  var summaryParts = [
    'This ' + docType.replace(/_/g, ' ') + ' document (' + wc + ' words) was audited against SIFCO AE supply chain compliance standards.',
    sigA.present ? 'Authorized by: ' + sigA.signerName + (sigA.signerTitle ? ', ' + sigA.signerTitle : '') + (sigA.signingDate ? ' on ' + sigA.signingDate : '') + '.' : 'No valid authorization signature found.',
    orgA.present ? 'Organization: ' + orgA.primary + '.' : 'No organization name identified.',
    finA.totalAmount ? 'Transaction value: ' + (finA.currency || '') + finA.totalAmount.toLocaleString() + '.' : '',
    fieldResult.missing.length > 0 ? fieldResult.missing.length + ' required field(s) missing.' : 'All required fields present.',
    forA.isSuspicious ? 'AUTHENTICITY CONCERN: ' + forA.flags.length + ' indicator(s) of potential document manipulation detected.' : '',
    'Compliance score: ' + compliance_score + '/100. Risk: ' + riskLevel.toUpperCase() + '.',
  ];
  var summary = summaryParts.filter(Boolean).join(' ');

  return {
    document_type:        docType,
    compliance_score:     compliance_score,
    risk_level:           riskLevel,
    sentiment:            sent,
    summary:              summary,
    missing_fields:       fieldResult.missing,
    extracted_fields:     fieldResult.extracted,
    violations:           allViolations,
    inconsistencies:      inconsistencies,
    recommendations:      recommendations,
    fraud_flags:          fraudFlags.map(function(f) { return { id: f.id, message: f.message, severity: f.severity }; }),
    policy_rules_checked: 15,
    engine:               'rule-based-v4',
    document_inspection: {
      signature: {
        present:      sigA.present,
        signer_name:  sigA.signerName,
        signer_title: sigA.signerTitle,
        signing_date: sigA.signingDate,
        type:         sigA.signatureType,
        issues:       sigA.issues,
      },
      stamp: {
        present:    stA.present,
        stamp_type: stA.stampType,
        issues:     stA.issues,
      },
      organization: {
        present:   orgA.present,
        primary:   orgA.primary,
        all_names: orgA.names,
        issues:    orgA.issues,
      },
      purpose: {
        present: purA.present,
        purpose: purA.purpose,
        subject: purA.subject,
        issues:  purA.issues,
      },
      request: {
        has_request:     reqA.hasRequest,
        request_type:    reqA.requestType,
        requested_by:    reqA.requestedBy,
        approval_status: reqA.approvalStatus,
      },
      financials: {
        total_amount:      finA.totalAmount,
        currency:          finA.currency,
        tax_present:       finA.taxPresent,
        discount_present:  finA.discountPresent,
        issues:            finA.issues,
      },
      forgery_analysis: {
        is_suspicious: forA.isSuspicious,
        forgery_score: forA.forgeryScore,
        flags:         forA.flags,
      },
      dates: {
        all_dates: dateV.dates,
        issues:    dateV.issues,
      },
    },
  };
}

module.exports = { runAudit: runAudit, detectDocumentType: detectDocumentType };
