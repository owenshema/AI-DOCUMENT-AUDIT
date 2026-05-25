# AI-POWERED DOCUMENT AUDIT AND MANAGEMENT SYSTEM
## Complete Thesis Documentation

**Author:** Owen Shema  
**Organization:** SIFCO AE (Logistics & Supply Chain Company)  
**System Name:** DocAudit AI  
**Version:** 1.0.0  
**Date:** May 2026

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Research Objectives](#3-research-objectives)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [System Modules](#6-system-modules)
7. [Database Design](#7-database-design)
8. [AI Analysis Engine](#8-ai-analysis-engine)
9. [Security & Authentication](#9-security--authentication)
10. [Implementation Details](#10-implementation-details)
11. [Testing & Validation](#11-testing--validation)
12. [Results & Findings](#12-results--findings)
13. [Conclusion](#13-conclusion)
14. [Future Work](#14-future-work)
15. [References](#15-references)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Overview
This thesis presents the design, implementation, and evaluation of an AI-powered document audit and management system developed for SIFCO AE, a logistics and supply chain company. The system automates document review, compliance checking, fraud detection, and audit report generation without requiring machine learning model training or GPU infrastructure.

### 1.2 Key Achievements
- **Automated Compliance Checking:** 15 SIFCO AE policy rules checked per document
- **AI Analysis Engine:** Rule-based v4 with optional OpenAI GPT enhancement
- **Document Lifecycle Management:** Upload, analysis, compliance scoring, audit reporting
- **Role-Based Access Control:** 4 user roles with granular permissions
- **Real-time Audit Trail:** Complete activity logging and security event tracking
- **7 Report Types:** Comprehensive audit reporting with PDF/Excel export
- **13 Functional Modules:** Full-featured enterprise document management


### 1.3 System Metrics
- **Backend:** 68 files, ~16,500 lines of code
- **Frontend:** 22 pages, React components
- **API Endpoints:** 78+ RESTful endpoints
- **Database Models:** 12 core models with relationships
- **Architecture:** 5-tier enterprise architecture (Routes → Controllers → DTOs → Services → Repositories → Models)
- **Compliance Score:** 0-100 automated scoring with risk classification
- **Processing Capacity:** Handles PDF, DOCX, XLSX, and image formats

---

## 2. PROBLEM STATEMENT

### 2.1 Industry Context
In the logistics and supply chain industry, document management and compliance verification are critical operational requirements. Organizations like SIFCO AE process thousands of documents monthly including:
- Invoices and purchase orders
- Bills of lading (BOL) and shipment documents
- Contracts and agreements
- Compliance policies and procedures
- Financial reports and receipts

### 2.2 Identified Problems

#### 2.2.1 Manual Document Review Inefficiency
**Problem:** Manual review of documents is time-consuming, error-prone, and does not scale with business growth.
- Average review time: 15-30 minutes per document
- Human error rate: 5-10% for compliance checks
- Bottleneck in approval workflows

#### 2.2.2 Compliance Verification Challenges
**Problem:** Ensuring documents meet regulatory and organizational policies requires expert knowledge and consistent application of rules.
- Multiple regulatory frameworks (GDPR, ISO27001, industry-specific)
- 15+ SIFCO AE internal policies to check
- Inconsistent application of compliance rules across departments

#### 2.2.3 Fraud Detection Limitations
**Problem:** Manual fraud detection misses sophisticated patterns and anomalies.
- Duplicate invoice numbers
- Round-number fraud patterns
- Weight discrepancies in shipments
- PII exposure risks
- Forgery indicators (AI-generated content, placeholder text)

#### 2.2.4 Audit Trail and Reporting Gaps
**Problem:** Lack of comprehensive audit trails and automated reporting.
- No centralized activity logging
- Manual report generation takes days
- Difficulty tracking "who did what" for compliance audits
- No real-time compliance dashboards


#### 2.2.5 Document Lifecycle Management
**Problem:** No unified system for document versioning, retention, and archival.
- Documents scattered across email, shared drives, and local storage
- No version control or change history
- Retention policies not enforced
- Legal hold requirements difficult to implement

#### 2.2.6 Access Control and Security
**Problem:** Inadequate access controls and security classification.
- No role-based permissions
- Sensitive documents not properly classified
- No audit trail for document access
- Weak authentication mechanisms

### 2.3 Research Gap
While document management systems exist, few provide:
1. **AI-powered compliance checking** without requiring ML model training
2. **Real-time fraud detection** using rule-based pattern matching
3. **Logistics-specific** document analysis (BOL, shipment, invoice validation)
4. **Comprehensive audit reporting** with activity timelines
5. **Zero-infrastructure AI** (works without GPU or cloud ML services)

---

## 3. RESEARCH OBJECTIVES

### 3.1 Primary Objectives

#### Objective 1: Automated Document Analysis
**Goal:** Develop an AI-powered analysis engine that automatically extracts metadata, validates compliance, and detects fraud patterns without manual intervention.

**Success Criteria:**
- Extract 10+ key fields per document type (invoice, shipment, contract, policy)
- Achieve 90%+ accuracy in field extraction
- Process documents in under 5 seconds
- Support PDF, DOCX, XLSX, and image formats

#### Objective 2: Compliance Automation
**Goal:** Implement automated compliance checking against 15 SIFCO AE policies and industry regulations.

**Success Criteria:**
- Check all 15 policy rules per document
- Generate compliance score (0-100) with risk classification
- Identify missing required fields
- Detect policy violations with severity levels

#### Objective 3: Fraud Detection
**Goal:** Detect fraud patterns and forgery indicators using rule-based analysis.

**Success Criteria:**
- Detect 6+ fraud patterns (duplicate invoices, round numbers, weight discrepancies, PII exposure, amount mismatches, missing tax)
- Identify forgery indicators (AI-generated content, placeholder text, template fields)
- Flag suspicious documents for manual review
- Achieve <5% false positive rate


#### Objective 4: Audit Trail and Reporting
**Goal:** Provide comprehensive audit trails and automated report generation.

**Success Criteria:**
- Log all user actions with timestamps
- Generate 7 report types with role-based access
- Export reports as PDF and Excel
- Include "who did what" activity timelines in reports

#### Objective 5: Enterprise Architecture
**Goal:** Implement a scalable 5-tier architecture supporting future growth.

**Success Criteria:**
- Separation of concerns (Routes → Controllers → DTOs → Services → Repositories → Models)
- Reusable business logic in service layer
- Input validation via DTOs
- Database abstraction via repositories
- Support 1000+ concurrent users

#### Objective 6: Security and Access Control
**Goal:** Implement robust authentication and role-based access control.

**Success Criteria:**
- Email OTP two-factor authentication
- 4 user roles with granular permissions
- JWT session management
- Account lockout after failed attempts
- Audit trail for all security events

### 3.2 Secondary Objectives

1. **User Experience:** Intuitive interface with drag-and-drop upload and inline document viewer
2. **Performance:** Process documents in real-time with <5 second analysis time
3. **Scalability:** Support 10,000+ documents with efficient search and retrieval
4. **Extensibility:** Modular design allowing easy addition of new document types and policies
5. **Cost Efficiency:** Zero-infrastructure AI (no GPU or cloud ML costs)

---

## 4. SYSTEM ARCHITECTURE

### 4.1 High-Level Architecture

The system follows a **5-tier enterprise architecture** pattern:

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                     │
│  • React 18 + React Router + Zustand (state)           │
│  • Tailwind CSS + Lucide Icons                         │
│  • 22 Pages (Dashboard, Documents, Audit, etc.)        │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST API (78+ endpoints)
┌────────────────────▼────────────────────────────────────┐
│              BACKEND (Node.js/Express)                  │
│                                                         │
│  Layer 1: Routes (13 route modules)                    │
│  Layer 2: Controllers (13 controllers)                 │
│  Layer 3: DTOs (9 validation modules, 50+ DTOs)        │
│  Layer 4: Services (9 services, 100+ methods)          │
│  Layer 5: Repositories (9 repos, 90+ methods)          │
│  Layer 6: Models (12 Sequelize models)                 │
└────────────────────┬────────────────────────────────────┘
                     │ Sequelize ORM
┌────────────────────▼────────────────────────────────────┐
│              DATABASE (PostgreSQL)                      │
│  • 12 tables with relationships                        │
│  • Full audit trail and versioning                     │
└─────────────────────────────────────────────────────────┘
```


### 4.2 Architectural Layers Explained

#### Layer 1: Routes (API Endpoints)
**Purpose:** Define HTTP endpoints and route requests to controllers

**Implementation:**
- 13 route modules (authRoutes, documentRoutes, analysisRoutes, etc.)
- RESTful API design
- Rate limiting (200 requests/15 minutes)
- Authentication middleware integration

**Example:**
```javascript
// routes/documentRoutes.js
router.post('/documents', verifyToken, uploadDocument);
router.get('/documents/:id', verifyToken, getDocument);
router.delete('/documents/:id', verifyToken, deleteDocument);
```

#### Layer 2: Controllers (HTTP Handlers)
**Purpose:** Handle HTTP requests/responses and orchestrate service calls

**Responsibilities:**
- Extract data from requests
- Call appropriate services
- Format responses
- Handle errors

**Example:**
```javascript
// controllers/documentController.js
const uploadDocument = async (req, res) => {
  try {
    const uploadDTO = new UploadDocumentDTO(...req.body);
    const errors = uploadDTO.validate();
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }
    const document = await documentService.uploadDocument(uploadDTO);
    res.status(201).json({ message: 'Success', document });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

#### Layer 3: DTOs (Data Transfer Objects)
**Purpose:** Input validation and data transformation

**Features:**
- Built-in validation methods
- Type checking
- Business rule validation
- Sanitization

**Example:**
```javascript
// dto/documentDTO.js
class UploadDocumentDTO {
  constructor(title, fileName, fileFormat, fileSize, classificationLevel, category, department, userId) {
    this.title = title;
    this.fileName = fileName;
    this.fileFormat = fileFormat;
    this.fileSize = fileSize;
    this.classificationLevel = classificationLevel;
    this.category = category;
    this.department = department;
    this.userId = userId;
  }

  validate() {
    const errors = [];
    if (!this.title || this.title.trim() === '') {
      errors.push('Document title required');
    }
    if (!['pdf', 'docx', 'xlsx', 'png', 'jpg'].includes(this.fileFormat.toLowerCase())) {
      errors.push('Unsupported file format');
    }
    if (!['public', 'internal', 'confidential', 'restricted', 'top_secret'].includes(this.classificationLevel)) {
      errors.push('Invalid classification level');
    }
    return errors;
  }
}
```


#### Layer 4: Services (Business Logic)
**Purpose:** Implement core business logic and orchestrate repository calls

**Responsibilities:**
- Business rule enforcement
- Transaction management
- Cross-cutting concerns (logging, caching)
- Complex operations

**Example:**
```javascript
// services/documentService.js
class DocumentService {
  async uploadDocument(uploadDTO) {
    // Generate file hash
    const fileHash = crypto.createHash('sha256')
      .update(uploadDTO.fileName + Date.now())
      .digest('hex');

    // Check for duplicates
    const duplicate = await documentRepository.findByFileHash(fileHash);
    if (duplicate) {
      throw new Error('Document already exists');
    }

    // Create document
    const document = await documentRepository.create({
      title: uploadDTO.title,
      fileName: uploadDTO.fileName,
      uploadedBy: uploadDTO.userId,
      fileHash,
      status: 'uploaded'
    });

    // Log action
    await auditLogRepository.create({
      userId: uploadDTO.userId,
      action: 'document_uploaded',
      resourceId: document.id
    });

    return document;
  }
}
```

#### Layer 5: Repositories (Data Access)
**Purpose:** Abstract database operations and provide data access interface

**Responsibilities:**
- CRUD operations
- Query building
- Database-specific logic
- Connection management

**Example:**
```javascript
// repositories/documentRepository.js
class DocumentRepository {
  async create(documentData) {
    return await Document.create(documentData);
  }

  async findById(documentId) {
    return await Document.findByPk(documentId, {
      include: [{ model: User, as: 'uploader' }]
    });
  }

  async searchByFullText(query, filters) {
    return await Document.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { extractedText: { [Op.iLike]: `%${query}%` } }
        ],
        ...filters
      }
    });
  }
}
```

#### Layer 6: Models (Database Schema)
**Purpose:** Define database schema and relationships

**Features:**
- Sequelize ORM models
- Relationships (hasMany, belongsTo)
- Hooks (beforeCreate, beforeUpdate)
- Validation rules

**Example:**
```javascript
// models/Document.js
const Document = sequelize.define('Document', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  fileName: { type: DataTypes.STRING(255), allowNull: false },
  fileFormat: { type: DataTypes.STRING(100), defaultValue: 'PDF' },
  category: { type: DataTypes.STRING(100), allowNull: false },
  classificationLevel: { type: DataTypes.STRING(100), defaultValue: 'internal' },
  uploadedBy: { type: DataTypes.UUID, allowNull: true }
}, {
  tableName: 'documents',
  paranoid: true
});
```


### 4.3 Data Flow Example: Document Upload

```
1. User uploads document via frontend
   ↓
2. POST /api/documents (Route)
   ↓
3. documentController.uploadDocument (Controller)
   - Extracts req.body data
   - Creates UploadDocumentDTO
   ↓
4. UploadDocumentDTO.validate() (DTO)
   - Validates title, format, classification
   - Returns errors if invalid
   ↓
5. documentService.uploadDocument(uploadDTO) (Service)
   - Generates file hash
   - Checks for duplicates
   - Calls repository
   - Logs action
   ↓
6. documentRepository.create(data) (Repository)
   - Executes database INSERT
   ↓
7. Document.create() (Sequelize Model)
   - Inserts into PostgreSQL
   ↓
8. Response returned to frontend
   - { message: 'Success', document: {...} }
```

### 4.4 Benefits of 5-Tier Architecture

| Benefit | Description |
|---------|-------------|
| **Separation of Concerns** | Each layer has a single responsibility |
| **Reusability** | Services can be called from multiple controllers |
| **Testability** | Each layer can be tested independently |
| **Maintainability** | Clear structure makes code easier to update |
| **Scalability** | Easy to add new features without affecting existing code |
| **Security** | Centralized validation and authorization |
| **Performance** | Repository layer can add caching later |
| **Documentation** | Self-documenting through DTOs and Services |

---

## 5. TECHNOLOGY STACK

### 5.1 Frontend Technologies

#### React 18
**Purpose:** User interface framework
**Features:**
- Component-based architecture
- Virtual DOM for performance
- Hooks for state management
- React Router for navigation

#### Tailwind CSS
**Purpose:** Utility-first CSS framework
**Features:**
- Rapid UI development
- Responsive design
- Dark mode support
- Custom color schemes

#### Zustand
**Purpose:** State management
**Features:**
- Lightweight (1KB)
- Simple API
- No boilerplate
- TypeScript support

#### Axios
**Purpose:** HTTP client
**Features:**
- Promise-based
- Request/response interceptors
- Automatic JSON transformation
- Error handling


### 5.2 Backend Technologies

#### Node.js
**Purpose:** JavaScript runtime
**Version:** 18+
**Features:**
- Event-driven architecture
- Non-blocking I/O
- NPM ecosystem
- High performance

#### Express.js
**Purpose:** Web application framework
**Features:**
- Middleware support
- Routing
- HTTP utilities
- Template engines

#### PostgreSQL
**Purpose:** Relational database
**Version:** 14+
**Features:**
- ACID compliance
- JSON support (JSONB)
- Full-text search
- Advanced indexing

#### Sequelize ORM
**Purpose:** Object-Relational Mapping
**Features:**
- Model definitions
- Migrations
- Associations
- Query building

### 5.3 Security Technologies

#### JWT (jsonwebtoken)
**Purpose:** Authentication tokens
**Features:**
- Stateless authentication
- Token expiration
- Payload encryption
- Signature verification

#### bcryptjs
**Purpose:** Password hashing
**Features:**
- Salt generation
- Adaptive hashing
- Brute-force protection
- Industry standard

#### Helmet
**Purpose:** HTTP security headers
**Features:**
- XSS protection
- Content Security Policy
- HSTS
- Frame options

#### express-rate-limit
**Purpose:** Rate limiting
**Configuration:**
- Auth endpoints: 20 requests/15 minutes
- API endpoints: 200 requests/15 minutes
- Prevents brute-force attacks

### 5.4 Document Processing Technologies

#### pdf-parse
**Purpose:** PDF text extraction
**Features:**
- Metadata extraction
- Text content parsing
- Page-by-page processing
- No external dependencies

#### mammoth
**Purpose:** DOCX text extraction
**Features:**
- Convert DOCX to HTML/text
- Style preservation
- Table support
- Image extraction

#### PDFKit
**Purpose:** PDF generation
**Features:**
- Report generation
- Custom layouts
- Charts and graphics
- Streaming support


### 5.5 Email and Communication

#### Nodemailer
**Purpose:** Email delivery
**Features:**
- SMTP support
- OTP delivery
- HTML emails
- Attachment support

### 5.6 Optional AI Enhancement

#### OpenAI GPT (Optional)
**Purpose:** Natural language processing
**Model:** GPT-3.5-turbo or GPT-4
**Features:**
- Document summarization
- Enhanced field extraction
- Natural language audit reports
- Works fully without API key (rule-based fallback)

### 5.7 Development Tools

#### Nodemon
**Purpose:** Development server
**Features:**
- Auto-restart on file changes
- Watch specific directories
- Delay restart
- Custom scripts

#### CRACO
**Purpose:** Create React App Configuration Override
**Features:**
- Tailwind CSS integration
- Custom webpack config
- PostCSS plugins
- Build optimization

---

## 6. SYSTEM MODULES

The system consists of **13 functional modules**, each responsible for specific business capabilities.

### 6.1 Module 1: Authentication & User Management

**Purpose:** Secure user authentication and role-based access control

**Features:**
- User registration with email verification
- Email OTP two-factor authentication (2FA)
- JWT session management
- Password strength enforcement
- Account lockout after 5 failed attempts (30-minute lockout)
- Password reset via email
- Role-based permissions (4 roles)

**User Roles:**
1. **Administrator** - Full system access, user management, all reports
2. **Auditor** - Run audits, generate all report types, view everything
3. **Document Manager** - Upload, manage documents, compliance reports
4. **Viewer** - Read-only access, daily/policy reports only

**API Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns userId for OTP)
- `POST /api/auth/verify-otp` - Verify OTP to complete login
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/request-password-reset` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/setup-mfa` - MFA setup
- `POST /api/auth/verify-mfa` - MFA verification

**Security Features:**
- bcrypt password hashing (10 rounds)
- JWT tokens with 24-hour expiration
- Account lockout mechanism
- Audit trail for all auth events
- IP address logging
- Session management


### 6.2 Module 2: Dashboard & Metrics

**Purpose:** Real-time system overview and compliance metrics

**Features:**
- Compliance score overview (0-100)
- Risk distribution (high/medium/low)
- Recent activity feed
- Document statistics by department
- Document statistics by category
- Audit trend analysis (30/90/365 days)
- System health monitoring
- Notifications and alerts

**Dashboard Widgets:**
1. **Compliance Score Card** - Overall system compliance score
2. **Risk Distribution Chart** - Pie chart of risk levels
3. **Recent Activity Timeline** - Last 20 actions
4. **Documents by Department** - Bar chart
5. **Documents by Category** - Donut chart
6. **Audit Trend Graph** - Line chart over time
7. **Quick Actions** - Upload, Analyze, Generate Report
8. **Notifications Panel** - Unread alerts

**API Endpoints:**
- `GET /api/dashboard` - Dashboard overview
- `GET /api/dashboard/metrics` - Detailed metrics
- `GET /api/dashboard/audit-trend` - Trend analysis
- `GET /api/dashboard/compliance-overview` - Compliance summary
- `GET /api/dashboard/system-health` - System status
- `GET /api/dashboard/notifications` - User notifications

### 6.3 Module 3: Document Management

**Purpose:** Complete document lifecycle management

**Features:**
- Drag-and-drop upload (PDF, DOCX, XLSX, images)
- Inline document viewer (PDF rendering, image display)
- Auto metadata extraction (title, date, author, department)
- Document categorization (contract, invoice, policy, bill, compliance, report, memo)
- Version control with change history
- Document sharing with permission levels
- Access logs and audit trail
- Bulk upload support
- Document search and filtering
- Document download with watermarking

**Document Categories:**
- Financial (invoices, receipts, financial reports)
- Legal (contracts, agreements, legal documents)
- Technical (specifications, manuals, technical reports)
- Administrative (memos, policies, procedures)
- Compliance (audit reports, compliance certificates)
- Other (miscellaneous documents)

**Classification Levels:**
- Public - No restrictions
- Internal - Internal use only
- Confidential - Restricted access
- Restricted - Senior management only
- Top Secret - C-level executives only

**API Endpoints:**
- `GET /api/documents` - List documents (with filters)
- `POST /api/documents` - Upload document
- `GET /api/documents/:id` - Get document details
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/download` - Download document
- `POST /api/documents/:id/share` - Share document
- `GET /api/documents/:id/access-logs` - Access history
- `POST /api/documents/bulk/upload` - Bulk upload


### 6.4 Module 4: AI Document Analysis

**Purpose:** Automated document analysis and compliance checking

**AI Analysis Engine:** Rule-based v4 with optional OpenAI GPT enhancement

**Analysis Capabilities:**

#### 1. Document Type Detection
Automatically identifies document type:
- Invoice
- Purchase Order
- Shipment/Bill of Lading (BOL)
- Contract
- Policy
- Receipt
- Memo
- General

#### 2. Field Extraction
Extracts required fields based on document type:

**Invoice Fields:**
- Invoice number
- Invoice date
- Vendor name
- Total amount
- Payment terms
- Bill to
- Authorized by

**Shipment Fields:**
- BOL number
- Shipper
- Consignee
- Carrier
- Weight
- Pickup date
- Delivery date
- Authorized by

**Contract Fields:**
- Contract number
- Parties
- Effective date
- Expiry date
- Contract value
- Authorized by

#### 3. Signature Analysis
- Detects signer name, title, signing date
- Identifies signature type (digital/wet ink/typed)
- Flags missing or placeholder signatures
- Validates authorization

#### 4. Stamp/Seal Detection
- Identifies official seals and notarization
- Checks for required stamps on legal documents
- Validates stamp authenticity indicators

#### 5. Organization Extraction
- Finds company names and legal entities
- Identifies primary organization
- Extracts multiple organizations from contracts

#### 6. Financial Analysis
- Extracts amounts and currency (USD/AED/EUR/GBP)
- Detects VAT/tax presence
- Identifies discounts and deductions
- Validates subtotal vs total calculations
- Flags high-value transactions requiring approval

#### 7. Date Validation
- Checks pickup vs delivery date order
- Validates effective vs expiry dates
- Detects expired documents
- Identifies suspicious far-future dates
- Flags documents older than 10 years


#### 8. Forgery Detection
Detects authenticity issues:
- AI-generated content indicators
- Template placeholder text
- Unfilled form fields
- Forgery-related terminology
- Excessive text repetition
- Mixed date format inconsistencies

#### 9. Fraud Pattern Detection
Identifies 6 fraud patterns:
1. **Duplicate Invoice Numbers** - Same invoice number appears multiple times
2. **Round Number Fraud** - 3+ amounts that are multiples of 1000
3. **Weight Discrepancy** - Weight values differ by >15% in same document
4. **PII Exposure** - SSN, credit card, passport numbers detected
5. **Amount Mismatch** - Total less than subtotal by >10%
6. **Missing Tax** - Invoice >$5,000 with no tax information

#### 10. Policy Compliance Checking
Checks 15 SIFCO AE policies:

**Policy Rules:**
- **P1:** Invoice must reference BOL/shipment number
- **P2:** Payment terms must be stated
- **P3:** Department/cost center must be assigned
- **P4:** Transactions >$10,000 require dual authorization
- **P5:** Invoices >$10,000 must include VAT/tax
- **P6:** Transactions >$100,000 require board approval
- **S1:** Hazardous goods require HAZMAT declaration
- **S2:** Shipments >$1,000 require cargo insurance

**Analysis Output:**
```json
{
  "document_type": "invoice",
  "compliance_score": 85,
  "risk_level": "medium",
  "missing_fields": ["payment_terms", "authorized_by"],
  "violations": ["Invoice missing reference to BOL (Policy P1)"],
  "inconsistencies": ["Delivery date before pickup date"],
  "fraud_flags": [
    {
      "id": "round_number_fraud",
      "message": "3+ round-number amounts detected",
      "severity": "medium"
    }
  ],
  "recommendations": [
    "Add payment terms to invoice",
    "Obtain authorized signature",
    "Reference BOL number"
  ],
  "document_inspection": {
    "signature": {
      "present": false,
      "issues": ["No authorized signature found"]
    },
    "financials": {
      "totalAmount": 15000,
      "currency": "USD",
      "taxPresent": true
    },
    "dates": {
      "dates": ["2026-04-15", "2026-04-20"],
      "issues": []
    }
  }
}
```

**API Endpoints:**
- `POST /api/analysis/:id/analyze` - Run AI audit on document
- `GET /api/analysis/:id/insights` - Get analysis results
- `POST /api/analysis/bulk/analyze` - Bulk analyze documents
- `GET /api/analysis/:id/status` - Check analysis status
- `POST /api/analysis/:id/cancel` - Cancel analysis
- `POST /api/analysis/ocr/process` - Perform OCR
- `POST /api/analysis/:id/corrections` - Apply manual corrections


### 6.5 Module 5: Compliance & Policy Management

**Purpose:** Manage compliance policies and check document compliance

**Features:**
- Policy creation and management
- Regulatory framework mapping (GDPR, ISO27001, etc.)
- Compliance checking against multiple policies
- Violation tracking and reporting
- Exception request workflow
- Bulk compliance checking
- Compliance monitoring dashboard

**Policy Types:**
- Organizational - Internal company policies
- Regulatory - Government/industry regulations
- Departmental - Department-specific rules
- Project-specific - Project-based requirements

**Compliance Check Process:**
1. Select document(s)
2. Select policy/policies to check
3. Run compliance check
4. Review results (score, violations, recommendations)
5. Request exceptions if needed
6. Generate compliance report

**API Endpoints:**
- `GET /api/compliance/policies` - List policies
- `POST /api/compliance/policies` - Create policy
- `PUT /api/compliance/policies/:id` - Update policy
- `DELETE /api/compliance/policies/:id` - Delete policy
- `POST /api/compliance/check` - Check compliance
- `GET /api/compliance/reports` - Get compliance reports
- `GET /api/compliance/violations/:id` - Violation details
- `POST /api/compliance/exceptions/request` - Request exception
- `POST /api/compliance/check/bulk` - Bulk compliance check

### 6.6 Module 6: Audit Reporting

**Purpose:** Generate comprehensive audit reports with activity timelines

**7 Report Types:**

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


**Report Features:**
- **Activity Log** - "Who did what" timeline in every report
- **Export Formats** - PDF (formatted with compliance score bar) or Excel/CSV
- **Report Archive** - Status tracking (draft, published, archived)
- **Scheduling** - Daily, weekly, monthly automated reports
- **Distribution** - Email delivery to stakeholders
- **Role-Based Access** - Different report types for different roles

**Report Structure:**
```
1. EXECUTIVE SUMMARY
   - Period covered
   - Documents processed
   - Overall compliance score

2. DOCUMENT ACTIVITY
   - Total documents uploaded
   - AI analyses performed
   - Compliance checks run
   - Pass rate

3. COMPLIANCE SCORE
   - Overall score (0-100)
   - Score distribution
   - Compliance status

4. RISK ASSESSMENT
   - High/medium/low risk breakdown
   - Action required items

5. DOCUMENT-BY-DOCUMENT FINDINGS
   - Per-document scores
   - Violations
   - Missing fields

6. KEY VIOLATIONS
   - Policy violations
   - Missing required fields
   - Fraud flags

7. RECOMMENDATIONS
   - Actionable steps
   - Priority assignments

8. CONCLUSION
   - Summary
   - Next steps

9. ACTIVITY LOG
   - Who uploaded what
   - Who ran audits
   - Timestamps
```

**API Endpoints:**
- `POST /api/audits/reports` - Generate audit report
- `GET /api/audits/reports` - List reports
- `GET /api/audits/reports/:id` - Get report details
- `GET /api/audits/reports/:id/export` - Export PDF or CSV
- `POST /api/audits/reports/schedule` - Schedule report
- `POST /api/audits/reports/:id/distribute` - Distribute report
- `POST /api/audits/reports/:id/archive` - Archive report

### 6.7 Module 7: Workflow & Task Management

**Purpose:** Automate document approval workflows and task assignment

**Features:**
- Multi-step workflow creation
- Task assignment and tracking
- Status pipeline (Pending → In Review → Flagged → Approved)
- Comment threads per document
- Due dates and reminders
- Task escalation
- Task reassignment
- Workflow templates

**Workflow Types:**
- Review - Document review workflow
- Approval - Multi-level approval
- Release - Document release process
- Custom - User-defined workflows


**Workflow Steps:**
- Step number
- Step name
- Action type (review, approve, sign, verify)
- Assigned roles
- Required approvals
- Timeout (days)
- Escalation rules

**Task Properties:**
- Document reference
- Workflow reference
- Assigned to (user)
- Status (pending, in_progress, completed, rejected)
- Priority (low, medium, high, critical)
- Due date
- Comments
- Attachments

**API Endpoints:**
- `POST /api/workflows` - Create workflow
- `GET /api/workflows` - List workflows
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/tasks/assign` - Assign task
- `GET /api/workflows/tasks/queue` - Get task queue
- `POST /api/workflows/tasks/:id/complete` - Complete task
- `POST /api/workflows/tasks/:id/reassign` - Reassign task
- `POST /api/workflows/tasks/:id/escalate` - Escalate task

### 6.8 Module 8: Version Control & History

**Purpose:** Track document changes and maintain version history

**Features:**
- Automatic version creation on update
- Version comparison (diff)
- Rollback to previous versions
- Change history with timestamps
- User attribution for changes
- Version comments
- Major/minor version numbering

**Version Metadata:**
- Version number (1.0, 1.1, 2.0)
- Created by
- Created at
- Change summary
- File size
- File hash
- Previous version reference

**API Endpoints:**
- `GET /api/documents/:id/versions` - List versions
- `GET /api/documents/:id/versions/:versionId` - Get version
- `POST /api/documents/:id/versions/:versionId/restore` - Restore version
- `GET /api/documents/:id/versions/compare` - Compare versions

### 6.9 Module 9: Advanced Search & Discovery

**Purpose:** Powerful search capabilities across documents

**Search Types:**
- Full-text search (title, content, metadata)
- Metadata search (category, department, date range)
- Advanced search (boolean operators, field-specific)
- Saved searches
- Search history

**Search Filters:**
- Document type (PDF, DOCX, XLSX, images)
- Category (Financial, Legal, Technical, etc.)
- Department
- Date range (upload date, document date)
- Classification level
- Status (draft, approved, archived)
- Compliance score range
- Risk level

**Search Features:**
- Fuzzy matching
- Autocomplete suggestions
- Search result highlighting
- Sort by relevance, date, title
- Pagination
- Export search results

**API Endpoints:**
- `POST /api/search/search` - Basic search
- `POST /api/search/advanced` - Advanced search
- `POST /api/search/saved` - Save search
- `GET /api/search/saved` - Get saved searches
- `GET /api/search/history` - Search history
- `GET /api/search/results/:id` - Get search results
- `GET /api/search/analytics` - Search analytics


### 6.10 Module 10: Security & Classification

**Purpose:** Document security classification and access control

**5 Classification Levels:**
1. **Public** - No restrictions, can be shared externally
2. **Internal** - Internal use only, all employees
3. **Confidential** - Restricted access, specific roles
4. **Restricted** - Senior management only
5. **Top Secret** - C-level executives only

**Security Features:**
- Automatic classification based on content
- Manual classification override
- Access control per classification level
- Watermarking on download
- Audit trail for all access
- Encryption at rest
- Secure file storage

**API Endpoints:**
- `GET /api/security/classifications` - List classifications
- `PUT /api/documents/:id/classify` - Classify document
- `GET /api/security/access-matrix` - Access control matrix
- `POST /api/security/audit` - Security audit

### 6.11 Module 11: Retention & Archival

**Purpose:** Automated document retention and archival management

**Features:**
- Retention policy creation
- Automated archival based on policies
- Legal hold management
- Archive access requests
- Expiring document alerts
- Restore from archive
- Permanent deletion after retention period

**Retention Policy Types:**
- Operational - Standard business documents
- Regulatory - Compliance-required retention
- Custom - User-defined policies

**Retention Rules:**
- Retention period (days)
- Disposition action (delete, archive, review)
- Trigger (date-based, event-based)
- Exceptions (legal hold, ongoing litigation)

**Legal Hold:**
- Suspend retention policies
- Prevent deletion
- Track hold reason
- Hold end date
- Audit trail

**API Endpoints:**
- `POST /api/retention/policies` - Create retention policy
- `GET /api/retention/policies` - List policies
- `POST /api/retention/archive` - Archive document
- `GET /api/retention/archived` - List archived documents
- `POST /api/retention/restore/:id` - Restore document
- `POST /api/retention/access/request` - Request archive access
- `POST /api/retention/legal-hold` - Set legal hold
- `GET /api/retention/expiring` - Get expiring documents

### 6.12 Module 12: Audit Trail & Logging

**Purpose:** Comprehensive activity logging and audit trail

**Logged Events:**
- User authentication (login, logout, failed attempts)
- Document operations (upload, download, update, delete, share)
- AI analysis runs
- Compliance checks
- Report generation
- Workflow actions
- Policy changes
- Security events

**Log Metadata:**
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


**Audit Log Features:**
- Real-time activity timeline
- Daily breakdown by action type
- User activity reports
- Document access logs
- Security event tracking
- Anomaly detection
- Compliance-relevant flagging
- Export to CSV/Excel

**API Endpoints:**
- `GET /api/audit-logs` - Get audit logs (with filters)
- `GET /api/audit-logs/user/:userId` - User activity log
- `GET /api/audit-logs/document/:id/access` - Document access logs
- `GET /api/audit-logs/security/events` - Security events
- `GET /api/audit-logs/compliance` - Compliance log
- `GET /api/audit-logs/export` - Export audit log
- `GET /api/audit-logs/anomalies` - Detected anomalies

### 6.13 Module 13: Notifications & Alerts

**Purpose:** Real-time notifications and alerts

**Notification Types:**
- Document uploaded
- Analysis completed
- Compliance check failed
- Task assigned
- Task due soon
- Task overdue
- Report generated
- Policy violation detected
- Security alert
- System maintenance

**Notification Channels:**
- In-app notifications
- Email notifications
- Dashboard alerts
- Browser push notifications (future)

**API Endpoints:**
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications/preferences` - Update preferences

---

## 7. DATABASE DESIGN

### 7.1 Database Schema Overview

The system uses **PostgreSQL 14+** with **12 core tables** and full relationship mapping.

**Entity-Relationship Diagram:**
```
users (1) ──────< (M) documents
  │                      │
  │                      ├──< (M) document_analyses
  │                      ├──< (M) compliance_checks
  │                      └──< (M) tasks
  │
  ├──< (M) audit_logs
  ├──< (M) audit_reports
  └──< (M) tasks (assignedTo)

policies (1) ──< (M) compliance_checks

workflows (1) ──< (M) tasks
```

### 7.2 Core Tables

#### 7.2.1 users
**Purpose:** Store user accounts and authentication data

**Columns:**
- `id` (UUID, PK) - Unique user identifier
- `fullName` (VARCHAR 255) - User's full name
- `email` (VARCHAR 255, UNIQUE) - Email address
- `phone` (VARCHAR 20) - Phone number
- `employeeId` (VARCHAR 50, UNIQUE) - Employee ID
- `role` (VARCHAR 50) - User role (auditor, document_manager, administrator, viewer)
- `approvalStatus` (VARCHAR 30) - Account approval status (pending, approved, rejected)
- `approvedBy` (UUID, FK) - Admin who approved account
- `approvedAt` (TIMESTAMP) - Approval timestamp
- `department` (VARCHAR 100) - User's department
- `passwordHash` (VARCHAR 255) - Hashed password
- `passwordStrength` (VARCHAR 20) - Password strength indicator
- `mfaEnabled` (BOOLEAN) - MFA enabled flag
- `mfaSecret` (VARCHAR 255) - MFA secret key
- `otpCode` (VARCHAR 10) - Current OTP code
- `otpExpiry` (TIMESTAMP) - OTP expiration time
- `otpPurpose` (VARCHAR 30) - OTP purpose (login, verify_email, reset_password)
- `emailVerified` (BOOLEAN) - Email verification status
- `emailVerificationToken` (VARCHAR 255) - Email verification token
- `passwordResetToken` (VARCHAR 255) - Password reset token
- `passwordResetTokenExpiry` (TIMESTAMP) - Reset token expiration
- `loginAttempts` (INTEGER) - Failed login count
- `lockUntil` (TIMESTAMP) - Account lock expiration
- `isActive` (BOOLEAN) - Account active status
- `lastLogin` (TIMESTAMP) - Last login timestamp
- `createdAt` (TIMESTAMP) - Account creation time
- `updatedAt` (TIMESTAMP) - Last update time
- `deletedAt` (TIMESTAMP) - Soft delete timestamp

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE (email)
- UNIQUE (employeeId)
- INDEX (role)
- INDEX (department)

