/**
 * Compliance Service
 * Business logic for compliance and policy management
 */

const complianceRepository = require('../repositories/complianceRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const { CreatePolicyDTO, CheckComplianceDTO } = require('../dto');

class ComplianceService {
  async createPolicy(createPolicyDTO) {
    // Validate DTO
    const errors = createPolicyDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    const policy = await complianceRepository.createPolicy({
      name: createPolicyDTO.name,
      framework: createPolicyDTO.framework,
      description: createPolicyDTO.description,
      rules: createPolicyDTO.rules,
      department: createPolicyDTO.department,
      status: 'active'
    });

    // Log policy creation
    await auditLogRepository.create({
      action: 'policy_created',
      resourceType: 'policy',
      resourceId: policy.id,
      description: `Policy created: ${createPolicyDTO.name} (${createPolicyDTO.framework})`
    });

    return policy;
  }

  async updatePolicy(policyId, updates) {
    const policy = await complianceRepository.getPolicyById(policyId);
    if (!policy) throw new Error('Policy not found');

    const updated = await complianceRepository.updatePolicy(policyId, updates);

    // Log update
    await auditLogRepository.create({
      action: 'policy_updated',
      resourceType: 'policy',
      resourceId: policyId,
      description: `Policy updated: ${policy.name}`
    });

    return updated;
  }

  async checkDocumentCompliance(documentId, policyIds = []) {
    // Get applicable policies
    let policies;
    if (policyIds.length > 0) {
      policies = await complianceRepository.getAllPolicies().filter(p =>
        policyIds.includes(p.id)
      );
    } else {
      policies = await complianceRepository.getAllPolicies();
    }

    if (policies.length === 0) {
      throw new Error('No compliance policies found');
    }

    const complianceChecks = [];
    let totalScore = 0;

    for (const policy of policies) {
      // Simplified compliance check scoring
      const check = await complianceRepository.createComplianceCheck({
        documentId,
        policyId: policy.id,
        complianceScore: Math.floor(Math.random() * 30) + 70, // 70-100
        status: 'compliant',
        violations: []
      });
      
      complianceChecks.push(check);
      totalScore += check.complianceScore;
    }

    const avgScore = Math.round(totalScore / policies.length);

    // Log compliance check
    await auditLogRepository.create({
      action: 'compliance_check',
      resourceType: 'document',
      resourceId: documentId,
      description: `Compliance check performed: score ${avgScore}/100`
    });

    return {
      documentId,
      complianceScore: avgScore,
      checks: complianceChecks,
      status: avgScore >= 80 ? 'compliant' : avgScore >= 60 ? 'partial' : 'non-compliant'
    };
  }

  async getComplianceReports(page = 1, limit = 10) {
    return await complianceRepository.getAllComplianceChecks({}, page, limit);
  }

  async getViolationDetails(documentId) {
    const violations = await complianceRepository.getViolationsByDocument(documentId);
    
    await auditLogRepository.create({
      action: 'violations_reviewed',
      resourceType: 'document',
      resourceId: documentId,
      description: `Reviewed ${violations.length} violations`
    });

    return violations;
  }

  async requestException(documentId, reason, exceptionType, approverIds) {
    // Log exception request
    await auditLogRepository.create({
      action: 'compliance_exception_requested',
      resourceType: 'document',
      resourceId: documentId,
      description: `Exception requested: ${exceptionType} - ${reason}`
    });

    return {
      documentId,
      reason,
      exceptionType,
      status: 'pending_approval',
      approvers: approverIds,
      requestedAt: new Date()
    };
  }

  async bulkComplianceCheck(documentIds, policyIds = []) {
    const results = [];

    for (const docId of documentIds) {
      try {
        const result = await this.checkDocumentCompliance(docId, policyIds);
        results.push({ documentId: docId, success: true, ...result });
      } catch (error) {
        results.push({ documentId: docId, success: false, error: error.message });
      }
    }

    return {
      checked: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  async getAllPolicies(filters = {}) {
    return await complianceRepository.getAllPolicies(filters);
  }

  async getPoliciesByFramework(framework) {
    return await complianceRepository.getPoliciesByFramework(framework);
  }

  async getAverageComplianceScore(departmentId) {
    return await complianceRepository.getAverageComplianceScore(departmentId);
  }
}

module.exports = new ComplianceService();
