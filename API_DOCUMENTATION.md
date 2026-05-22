# AI-Powered Document Audit and Management System - API Documentation

## Overview
Complete backend API for document audit, compliance management, and workflow automation.

---

## Authentication Module (`/api/auth`)

### Register User
**POST** `/api/auth/register`
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "employeeId": "EMP001",
  "role": "auditor|document_manager|administrator|viewer",
  "department": "Finance",
  "password": "SecurePassword123!"
}
```

### Login
**POST** `/api/auth/login`
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "mfaCode": "123456" (optional)
}
```

### Verify Email
**POST** `/api/auth/verify-email`
**POST** `/api/auth/request-password-reset`
**POST** `/api/auth/reset-password`
**POST** `/api/auth/setup-mfa`
**POST** `/api/auth/verify-mfa`

---

## Document Management (`/api/documents`)

### List Documents
**GET** `/api/documents?category=Financial&status=approved&department=Finance&page=1&limit=10`

### Upload Document
**POST** `/api/documents`
```json
{
  "title": "Financial Report Q1 2026",
  "description": "Quarterly financial statement",
  "category": "Financial|Legal|Technical|Administrative|Compliance|Other",
  "department": "Finance",
  "classificationLevel": "public|internal|confidential|restricted",
  "tags": ["quarterly", "financial", "2026"]
}
```

### Get Document Details
**GET** `/api/documents/:id`

### Update Document
**PUT** `/api/documents/:id`

### Delete Document
**DELETE** `/api/documents/:id`

### Download Document
**GET** `/api/documents/:id/download`

### Share Document
**POST** `/api/documents/:id/share`
```json
{
  "recipientUsers": ["user_1", "user_2"],
  "recipientEmails": ["email@example.com"],
  "accessLevel": "view|download|edit",
  "expiryDate": "2026-05-16"
}
```

### Access Logs
**GET** `/api/documents/:id/access-logs`

### Bulk Upload
**POST** `/api/documents/bulk/upload`

---

## AI Document Analysis (`/api/analysis`)

### Analyze Document
**POST** `/api/analysis`
```json
{
  "documentId": "doc_123",
  "analysisType": "full|ocr|entity_extraction|sentiment|anomaly|classification"
}
```

### Get Analysis Status
**GET** `/api/analysis/:analysisId/status`

### Get Analysis Results
**GET** `/api/analysis/:analysisId/results`

### Analysis Queue
**GET** `/api/analysis/queue/list`

### Cancel Analysis
**POST** `/api/analysis/:analysisId/cancel`

### Perform OCR
**POST** `/api/analysis/ocr/process`
```json
{
  "documentId": "doc_123"
}
```

### Apply Manual Corrections
**POST** `/api/analysis/:analysisId/corrections`
```json
{
  "corrections": [
    {
      "correctionType": "entity",
      "originalValue": "John Due",
      "correctedValue": "John Doe"
    }
  ]
}
```

---

## Compliance & Policy Management (`/api/compliance`)

### List Policies
**GET** `/api/compliance/policies?status=active&department=Finance`

### Create Policy
**POST** `/api/compliance/policies`
```json
{
  "name": "Financial Document Policy",
  "description": "Policy for financial document handling",
  "policyType": "organizational|regulatory|departmental|project-specific",
  "regulatoryFrameworks": ["GDPR", "ISO27001"],
  "rules": [
    {
      "name": "Signature Requirement",
      "ruleType": "mandatory",
      "severity": "high"
    }
  ]
}
```

### Update Policy
**PUT** `/api/compliance/policies/:policyId`

### Check Compliance
**POST** `/api/compliance/check`
```json
{
  "documentId": "doc_123",
  "policyIds": ["policy_1", "policy_2"]
}
```

### Compliance Reports
**GET** `/api/compliance/reports?department=Finance&dateRange=30d`

### Violation Details
**GET** `/api/compliance/violations/:violationId`

### Request Exception
**POST** `/api/compliance/exceptions/request`
```json
{
  "ruleId": "rule_1",
  "documentId": "doc_123",
  "reason": "Exception justified",
  "expiryDate": "2026-06-16"
}
```

### Bulk Compliance Check
**POST** `/api/compliance/check/bulk`
```json
{
  "documentIds": ["doc_1", "doc_2"],
  "policyIds": ["policy_1"]
}
```

---

## Audit Reporting (`/api/audits`)

### Generate Report
**POST** `/api/audits/reports`
```json
{
  "title": "Q1 2026 Audit Report",
  "reportType": "summary|detailed|exception_only|custom",
  "documentIds": ["doc_1", "doc_2"],
  "departments": ["Finance"],
  "dateRange": {
    "startDate": "2026-01-01",
    "endDate": "2026-03-31"
  },
  "policyIds": ["policy_1"]
}
```

### Get Report
**GET** `/api/audits/reports/:reportId`

### List Reports
**GET** `/api/audits/reports?status=published&limit=10&page=1`

### Export Report
**GET** `/api/audits/reports/:reportId/export?format=PDF|Excel|Word|JSON`

### Schedule Report
**POST** `/api/audits/reports/schedule`
```json
{
  "title": "Weekly Audit Report",
  "frequency": "daily|weekly|monthly",
  "reportType": "summary",
  "departments": ["Finance"],
  "recipients": ["user_1@example.com"]
}
```

### Distribute Report
**POST** `/api/audits/reports/:reportId/distribute`
```json
{
  "recipients": ["user_1", "user_2"],
  "format": "PDF",
  "deliveryMethod": "email|portal"
}
```

### Archive Report
**POST** `/api/audits/reports/:reportId/archive`

---

## Workflow & Task Management (`/api/workflows`)

### Create Workflow
**POST** `/api/workflows`
```json
{
  "name": "Document Review and Approval",
  "description": "Multi-step review workflow",
  "workflowType": "review|approval|release|custom",
  "department": "Finance",
  "steps": [
    {
      "stepNumber": 1,
      "name": "Initial Review",
      "actionType": "review",
      "assignedRoles": ["auditor"],
      "requiredApprovals": 1,
      "timeoutDays": 5
    }
  ]
}
```

### List Workflows
**GET** `/api/workflows?status=active`

### Update Workflow
**PUT** `/api/workflows/:workflowId`

### Assign Task
**POST** `/api/workflows/tasks/assign`
```json
{
  "documentId": "doc_123",
  "workflowId": "workflow_1",
  "assignedTo": "user_1",
  "dueDate": "2026-04-30",
  "priority": "low|medium|high|critical"
}
```

### Get Task Queue
**GET** `/api/workflows/tasks/queue?userId=user_1&status=pending`

### Complete Task
**POST** `/api/workflows/tasks/:taskId/complete`
```json
{
  "decision": "approved|rejected",
  "comments": "Document meets all requirements"
}
```

### Reassign Task
**POST** `/api/workflows/tasks/:taskId/reassign`
```json
{
  "newAssignee": "user_2",
  "reason": "Workload rebalancing"
}
```

### Escalate Task
**POST** `/api/workflows/tasks/:taskId/escalate`
```json
{
  "escalatedTo": "manager_1",
  "reason": "Requires higher authority decision"
}
```

---

## Document Search (`/api/search`)

### Basic Search
**POST** `/api/search/search`
```json
{
  "query": "financial report",
  "searchType": "full_text|metadata|advanced|boolean",
  "filters": {
    "documentType": ["PDF"],
    "category": ["Financial"],
    "dateRange": {
      "startDate": "2026-01-01",
      "endDate": "2026-12-31"
    }
  },
  "limit": 20,
  "page": 1,
  "sortBy": "relevance|date|title"
}
```

### Advanced Search
**POST** `/api/search/advanced`
```json
{
  "fullTextQuery": "financial AND compliance",
  "filters": {},
  "operators": "AND|OR|NOT",
  "sortBy": "date",
  "sortOrder": "asc|desc"
}
```

### Save Search
**POST** `/api/search/saved`
```json
{
  "searchName": "Financial Documents",
  "searchQuery": "financial",
  "filters": { "category": ["Financial"] },
  "frequency": "once|daily|weekly|monthly"
}
```

### Get Saved Searches
**GET** `/api/search/saved`

### Search History
**GET** `/api/search/history`

### Search Results
**GET** `/api/search/results/:searchId`

### Search Analytics
**GET** `/api/search/analytics?timeRange=30d|90d|1y`

---

## Retention & Archival (`/api/retention`)

### Create Retention Policy
**POST** `/api/retention/policies`
```json
{
  "name": "Standard Retention Policy",
  "description": "Default retention for operational documents",
  "policyType": "operational|regulatory|custom",
  "documentTypes": ["PDF", "DOCX"],
  "retentionRules": [
    {
      "name": "1 Year Retention",
      "retentionPeriodDays": 365,
      "dispositionAction": "delete|archive|review"
    }
  ],
  "automationRules": [
    {
      "trigger": "date_based",
      "action": "archive"
    }
  ]
}
```

### List Policies
**GET** `/api/retention/policies?status=active`

### Archive Document
**POST** `/api/retention/archive`
```json
{
  "documentIds": ["doc_1", "doc_2"],
  "reason": "retention_policy"
}
```

### Get Archived Documents
**GET** `/api/retention/archived?department=Finance&limit=10`

### Restore Document
**POST** `/api/retention/restore/:documentId`
```json
{
  "reason": "Legal hold release"
}
```

### Request Archive Access
**POST** `/api/retention/access/request`
```json
{
  "documentId": "doc_123",
  "reason": "Litigation discovery",
  "duration": 7
}
```

### Set Legal Hold
**POST** `/api/retention/legal-hold`
```json
{
  "documentIds": ["doc_1", "doc_2"],
  "reason": "Ongoing litigation",
  "holdEndDate": "2026-12-31"
}
```

### Expiring Documents
**GET** `/api/retention/expiring?daysUntilExpiry=30`

---

## Dashboard (`/api/dashboard`)

### Get Dashboard
**GET** `/api/dashboard?userId=user_1&role=auditor`

### Dashboard Metrics
**GET** `/api/dashboard/metrics?role=auditor&department=Finance&dateRange=30d`

### Audit Trend
**GET** `/api/dashboard/audit-trend?days=30`

### Compliance Overview
**GET** `/api/dashboard/compliance-overview?department=Finance`

### System Health
**GET** `/api/dashboard/system-health`

### Notifications
**GET** `/api/dashboard/notifications?unreadOnly=true&limit=20`

---

## Audit Logs (`/api/audit-logs`)

### Get Audit Logs
**GET** `/api/audit-logs?userId=user_1&action=document_upload&startDate=2026-01-01&endDate=2026-12-31`

### User Activity Log
**GET** `/api/audit-logs/user/:userId?startDate=2026-01-01&endDate=2026-12-31`

### Document Access Logs
**GET** `/api/audit-logs/document/:documentId/access?startDate=2026-01-01`

### Security Events
**GET** `/api/audit-logs/security/events?severity=high|medium|low`

### Compliance Log
**GET** `/api/audit-logs/compliance?policyId=policy_1`

### Export Audit Log
**GET** `/api/audit-logs/export?format=CSV&startDate=2026-01-01&endDate=2026-12-31`

### Anomalies
**GET** `/api/audit-logs/anomalies?severity=critical|high&limit=20`

---

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "error": {
    "status": 400,
    "message": "Error description",
    "timestamp": "2026-04-16T15:30:00Z",
    "path": "/api/endpoint"
  }
}
```

---

## Authentication

Protected endpoints require an Authorization header:
```
Authorization: Bearer <token>
```

---

## Rate Limiting
- Standard limit: 1000 requests per hour
- Bulk operations: 100 requests per hour

---

## Versioning
Current API version: v1.0
