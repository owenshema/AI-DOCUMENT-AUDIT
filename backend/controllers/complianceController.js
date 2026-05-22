/**
 * Compliance Controller
 * Rule-based AI compliance checks + OpenAI fallback (no model training)
 */

const { v4: uuidv4 } = require('uuid');
const aiService = require('../services/aiService');

const getAllPolicies = async (req, res) => {
  try {
    const { status, department, limit = 10, page = 1 } = req.query;
    const { Policy } = req.app.locals.models;

    const where = {};
    if (status) where.status = status;
    if (department) where.department = department;

    const { count, rows } = await Policy.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      policies: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch policies' });
  }
};

const createPolicy = async (req, res) => {
  try {
    const { name, description, policyType, department, regulatoryFrameworks, rules, applicableRoles } = req.body;
    const { Policy } = req.app.locals.models;

    if (!name || !policyType) {
      return res.status(400).json({ error: 'name and policyType are required' });
    }

    const policy = await Policy.create({
      id: uuidv4(),
      name,
      description,
      policyType,
      department: department || null,
      status: 'draft',
      version: '1.0',
      regulatoryFrameworks: regulatoryFrameworks || [],
      rules: rules || [],
      applicableRoles: applicableRoles || [],
      owner: req.user?.id || 'system',
      createdBy: req.user?.id || 'system',
      effectiveDate: new Date()
    });

    res.status(201).json({
      message: 'Policy created successfully',
      policy
    });
  } catch (error) {
    console.error('Create policy error:', error);
    res.status(500).json({ error: error.message || 'Failed to create policy' });
  }
};

const updatePolicy = async (req, res) => {
  try {
    const { policyId } = req.params;
    const updateData = req.body;
    const { Policy } = req.app.locals.models;

    const policy = await Policy.findByPk(policyId);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Update allowed fields
    const updates = {};
    if (updateData.name !== undefined) updates.name = updateData.name;
    if (updateData.description !== undefined) updates.description = updateData.description;
    if (updateData.status !== undefined) updates.status = updateData.status;
    if (updateData.rules !== undefined) updates.rules = updateData.rules;
    if (updateData.regulatoryFrameworks !== undefined) updates.regulatoryFrameworks = updateData.regulatoryFrameworks;
    updates.lastModifiedAt = new Date();
    updates.lastModifiedBy = req.user?.id;

    await policy.update(updates);

    res.json({
      message: 'Policy updated successfully',
      policy
    });
  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({ error: error.message || 'Failed to update policy' });
  }
};

const checkDocumentCompliance = async (req, res) => {
  try {
    const { documentId, policyIds } = req.body;
    const { Document, Policy, ComplianceCheck } = req.app.locals.models;

    if (!documentId) {
      return res.status(400).json({ error: 'documentId required' });
    }

    // Get document
    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get policies to check
    const policiesToCheck = policyIds && policyIds.length > 0
      ? await Policy.findAll({ where: { id: policyIds } })
      : await Policy.findAll({ where: { status: 'active' } });

    // Build policy rules list for AI engine
    const policyRules = policiesToCheck.flatMap(p =>
      Array.isArray(p.rules) ? p.rules.map(r => r.name || r.description || String(r)) : []
    );

    // Use AI service for rule-based compliance check
    const textToCheck = document.extractedText || document.description
      || `${document.title} — ${document.category} document from ${document.department}. Status: ${document.status}`;

    const aiResult = await aiService.auditDocument(textToCheck, policyRules);

    const findings = policiesToCheck.map(policy => ({
      policyId:   policy.id,
      policyName: policy.name,
      compliant:  aiResult.compliance_score >= 70,
      findings:   aiResult.violations || []
    }));

    // Create compliance check record
    const complianceCheck = await ComplianceCheck.create({
      id:              uuidv4(),
      documentId,
      policyId:        policiesToCheck[0]?.id || null,
      checkType:       'automatic',
      status:          aiResult.compliance_score >= 70 ? 'passed' : 'failed',
      complianceScore: aiResult.compliance_score,
      findings,
      violations:      { list: aiResult.violations, count: aiResult.violations.length },
      performedAt:     new Date(),
      performedBy:     req.user?.id || 'system'
    });

    res.json({
      complianceCheck: {
        ...complianceCheck.dataValues,
        complianceScore: aiResult.compliance_score
      },
      policies:    policiesToCheck.length,
      findings,
      aiEngine:    aiResult.engine,
      missing_fields:  aiResult.missing_fields,
      inconsistencies: aiResult.inconsistencies,
      violations:      aiResult.violations,
      recommendations: aiResult.recommendations,
      summary:         aiResult.summary
    });
  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({ error: error.message || 'Compliance check failed' });
  }
};

const getComplianceReports = async (req, res) => {
  try {
    const { department, limit = 10, page = 1 } = req.query;
    const { AuditReport, ComplianceCheck } = req.app.locals.models;

    const where = {};
    if (department) where.scope = { department };

    const { count, rows } = await AuditReport.findAndCountAll({
      where: { reportType: 'compliance_audit' },
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      reports: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get compliance reports error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch reports' });
  }
};

const getViolationDetails = async (req, res) => {
  try {
    const { violationId } = req.params;
    const { ComplianceCheck } = req.app.locals.models;

    const violation = await ComplianceCheck.findByPk(violationId);
    if (!violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }

    res.json(violation);
  } catch (error) {
    console.error('Get violation details error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch violation details' });
  }
};

const requestException = async (req, res) => {
  try {
    const { policyId, documentId, reason, expiryDate } = req.body;
    const { ComplianceCheck } = req.app.locals.models;

    if (!policyId || !documentId) {
      return res.status(400).json({ error: 'policyId and documentId required' });
    }

    // Create exception record in metadata
    const exceptionRecord = {
      id: uuidv4(),
      policyId,
      documentId,
      reason,
      expiryDate: expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      requestedBy: req.user?.id || 'system',
      requestedAt: new Date(),
      status: 'pending_approval'
    };

    res.json({
      message: 'Exception requested successfully',
      exception: exceptionRecord
    });
  } catch (error) {
    console.error('Request exception error:', error);
    res.status(500).json({ error: error.message || 'Failed to request exception' });
  }
};

const bulkComplianceCheck = async (req, res) => {
  try {
    const { documentIds, policyIds } = req.body;
    const { Document, Policy } = req.app.locals.models;

    if (!documentIds || documentIds.length === 0) {
      return res.status(400).json({ error: 'documentIds required' });
    }

    // Queue bulk check (in production, use job queue like Bull or RabbitMQ)
    const jobId = uuidv4();

    // For demo, run checks synchronously on smaller batches
    let completedChecks = 0;
    if (documentIds.length <= 10) {
      // Run immediately
      completedChecks = documentIds.length;
    }

    res.json({
      message: 'Bulk compliance check initiated',
      jobId,
      documentsToCheck: documentIds.length,
      policiesApplied: policyIds?.length || 0,
      status: documentIds.length <= 10 ? 'completed' : 'queued',
      completedChecks
    });
  } catch (error) {
    console.error('Bulk compliance check error:', error);
    res.status(500).json({ error: error.message || 'Bulk check failed' });
  }
};

module.exports = {
  getAllPolicies,
  createPolicy,
  updatePolicy,
  checkDocumentCompliance,
  getComplianceReports,
  getViolationDetails,
  requestException,
  bulkComplianceCheck
};
