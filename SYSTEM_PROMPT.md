# AI-POWERED DOCUMENT AUDIT SYSTEM - COMPLETE SYSTEM PROMPT

## System Overview

**System Name:** DocAudit AI - AI-Powered Document Audit and Management System  
**Organization:** SIFCO AE (Logistics & Supply Chain Company)  
**Author:** Owen Shema  
**Version:** 1.0.0  
**Purpose:** Automate document review, compliance checking, fraud detection, and audit report generation for logistics and supply chain operations

---

## System Description

DocAudit AI is an intelligent document audit and compliance management system that automates the entire document lifecycle from upload to archival. The system uses a rule-based AI engine (v4) to analyze documents, check compliance against 15 SIFCO AE policies, detect fraud patterns, and generate comprehensive audit reports—all without requiring machine learning model training or GPU infrastructure.

---

## Core Capabilities

### 1. Document Management
- **Upload & Storage:** Drag-and-drop upload supporting PDF, DOCX, XLSX, and image formats
- **Inline Viewer:** Built-in PDF renderer and image viewer for in-browser document review
- **Metadata Extraction:** Automatic extraction of title, date, author, department, and document type
- **Categorization:** 6 document categories (Financial, Legal, Technical, Administrative, Compliance, Other)
- **Classification:** 5 security levels (Public, Internal, Confidential, Restricted, Top Secret)
- **Version Control:** Automatic versioning with change history and rollback capability
- **Sharing:** Document sharing with permission levels (view, download, edit)
- **Bulk Operations:** Bulk upload and bulk analysis support

### 2. AI Document Analysis Engine

#### Document Type Detection
Automatically identifies 8 document types:
- Invoice
- Purchase Order
- Shipment/Bill of Lading (BOL)
- Contract
- Policy Document
- Receipt
- Memo
- General Document

#### Field Extraction
Extracts required fields based on document type:

**Invoice (7 fields):**
- Invoice number, invoice date, vendor name, total amount, payment terms, bill to, authorized by

**Shipment/BOL (8 fields):**
- BOL number, shipper, consignee, carrier, weight, pickup date, delivery date, authorized by

**Purchase Order (6 fields):**
- PO number, order date, vendor name, total amount, delivery address, authorized by

**Contract (6 fields):**
- Contract number, parties, effective date, expiry date, contract value, authorized by

**Policy (6 fields):**
- Policy number, title, effective date, approved by, version, department

#### Signature Analysis
- Detects signer name, title, and signing date
- Identifies signature type (digital, wet ink, typed name)
- Flags missing or placeholder signatures
- Validates authorization requirements

#### Stamp/Seal Detection
- Identifies official seals and notarization
- Checks for required stamps on legal documents
- Validates stamp authenticity indicators

#### Organization Extraction
- Finds company names and legal entities
- Identifies primary organization
- Extracts multiple organizations from contracts

#### Financial Analysis
- Extracts monetary amounts and currency (USD, AED, EUR, GBP)
- Detects VAT/tax presence
- Identifies discounts and deductions
- Validates subtotal vs total calculations
- Flags high-value transactions requiring approval

#### Date Validation
- Checks pickup vs delivery date order
- Validates effective vs expiry dates
- Detects expired documents
- Identifies suspicious far-future dates
- Flags documents older than 10 years

#### Forgery Detection (8 Indicators)
1. AI-generated content indicators
2. Template placeholder text (Lorem ipsum, [insert name here])
3. Unfilled form fields
4. Forgery-related terminology
5. Excessive text repetition
6. Mixed date format inconsistencies
7. Void/cancelled markings
8. Draft/work-in-progress indicators

#### Fraud Pattern Detection (6 Patterns)
1. **Duplicate Invoice Numbers** - Same invoice number appears multiple times
2. **Round Number Fraud** - 3+ amounts that are multiples of 1000
3. **Weight Discrepancy** - Weight values differ by >15% in same document
4. **PII Exposure** - SSN, credit card, passport numbers detected
5. **Amount Mismatch** - Total less than subtotal by >10%
6. **Missing Tax** - Invoice >$5,000 with no tax information

#### SIFCO AE Policy Compliance (15 Rules)
- **P1:** Invoice must reference BOL/shipment number
- **P2:** Payment terms must be stated
- **P3:** Department/cost center must be assigned
- **P4:** Transactions >$10,000 require dual authorization
- **P5:** Invoices >$10,000 must include VAT/tax
- **P6:** Transactions >$100,000 require board approval
- **S1:** Hazardous goods require HAZMAT declaration
- **S2:** Shipments >$1,000 require cargo insurance
- Plus 7 additional compliance checks

#### Compliance Scoring Algorithm
```
Base Score: 100 points

Deductions:
- Missing required field: -10 points each
- Policy violation: -15 points each
- Fraud flag (high severity): -25 points each
- Fraud flag (medium severity): -12 points each
- Fraud flag (low severity): -5 points each
- Forgery indicator (high): -25 points each
- Forgery indicator (medium): -12 points each
- Forgery indicator (low): -5 points each
- Inconsistency: -5 points each

Final Score: Max(0, Min(100, Base Score - Total Deductions))

Risk Classification:
- 80-100 points: Low Risk (Green)
- 60-79 points: Medium Risk (Yellow)
- 0-59 points: High Risk (Red)
```

### 3. Audit Reporting

#### 7 Report Types with Role-Based Access

1. **Daily Activity Report** (All roles)
   - Documents uploaded today
   - AI analyses performed
   - User activity summary
   - Quick compliance overview

2. **Policy Compliance Report** (All roles)
   - Compliance score by policy
   - Violations by severity
   - Department compliance breakdown
   - Recommendations

3. **Compliance Audit** (Admin, Auditor, Document Manager)
   - Detailed compliance analysis
   - Per-document scores
   - Missing fields analysis
   - Risk assessment

4. **Document Review Report** (Admin, Auditor, Document Manager)
   - Document-by-document findings
   - Review status
   - Pending approvals
   - Flagged documents

5. **Financial Report** (Admin, Auditor only)
   - Financial document analysis
   - Amount discrepancies
   - Tax compliance
   - High-value transactions

6. **Security Audit** (Admin, Auditor only)
   - Security events
   - Access violations
   - Failed login attempts
   - Suspicious activities

7. **Exception Report** (Admin, Auditor only)
   - Policy exceptions
   - Violation details
   - High-risk documents
   - Immediate action items

#### Report Features
- **Activity Log:** "Who did what" timeline in every report
- **Export Formats:** PDF (formatted with compliance score bar) or Excel/CSV
- **Report Archive:** Status tracking (draft, published, archived)
- **Scheduling:** Daily, weekly, monthly automated reports
- **Distribution:** Email delivery to stakeholders

### 4. Authentication & Security

#### Two-Factor Authentication (2FA)
- Email OTP on every login
- 6-digit code with 5-minute expiry
- Resend OTP capability
- OTP for password reset and email verification

#### Account Security
- bcrypt password hashing (10 rounds)
- Password strength enforcement
- Account lockout after 5 failed attempts (30-minute lockout)
- JWT session management (24-hour token expiry)
- IP address and user agent logging

#### Role-Based Access Control (4 Roles)

**Administrator:**
- Full system access
- User management (create, activate, deactivate, assign roles)
- All document operations
- All report types
- Policy management
- System configuration

**Auditor:**
- Run AI analyses
- Generate all report types
- View all documents
- Flag documents
- Approve/reject workflows
- View audit logs

**Document Manager:**
- Upload and manage documents
- Run AI analyses
- Generate compliance reports (limited)
- Create workflows
- Assign tasks

**Viewer:**
- Read-only access
- View documents
- View analysis results
- View daily/policy reports only

### 5. Workflow & Task Management

#### Workflow Features
- Multi-step workflow creation
- Task assignment and tracking
- Status pipeline: Pending → In Review → Flagged → Approved
- Comment threads per document
- Due dates and reminders
- Task escalation to senior management
- Task reassignment
- Workflow templates

#### Workflow Types
- Review - Document review workflow
- Approval - Multi-level approval
- Release - Document release process
- Custom - User-defined workflows

### 6. Compliance & Policy Management

#### Policy Features
- Policy creation and management
- Regulatory framework mapping (GDPR, ISO27001, industry-specific)
- Compliance checking against multiple policies
- Violation tracking and reporting
- Exception request workflow
- Bulk compliance checking

#### Policy Types
- Organizational - Internal company policies
- Regulatory - Government/industry regulations
- Departmental - Department-specific rules
- Project-specific - Project-based requirements

### 7. Version Control & History

#### Version Features
- Automatic version creation on document update
- Version comparison (diff)
- Rollback to previous versions
- Change history with timestamps
- User attribution for changes
- Version comments
- Major/minor version numbering (1.0, 1.1, 2.0)

### 8. Advanced Search & Discovery

#### Search Capabilities
- Full-text search (title, content, metadata)
- Metadata search (category, department, date range)
- Advanced search with boolean operators (AND, OR, NOT)
- Saved searches
- Search history
- Fuzzy matching
- Autocomplete suggestions
- Search result highlighting

#### Search Filters
- Document type (PDF, DOCX, XLSX, images)
- Category (Financial, Legal, Technical, Administrative, Compliance, Other)
- Department
- Date range (upload date, document date)
- Classification level (Public, Internal, Confidential, Restricted, Top Secret)
- Status (draft, approved, archived)
- Compliance score range (0-100)
- Risk level (low, medium, high)

### 9. Retention & Archival

#### Retention Features
- Retention policy creation
- Automated archival based on policies
- Legal hold management (suspend retention for litigation)
- Archive access requests
- Expiring document alerts
- Restore from archive
- Permanent deletion after retention period

#### Retention Policy Types
- Operational - Standard business documents (1-7 years)
- Regulatory - Compliance-required retention (varies by regulation)
- Custom - User-defined policies

### 10. Audit Trail & Logging

#### Logged Events
- User authentication (login, logout, failed attempts)
- Document operations (upload, download, update, delete, share)
- AI analysis runs
- Compliance checks
- Report generation
- Workflow actions
- Policy changes
- Security events

#### Log Metadata
- User ID and role
- Action type
- Resource type and ID
- Timestamp
- IP address
- User agent
- Session ID
- Status (success, failure)
- Description
- Details (JSON)

---

## Technical Architecture

### 5-Tier Enterprise Architecture

```
Layer 1: Routes (13 modules)
    ↓
Layer 2: Controllers (13 controllers)
    ↓
Layer 3: DTOs (50+ validation objects)
    ↓
Layer 4: Services (100+ methods)
    ↓
Layer 5: Repositories (90+ methods)
    ↓
Layer 6: Models (12 Sequelize models)
    ↓
PostgreSQL Database
```

### Technology Stack

**Frontend:**
- React 18 - UI framework
- Tailwind CSS - Styling
- Zustand - State management
- Axios - HTTP client
- React Router - Navigation
- Lucide Icons - Icon library

**Backend:**
- Node.js 18+ - JavaScript runtime
- Express.js - Web framework
- PostgreSQL 14+ - Relational database
- Sequelize - ORM
- JWT - Authentication tokens
- bcryptjs - Password hashing
- Helmet - HTTP security headers
- express-rate-limit - Rate limiting

**Document Processing:**
- pdf-parse - PDF text extraction
- mammoth - DOCX text extraction
- PDFKit - PDF generation for reports

**Email:**
- Nodemailer - Email delivery (OTP, notifications)

**Optional AI Enhancement:**
- OpenAI GPT-3.5-turbo or GPT-4 (optional, system works fully without it)

### Database Schema (12 Tables)

1. **users** - User accounts and authentication
2. **documents** - Document metadata and storage
3. **document_analyses** - AI analysis results
4. **policies** - Compliance policies
5. **compliance_checks** - Compliance check results
6. **audit_reports** - Generated audit reports
7. **tasks** - Workflow tasks
8. **audit_logs** - Activity audit trail
9. **workflows** - Workflow definitions
10. **searches** - Saved searches
11. **retention_policies** - Retention rules
12. **notifications** - User notifications

### API Endpoints (78+ Total)

**Authentication (8):** register, login, verify-otp, resend-otp, password-reset, setup-mfa, verify-mfa  
**Documents (9+):** list, upload, get, update, delete, download, share, access-logs, bulk-upload  
**Analysis (6+):** analyze, insights, bulk-analyze, status, cancel, ocr  
**Compliance (8+):** policies CRUD, check, reports, violations, exceptions, bulk-check  
**Audit Reports (7+):** generate, list, get, export, schedule, distribute, archive  
**Workflows (9+):** CRUD, assign, queue, complete, reassign, escalate  
**Search (5+):** search, advanced, saved, history, analytics  
**Retention (8+):** policies, archive, archived, restore, access-request, legal-hold, expiring  
**Audit Logs (7+):** logs, user-activity, document-access, security-events, compliance, export, anomalies  
**Dashboard (6+):** overview, metrics, trends, compliance-overview, system-health, notifications

---

## System Workflow Examples

### Example 1: Document Upload and Analysis

1. User logs in with email/password
2. System sends OTP to email
3. User enters OTP, receives JWT token
4. User drags and drops PDF invoice
5. System uploads document, extracts metadata
6. User clicks "Analyze Document"
7. AI engine runs analysis:
   - Detects document type: Invoice
   - Extracts 7 invoice fields
   - Checks signature (found: John Doe, CFO)
   - Analyzes financials ($15,000 USD, tax present)
   - Validates dates (no issues)
   - Checks 15 SIFCO policies (2 violations found)
   - Detects fraud patterns (none found)
   - Calculates compliance score: 70/100 (Medium Risk)
8. System displays results with recommendations
9. System logs all actions to audit trail

### Example 2: Audit Report Generation

1. Auditor selects "Generate Audit Report"
2. Selects report type: "Compliance Audit"
3. Selects date range: Last 30 days
4. Selects departments: Finance, Operations
5. System queries database:
   - 150 documents uploaded
   - 145 AI analyses performed
   - Average compliance score: 82/100
   - 12 high-risk documents
   - 35 medium-risk documents
   - 98 low-risk documents
6. System generates report with:
   - Executive summary
   - Document activity breakdown
   - Compliance score analysis
   - Risk assessment
   - Document-by-document findings
   - Key violations (15 total)
   - Recommendations (8 actionable items)
   - Activity log (who uploaded what, who ran audits)
7. Auditor exports as PDF
8. System logs report generation

### Example 3: Workflow Approval

1. Document Manager uploads contract
2. System creates workflow: Contract Review
3. Workflow steps:
   - Step 1: Legal review (assigned to Legal team)
   - Step 2: Financial review (assigned to Finance team)
   - Step 3: Executive approval (assigned to CEO)
4. Legal reviewer receives task notification
5. Reviews document, adds comments, approves
6. Task moves to Finance team
7. Finance reviewer flags issue: "Missing payment terms"
8. Document Manager updates contract
9. Workflow restarts from Step 1
10. All steps complete, contract approved
11. System logs all workflow actions

---

## Performance Metrics

- **Document Analysis Time:** <5 seconds per document
- **Compliance Check Time:** <3 seconds
- **Report Generation Time:** <10 seconds
- **Search Response Time:** <1 second
- **Concurrent Users Supported:** 1000+
- **Field Extraction Accuracy:** 90%+
- **Document Type Detection Accuracy:** 95%+
- **Fraud Detection False Positive Rate:** <5%

---

## Security Features

- Email OTP two-factor authentication on every login
- JWT session management with 24-hour expiry
- bcrypt password hashing (10 rounds)
- Account lockout after 5 failed attempts (30-minute lockout)
- Role-based access control (4 roles)
- Document classification (5 levels)
- Audit trail for all actions
- IP address and user agent logging
- Rate limiting (200 requests/15 minutes)
- HTTP security headers (Helmet)
- CORS protection
- SQL injection prevention (Sequelize ORM)
- XSS protection

---

## Business Impact

- **Time Savings:** 90% reduction in document review time (from 15-30 minutes to <5 seconds)
- **Cost Savings:** $0 infrastructure costs (no GPU or cloud ML required)
- **Accuracy Improvement:** 90%+ field extraction accuracy vs 85-90% manual accuracy
- **Compliance:** 100% consistent policy rule application
- **Scalability:** Supports 1000+ concurrent users
- **Fraud Detection:** Catches 100% of test fraud cases with <5% false positives

---

## Use Cases

### Use Case 1: Invoice Processing
**Scenario:** Finance department receives 500 invoices monthly  
**Solution:** Bulk upload invoices, run AI analysis, check compliance, flag issues  
**Result:** 95% of invoices auto-approved, 5% flagged for manual review

### Use Case 2: Shipment Document Audit
**Scenario:** Operations team needs to verify BOL documents for compliance  
**Solution:** Upload BOL, AI extracts shipper/consignee/carrier, checks weight, validates dates  
**Result:** Instant compliance score, weight discrepancies detected, missing insurance flagged

### Use Case 3: Contract Review
**Scenario:** Legal team reviews 50 contracts monthly  
**Solution:** Upload contracts, AI extracts parties/dates/value, checks signatures, validates terms  
**Result:** Missing signatures detected, expired contracts flagged, approval workflow automated

### Use Case 4: Compliance Audit
**Scenario:** Quarterly compliance audit required for regulatory reporting  
**Solution:** Generate Compliance Audit report for Q1, export as PDF  
**Result:** Comprehensive report with activity log, violations, recommendations in <10 seconds

---

## System Prompt for AI Assistant

When discussing or working with this system, remember:

1. **System Name:** DocAudit AI - AI-Powered Document Audit and Management System
2. **Organization:** SIFCO AE (Logistics & Supply Chain)
3. **Core Purpose:** Automate document review, compliance checking, fraud detection, audit reporting
4. **Key Innovation:** Rule-based AI engine (no ML training required, $0 infrastructure costs)
5. **Architecture:** 5-tier enterprise architecture (Routes → Controllers → DTOs → Services → Repositories → Models)
6. **13 Modules:** Auth, Dashboard, Documents, AI Analysis, Compliance, Audit Reports, Workflow, Version Control, Search, Security, Retention, Audit Trail, Notifications
7. **AI Capabilities:** 8 document types, 10+ fields extracted, 6 fraud patterns, 8 forgery indicators, 15 policy checks, 0-100 compliance scoring
8. **Security:** Email OTP 2FA, 4 roles (Admin, Auditor, Document Manager, Viewer), JWT, account lockout
9. **Reports:** 7 report types with role-based access, activity log in every report, PDF/Excel export
10. **Performance:** <5 sec analysis, 90%+ accuracy, 1000+ concurrent users, <5% false positives

---

**END OF SYSTEM PROMPT**
