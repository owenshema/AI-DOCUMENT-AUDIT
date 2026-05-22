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

async function auditDocument(documentText, policyRules = []) {
  // Always run the real rule-based engine first
  const ruleResult = runAudit(documentText, policyRules);

  // Try to enhance summary with OpenAI if available
  if (OPENAI_API_KEY && OPENAI_API_KEY !== 'your-openai-key') {
    const SYSTEM = `You are a document auditor for a logistics and supply chain company (SIFCO AE).
Review the document and return ONLY valid JSON with:
- compliance_score (integer 0-100)
- missing_fields (array of strings)
- inconsistencies (array of strings)
- violations (array of strings)
- recommendations (array of strings)
- sentiment (positive|neutral|negative)
- risk_level (low|medium|high)
- summary (2-3 sentences)
Be specific about logistics/supply chain issues: BOL numbers, carrier compliance, weight discrepancies, payment terms, accessorial charges.`;

    const USER = `Audit this document:\n\n${documentText.slice(0, 3000)}\n\nPolicy rules:\n${
      policyRules.length > 0 ? policyRules.join('\n') : ruleResult.fraud_flags.map(f => f.message).join('\n')
    }`;

    const aiText = await callOpenAI(SYSTEM, USER, 1000);
    const aiResult = extractJSON(aiText);

    if (aiResult) {
      // Merge: take the stricter of the two scores, combine findings
      const mergedScore = Math.min(ruleResult.compliance_score, aiResult.compliance_score ?? 100);
      const mergedMissing = [...new Set([...(ruleResult.missing_fields || []), ...(aiResult.missing_fields || [])])];
      const mergedViolations = [...new Set([...(ruleResult.violations || []), ...(aiResult.violations || [])])];
      const mergedInconsistencies = [...new Set([...(ruleResult.inconsistencies || []), ...(aiResult.inconsistencies || [])])];
      const mergedRecs = [...new Set([...(ruleResult.recommendations || []), ...(aiResult.recommendations || [])])];

      return {
        ...ruleResult,
        compliance_score:  mergedScore,
        missing_fields:    mergedMissing,
        violations:        mergedViolations,
        inconsistencies:   mergedInconsistencies,
        recommendations:   mergedRecs,
        summary:           aiResult.summary || ruleResult.summary,
        sentiment:         aiResult.sentiment || ruleResult.sentiment,
        risk_level:        aiResult.risk_level === 'high' || ruleResult.risk_level === 'high' ? 'high'
                         : aiResult.risk_level === 'medium' || ruleResult.risk_level === 'medium' ? 'medium' : 'low',
        engine:            'openai+rules',
      };
    }
  }

  return ruleResult;
}

// ── Module 4: Audit Report Writer ─────────────────────────────────────────────

async function generateAuditReport(auditJson) {
  const SYSTEM = `You are a senior audit report writer for SIFCO AE, a logistics and supply chain company.
Write a formal, professional audit report based on the REAL audit data provided for the period.
Structure:
1. EXECUTIVE SUMMARY (2-3 sentences covering the period, documents processed, and overall compliance)
2. DOCUMENT ACTIVITY (actual counts: uploaded, analysed, checks run)
3. COMPLIANCE SCORE — ${auditJson.compliance_score ?? 0}/100 with explanation
4. RISK ASSESSMENT — breakdown of high/medium/low risk documents
5. KEY FINDINGS (bullet points with specific numbers from the data)
6. RECOMMENDATIONS (numbered, actionable steps based on actual findings)
7. CONCLUSION
Use formal language. Reference the actual numbers from the data.`;

  const USER = `Audit data:\n${JSON.stringify(auditJson, null, 2)}`;
  const aiText = await callOpenAI(SYSTEM, USER, 1400);
  if (aiText) return { report_text: aiText, engine: 'openai' };

  // ── Rule-based report using real period data ──────────────────────────────
  const score     = auditJson.compliance_score ?? 0;
  const start     = auditJson.period?.start || '—';
  const end       = auditJson.period?.end   || '—';
  const totalDocs = auditJson.total_documents ?? 0;
  const totalAI   = auditJson.total_analyses  ?? 0;
  const totalChk  = auditJson.total_checks    ?? 0;
  const passRate  = auditJson.pass_rate       ?? 0;
  const highRisk  = auditJson.risk_distribution?.high   ?? 0;
  const medRisk   = auditJson.risk_distribution?.medium ?? 0;
  const lowRisk   = auditJson.risk_distribution?.low    ?? 0;

  const complianceLabel = score >= 80 ? 'COMPLIANT' : score >= 60 ? 'PARTIALLY COMPLIANT' : 'NON-COMPLIANT';
  const riskSummary = highRisk > 0
    ? `${highRisk} high-risk document(s) require immediate escalation.`
    : medRisk > 0 ? `${medRisk} medium-risk document(s) require review.`
    : 'No high-risk documents identified.';

  const deptText = auditJson.departments && Object.keys(auditJson.departments).length > 0
    ? Object.entries(auditJson.departments).map(([d, n]) => `  • ${d}: ${n} document(s)`).join('\n')
    : '  • No department data available';

  const catText = auditJson.categories && Object.keys(auditJson.categories).length > 0
    ? Object.entries(auditJson.categories).map(([c, n]) => `  • ${c}: ${n}`).join('\n')
    : '  • No category data available';

  // Per-document table with scores
  const docListText = auditJson.document_list?.length > 0
    ? auditJson.document_list.slice(0, 15).map((d, i) => {
        const score = d.compliance_score != null ? `${d.compliance_score}/100` : 'Not analyzed';
        const risk  = d.risk_level ? d.risk_level.toUpperCase() : '—';
        const viol  = d.violations_count > 0 ? `${d.violations_count} violation(s)` : 'No violations';
        const miss  = d.missing_fields?.length > 0 ? `Missing: ${d.missing_fields.join(', ')}` : '';
        return `  ${i + 1}. ${d.title}\n     Category: ${d.category} | Dept: ${d.department} | Status: ${d.status}\n     Score: ${score} | Risk: ${risk} | ${viol}${miss ? '\n     ' + miss : ''}`;
      }).join('\n\n')
    : '  No documents found in this period.';

  const violationsText = auditJson.violations?.length > 0
    ? auditJson.violations.slice(0, 12).map(v => `  • ${v}`).join('\n')
    : '  • No violations detected in this period';

  const missingText = auditJson.missing_fields?.length > 0
    ? auditJson.missing_fields.slice(0, 8).map(f => `  • ${f}`).join('\n')
    : '  • All required fields present';

  const recs = (auditJson.recommendations || []).length > 0
    ? auditJson.recommendations.map((r, i) => `  ${i + 1}. ${r}`).join('\n')
    : '  1. Continue monitoring document compliance\n  2. Maintain current audit schedule';

  const conclusionText = score >= 80
    ? `The audit period from ${start} to ${end} demonstrates satisfactory compliance with SIFCO AE standards. All ${totalDocs} document(s) processed achieved an average compliance score of ${score}/100. Continue current document governance practices and maintain the audit schedule.`
    : score >= 60
    ? `The audit period from ${start} to ${end} shows partial compliance. Of ${totalDocs} document(s) reviewed, the average compliance score is ${score}/100. ${highRisk} high-risk and ${medRisk} medium-risk items require remediation. Implement the recommendations above before the next audit cycle.`
    : `The audit period from ${start} to ${end} reveals significant compliance gaps. The average compliance score of ${score}/100 is below the acceptable threshold of 80. Immediate action is required to address ${auditJson.violations?.length ?? 0} identified violation(s) and ${auditJson.missing_fields?.length ?? 0} missing field issue(s). A follow-up audit is recommended within 30 days.`;

  // Activity log section
  const activityText = auditJson.activity_log?.length > 0
    ? auditJson.activity_log.slice(0, 20).map((a, i) => `  ${i + 1}. [${a.time || '—'}] ${a.user}: ${a.action}`).join('\n')
    : '  No activity recorded in this period.';

  const report_text = `AI DOCUMENT AUDIT REPORT — SIFCO AE
${'='.repeat(65)}
Report Title:    ${auditJson.title}
Report Type:     ${(auditJson.reportType || '').replace(/_/g, ' ').toUpperCase()}
Audit Period:    ${start} to ${end}
Generated By:    ${auditJson.generated_by || 'System'} (${auditJson.generated_by_role || ''})
Generated:       ${new Date().toLocaleString()}
Audit Engine:    ${auditJson.engine || 'rule-based-v4'} | 15 policy rules checked
${'='.repeat(65)}

1. EXECUTIVE SUMMARY
─────────────────────────────────────────────────────────────────
This ${(auditJson.reportType || 'compliance').replace(/_/g, ' ')} audit covers the period from ${start} to ${end}.
During this period, ${totalDocs} document(s) were uploaded to the SIFCO AE DocAudit system,
${totalAI} AI compliance analysis run(s) were performed, and ${totalChk} compliance check(s) were
conducted. The overall average compliance score for this period is ${score}/100 (${complianceLabel}).
${riskSummary}

2. DOCUMENT ACTIVITY
─────────────────────────────────────────────────────────────────
Total Documents Uploaded:    ${totalDocs}
AI Analyses Performed:       ${totalAI}
Compliance Checks Run:       ${totalChk}
Checks Passed:               ${auditJson.passed_checks ?? 0}
Checks Failed:               ${auditJson.failed_checks ?? 0}
Pass Rate:                   ${passRate}%
Average Compliance Score:    ${score}/100

Documents by Department:
${deptText}

Documents by Category:
${catText}

3. COMPLIANCE SCORE
─────────────────────────────────────────────────────────────────
Overall Score: ${score}/100 — ${complianceLabel}

${score >= 80
  ? 'Documents in this period meet SIFCO AE compliance standards. The organization demonstrates strong document governance practices.'
  : score >= 60
  ? 'Some documents require remediation before full compliance is achieved. Key gaps include missing required fields and authorization issues.'
  : 'Significant compliance gaps identified. The score falls below the minimum acceptable threshold of 80/100. Immediate corrective action is required.'}

Score Distribution:
${auditJson.score_breakdown?.length > 0
  ? `  Highest score: ${Math.max(...auditJson.score_breakdown)}/100\n  Lowest score:  ${Math.min(...auditJson.score_breakdown)}/100\n  Documents analyzed: ${auditJson.score_breakdown.length}`
  : '  No individual document scores available for this period.'}

4. RISK ASSESSMENT
─────────────────────────────────────────────────────────────────
High Risk Documents:    ${highRisk}  ${highRisk > 0 ? '⚠️  REQUIRES IMMEDIATE ACTION' : '✓'}
Medium Risk Documents:  ${medRisk}  ${medRisk > 0 ? '— Requires review' : '✓'}
Low Risk Documents:     ${lowRisk}  ✓
Unanalyzed Documents:   ${totalDocs - totalAI > 0 ? totalDocs - totalAI : 0}

${highRisk > 0 ? `⚠️  ACTION REQUIRED: ${highRisk} high-risk document(s) must be escalated to the senior auditor for immediate review and remediation.` : ''}

5. DOCUMENT-BY-DOCUMENT FINDINGS
─────────────────────────────────────────────────────────────────
${docListText}

6. KEY VIOLATIONS & COMPLIANCE ISSUES
─────────────────────────────────────────────────────────────────
${violationsText}

Missing Required Fields Detected:
${missingText}

7. RECOMMENDATIONS
─────────────────────────────────────────────────────────────────
${recs}

8. CONCLUSION
─────────────────────────────────────────────────────────────────
${conclusionText}

9. ACTIVITY LOG — WHO DID WHAT
─────────────────────────────────────────────────────────────────
${activityText}

${'─'.repeat(65)}
AI Document Audit System — SIFCO AE
Audit Engine: ${auditJson.engine || 'rule-based-v4'} | 15 policy rules checked
Report generated: ${new Date().toLocaleString()}
CONFIDENTIAL — For internal use only`;

  return { report_text, engine: 'rule-based-v4' };
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
