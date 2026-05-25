/**
 * AI Service — Real Audit Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Primary:  Rule-based audit engine (auditRules.js) — trained on real
 *           logistics/supply chain audit standards and Kaggle dataset fields
 * Enhanced: OpenAI API for natural-language summary & report writing
 *           (optional — works fully without API key)
 */

const https = require('https');
const { runAudit, detectDocumentType } = require('./auditRules');
const logisticsDataset = require('./logisticsDatasetService');
const reportBuilder = require('./reportBuilderService');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL   = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

// ── OpenAI call (optional enhancement) ───────────────────────────────────────

async function callOpenAI(systemPrompt, userContent, maxTokens = 800) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-key') return null;

  const body = JSON.stringify({
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  },
    ],
    max_tokens: maxTokens,
    temperature: 0.2,
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.choices?.[0]?.message?.content?.trim() || null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

function extractJSON(text) {
  if (!text) return null;
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  try { return JSON.parse(match ? match[1] : text); } catch { return null; }
}

// ── Module 2: Document Parser ─────────────────────────────────────────────────

async function parseDocument(documentText) {
  const text  = documentText || '';
  const lower = text.toLowerCase();

  // Rule-based extraction first
  const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/);
  const typeKeywords = { invoice: 'invoice', report: 'report', policy: 'policy', contract: 'contract', memo: 'memo' };
  const docType = Object.entries(typeKeywords).find(([k]) => lower.includes(k))?.[0] || 'other';

  const authorMatch = text.match(/(?:prepared by|author|submitted by|from)[:\s]+([A-Za-z\s]{3,40})/i);
  const deptMatch   = text.match(/(?:department|dept|division)[:\s]+([A-Za-z\s&]{3,40})/i);

  const ruleResult = {
    title:         text.split('\n').find(l => l.trim().length > 5)?.slice(0, 80) || null,
    date:          dateMatch?.[0] || null,
    author:        authorMatch?.[1]?.trim() || null,
    department:    deptMatch?.[1]?.trim() || null,
    document_type: docType,
    summary:       text.slice(0, 300).replace(/\n+/g, ' ') + (text.length > 300 ? '...' : ''),
    engine:        'rule-based-v2',
  };

  // Try OpenAI enhancement
  const SYSTEM = `You are a document parser for a logistics and supply chain audit system.
Extract metadata from the document and return ONLY valid JSON with:
- title (string or null)
- date (YYYY-MM-DD or null)
- author (string or null)
- department (string or null)
- document_type (invoice|report|policy|contract|memo|shipment|other)
- summary (max 3 sentences)
Do not guess. Return null for missing fields.`;

  const aiText = await callOpenAI(SYSTEM, `Document:\n\n${text.slice(0, 3000)}`);
  const aiResult = extractJSON(aiText);
  if (aiResult) return { ...aiResult, engine: 'openai' };

  return ruleResult;
}

// ── Module 3: Core Audit Engine ───────────────────────────────────────────────

async function auditDocument(documentText, policyRules = [], context = {}) {
  // Paper-audit training only — no Kaggle dataset, no legacy policy rules
  const ruleResult = runAudit(documentText, context);

  return ruleResult;
}

// ── Module 4: Audit Report Writer ─────────────────────────────────────────────

async function generateAuditReport(auditJson, options = {}) {
  const viewerRole = options.viewerRole || auditJson.generated_by_role || 'auditor';
  const ownerScoped = options.ownerScoped || false;

  const structured = reportBuilder.buildStructuredReport(auditJson, {
    viewerRole,
    ownerScoped,
  });

  const SYSTEM = `You are a senior audit report writer for Super International Freight / SIFCO (Kigali logistics).
Write a concise executive narrative (max 400 words) for the structured audit below.
Tone: professional, clear, suitable for management. Reference real numbers only.
Do not invent data. Mention organization document validation and AI/forgery thresholds when relevant.`;

  const USER = `Structured audit JSON:\n${JSON.stringify({
    meta: structured.meta,
    compliance: structured.compliance,
    organizationValidation: structured.organizationValidation,
    riskSummary: structured.riskSummary,
    sectionTitles: structured.sections.map(s => s.title),
    recommendations: structured.recommendations,
  }, null, 2)}`;

  const aiNarrative = await callOpenAI(SYSTEM, USER, 600);
  if (aiNarrative) {
    structured.sections = structured.sections.map(s =>
      s.id === 'executive' ? { ...s, paragraphs: [aiNarrative.trim()] } : s
    );
    return {
      report_text: reportBuilder.formatReportAsText(structured),
      structured,
      engine: 'openai+structured',
    };
  }

  return {
    report_text: reportBuilder.formatReportAsText(structured),
    structured,
    engine: 'structured-v2',
  };
}


// ── Module 5: Workflow Assistant ──────────────────────────────────────────────

async function suggestWorkflowActions(docTitle, issuesList) {
  const SYSTEM = `You are a workflow assistant for a logistics and supply chain audit system.
Return ONLY valid JSON with:
- action_plan (array of objects: { issue, assigned_to, priority, steps })
assigned_to: Admin | Auditor | Department Head | Finance | Procurement
priority: High | Medium | Low`;

  const USER = `Document: "${docTitle}"\nIssues:\n${issuesList.map((i, n) => `${n + 1}. ${i}`).join('\n')}`;
  const aiText = await callOpenAI(SYSTEM, USER, 800);
  const aiResult = extractJSON(aiText);
  if (aiResult) return { ...aiResult, engine: 'openai' };

  // Rule-based fallback
  const action_plan = issuesList.map(issue => {
    const isHigh = /missing|violation|fraud|pii|duplicate|weight|signature/i.test(issue);
    const isMed  = /inconsisten|amount|date|accessorial|currency/i.test(issue);
    const assignTo = isHigh ? 'Admin' : isMed ? 'Auditor' : 'Department Head';
    return {
      issue,
      assigned_to: assignTo,
      priority:    isHigh ? 'High' : isMed ? 'Medium' : 'Low',
      steps: [
        `Review: "${issue}"`,
        'Update document to resolve the finding',
        'Resubmit for compliance check',
      ],
    };
  });

  return { action_plan, engine: 'rule-based-v2' };
}

// ── Module 1: Access Control ──────────────────────────────────────────────────

function getPermittedActions(role) {
  const permissions = {
    administrator: {
      documents:  ['read', 'write', 'delete', 'share', 'classify'],
      analysis:   ['run', 'view', 'export', 'bulk'],
      compliance: ['read', 'write', 'check', 'approve'],
      audit:      ['generate', 'export', 'archive', 'distribute'],
      users:      ['read', 'write', 'activate', 'deactivate', 'assign_role'],
      workflow:   ['create', 'assign', 'approve', 'reject', 'escalate'],
    },
    auditor: {
      documents:  ['read', 'flag', 'comment'],
      analysis:   ['run', 'view', 'export'],
      compliance: ['read', 'check'],
      audit:      ['generate', 'export'],
      users:      ['read'],
      workflow:   ['view', 'approve', 'reject', 'escalate'],
    },
    document_manager: {
      documents:  ['read', 'write', 'share'],
      analysis:   ['run', 'view'],
      compliance: ['read', 'check'],
      audit:      ['view'],
      workflow:   ['create', 'assign', 'view'],
    },
    viewer: {
      documents:  ['read'],
      analysis:   ['view'],
      compliance: ['read'],
      audit:      ['view'],
      workflow:   ['view'],
    },
  };
  return permissions[role] || permissions.viewer;
}

module.exports = {
  parseDocument,
  auditDocument,
  generateAuditReport,
  suggestWorkflowActions,
  getPermittedActions,
  ruleBasedAnalysis: (text) => runAudit(text),
};
