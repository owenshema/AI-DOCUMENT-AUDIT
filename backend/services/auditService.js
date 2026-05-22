/**
 * Audit Service
 * Business logic for audit reporting
 */

const auditLogRepository = require('../repositories/auditLogRepository');
const complianceRepository = require('../repositories/complianceRepository');
const { GenerateAuditReportDTO } = require('../dto');

class AuditService {
  async generateAuditReport(generateDTO) {
    // Validate DTO
    const errors = generateDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    // Fetch audit logs for the date range
    const logs = await auditLogRepository.getAuditsByDateRange(
      generateDTO.startDate,
      generateDTO.endDate
    );

    let findings = [];

    if (generateDTO.reportType === 'compliance' || generateDTO.reportType === 'comprehensive') {
      // Get compliance data
      const checks = await complianceRepository.getAllComplianceChecks({});
      findings.push({
        section: 'Compliance',
        totalChecks: checks.total,
        data: checks.checks
      });
    }

    if (generateDTO.reportType === 'security' || generateDTO.reportType === 'comprehensive') {
      // Get security events
      const securityEvents = await auditLogRepository.getSecurityEvents(
        generateDTO.startDate,
        generateDTO.endDate
      );
      findings.push({
        section: 'Security Events',
        totalEvents: securityEvents.total,
        data: securityEvents.events
      });
    }

    if (generateDTO.reportType === 'activity' || generateDTO.reportType === 'comprehensive') {
      findings.push({
        section: 'Activities',
        totalLogs: logs.total,
        data: logs.logs
      });
    }

    const report = {
      id: `report_${Date.now()}`,
      name: `${generateDTO.reportType} Audit Report`,
      reportType: generateDTO.reportType,
      startDate: generateDTO.startDate,
      endDate: generateDTO.endDate,
      generatedAt: new Date(),
      findings,
      status: 'completed'
    };

    // Log report generation
    await auditLogRepository.create({
      action: 'audit_report_generated',
      resourceType: 'audit_report',
      resourceId: report.id,
      description: `Audit report generated: ${report.name}`
    });

    return report;
  }

  async exportAuditReport(reportId, format = 'pdf') {
    // Simulate report export
    const exportPath = `/exports/${reportId}.${format}`;

    // Log export
    await auditLogRepository.create({
      action: 'audit_report_exported',
      description: `Report exported as ${format}: ${reportId}`
    });

    return {
      success: true,
      format,
      path: exportPath,
      exportedAt: new Date()
    };
  }

  async scheduleAuditReport(reportName, frequency, recipients, reportType) {
    // Schedule recurring reports
    const job = {
      id: `job_${Date.now()}`,
      name: reportName,
      frequency,
      recipients,
      reportType,
      status: 'scheduled',
      createdAt: new Date()
    };

    // Log scheduling
    await auditLogRepository.create({
      action: 'audit_report_scheduled',
      description: `Report scheduled: ${reportName} (${frequency})`
    });

    return job;
  }

  async distributeAuditReport(reportId, recipients) {
    // Distribute report to recipients
    const distribution = {
      reportId,
      recipients,
      distributedAt: new Date(),
      status: 'distributed'
    };

    // Log distribution
    await auditLogRepository.create({
      action: 'audit_report_distributed',
      resourceId: reportId,
      description: `Report distributed to ${recipients.length} recipients`
    });

    return distribution;
  }

  async archiveAuditReport(reportId) {
    // Archive report
    await auditLogRepository.create({
      action: 'audit_report_archived',
      resourceId: reportId,
      description: `Audit report archived: ${reportId}`
    });

    return { success: true, reportId, archivedAt: new Date() };
  }

  async getAuditReport(reportId) {
    // In a real scenario, fetch from database
    return {
      id: reportId,
      name: 'Sample Audit Report',
      status: 'available'
    };
  }

  async listAuditReports(page = 1, limit = 10) {
    const filters = {};
    const logs = await auditLogRepository.getAll(filters, page, limit);
    
    return {
      total: logs.total,
      reports: logs.logs.filter(log => log.action.includes('report')),
      page,
      limit
    };
  }
}

module.exports = new AuditService();
