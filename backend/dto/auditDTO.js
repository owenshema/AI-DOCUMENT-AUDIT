/**
 * Audit DTOs
 * Request and response validation objects
 */

class GenerateAuditReportDTO {
  constructor(startDate, endDate, reportType = 'comprehensive', departments = []) {
    this.startDate = startDate;
    this.endDate = endDate;
    this.reportType = reportType; // 'compliance', 'activity', 'security', 'comprehensive'
    this.departments = departments;
  }

  validate() {
    const errors = [];
    const validTypes = ['compliance', 'activity', 'security', 'comprehensive'];
    
    if (!this.startDate || isNaN(Date.parse(this.startDate))) {
      errors.push('Valid start date required');
    }
    if (!this.endDate || isNaN(Date.parse(this.endDate))) {
      errors.push('Valid end date required');
    }
    if (!validTypes.includes(this.reportType)) {
      errors.push('Invalid report type');
    }
    if (new Date(this.startDate) > new Date(this.endDate)) {
      errors.push('Start date must be before end date');
    }
    
    return errors;
  }
}

class ExportAuditReportDTO {
  constructor(reportId, format = 'pdf') {
    this.reportId = reportId;
    this.format = format; // 'pdf', 'excel', 'csv'
  }

  validate() {
    const errors = [];
    
    if (!this.reportId) {
      errors.push('Report ID required');
    }
    if (!['pdf', 'excel', 'csv'].includes(this.format)) {
      errors.push('Invalid export format');
    }
    
    return errors;
  }
}

class ScheduleAuditReportDTO {
  constructor(reportName, frequency, recipients, reportType) {
    this.reportName = reportName;
    this.frequency = frequency; // 'daily', 'weekly', 'monthly'
    this.recipients = recipients; // array of emails
    this.reportType = reportType;
  }

  validate() {
    const errors = [];
    
    if (!this.reportName || this.reportName.trim() === '') {
      errors.push('Report name required');
    }
    if (!['daily', 'weekly', 'monthly'].includes(this.frequency)) {
      errors.push('Invalid frequency');
    }
    if (!Array.isArray(this.recipients) || this.recipients.length === 0) {
      errors.push('At least one recipient required');
    }
    
    return errors;
  }
}

class DistributeAuditReportDTO {
  constructor(reportId, recipients) {
    this.reportId = reportId;
    this.recipients = recipients; // array of emails or user IDs
  }

  validate() {
    const errors = [];
    
    if (!this.reportId) {
      errors.push('Report ID required');
    }
    if (!Array.isArray(this.recipients) || this.recipients.length === 0) {
      errors.push('At least one recipient required');
    }
    
    return errors;
  }
}

class AuditReportResponseDTO {
  constructor(report) {
    this.id = report.id;
    this.name = report.name;
    this.reportType = report.reportType;
    this.status = report.status;
    this.generatedAt = report.generatedAt;
    this.startDate = report.startDate;
    this.endDate = report.endDate;
    this.findings = report.findings;
  }
}

module.exports = {
  GenerateAuditReportDTO,
  ExportAuditReportDTO,
  ScheduleAuditReportDTO,
  DistributeAuditReportDTO,
  AuditReportResponseDTO
};
