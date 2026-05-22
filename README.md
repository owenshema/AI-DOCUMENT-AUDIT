# DocAudit AI — SIFCO AE Document Audit System

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js" />
  <img src="https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square&logo=postgresql" />
  <img src="https://img.shields.io/badge/AI_Engine-Rule--based_v4-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />
</div>

---

## Overview

**DocAudit AI** is an intelligent document audit and compliance management system built for **SIFCO AE**, a logistics and supply chain company. It automates document review, compliance checking, fraud detection, and audit report generation — without requiring any ML model training or GPU infrastructure.

The system supports full document lifecycle management: upload, AI analysis, compliance scoring, audit reporting, workflow tracking, and role-based access control.

---

## Features

### Document Hub
- Drag-and-drop upload (PDF, DOCX, XLSX, images)
- Inline document viewer — PDFs render in-browser, images display directly
- Auto metadata extraction (title, date, author, department)
- Version control with change history
- Document categorization: contract, invoice, policy, bill, compliance, report, memo

### AI Analysis Engine (Rule-based v4)
- Extracts real field values from document text (invoice numbers, vendor names, amounts, dates, signatures)
- Detects document type automatically: invoice, purchase order, shipment/BOL, contract, policy, receipt, memo
- **Signature analysis** — detects signer name, title, signing date, signature type (digital/wet ink/typed)
- **Stamp/seal detection** — identifies official seals and notarization
- **Organization extraction** — finds company names and legal entities
- **Financial analysis** — extracts amounts, currency (USD/AED/EUR/GBP), VAT/tax presence
- **Date validation** — checks pickup vs delivery order, effective vs expiry, expired documents
- **Forgery detection** — AI-generated content indicators, placeholder text, template fields, text repetition
- **Fraud pattern detection** — duplicate invoice numbers, round-number amounts, weight discrepancies, PII exposure, amount mismatches
- **15 SIFCO AE policy rules** checked per document
- Compliance score 0–100 with risk level (low/medium/high)
- Optional OpenAI GPT enhancement (works fully without API key)

### Audit Reports
- **7 report types** with role-based access:
  - Daily Activity Report — all roles
  - Policy Compliance Report — all roles
  - Compliance Audit — admin, auditor, document manager
  - Document Review Report — admin, auditor, document manager
  - Financial Report — admin and auditor only
  - Security Audit — admin and auditor only
  - Exception Report — admin and auditor only
- Reports include: who uploaded what, who ran audits, per-document scores, violations, recommendations
- **Activity log** — "who did what" timeline in every report
- Export as PDF (formatted with compliance score bar) or Excel/CSV
- Report archive with status tracking

### Activity Log & Audit Trail
- Real-time activity timeline: uploads, AI audits, report generation, logins
- Daily breakdown by action type
- Full audit trail stored in database
- Security event tracking

### Role-Based Access Control
- **Administrator** — full system access, user management, all reports
- **Auditor** — run audits, generate all report types, view everything
- **Document Manager** — upload, manage documents, compliance reports
- **Viewer** — read-only access, daily/policy reports only

### Authentication & Security
- Email OTP two-factor authentication (2FA) on every login
- Account lockout after failed attempts
- JWT session management
- Password strength enforcement
- Audit trail for all actions

### Workflow & Task Tracking
- Assign documents to auditors
- Status pipeline: Pending → In Review → Flagged → Approved
- Comment threads per document
- Due dates and reminders

### Additional Modules
- Compliance policy management
- Document retention policies with legal hold
- Advanced search and discovery
- Version control with diff comparison
- Security classification levels
- Dark/light theme

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Lucide Icons |
| Backend | Node.js, Express.js |
| Database | PostgreSQL + Sequelize ORM |
| AI Engine | Rule-based v4 (custom) + optional OpenAI GPT |
| PDF Export | PDFKit |
| File Parsing | pdf-parse, mammoth (DOCX) |
| Auth | JWT, bcryptjs, Nodemailer (OTP) |
| Email | Nodemailer (SMTP) |

---

## Project Structure

```
AI-DOCUMENT-AUDIT/
├── backend/
│   ├── controllers/        # Route handlers
│   ├── services/
│   │   ├── auditRules.js   # AI audit engine v4
│   │   ├── aiService.js    # OpenAI integration + report writer
│   │   ├── authService.js  # Authentication logic
│   │   └── emailService.js # OTP email delivery
│   ├── db/
│   │   ├── models/         # Sequelize models
│   │   └── initialize.js   # DB setup
│   ├── middleware/         # Auth, RBAC, logging
│   ├── routes/             # API routes
│   └── server.js           # Entry point
├── frontend/
│   ├── src/
│   │   ├── pages/          # React pages
│   │   ├── components/     # Shared components
│   │   ├── api/            # API client
│   │   └── store/          # Zustand state
│   └── public/
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/owenshema/AI-DOCUMENT-AUDIT.git
cd AI-DOCUMENT-AUDIT
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auditdoc
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com

# Optional — system works without this
OPENAI_API_KEY=your_openai_key
```

Initialize the database:
```bash
node db/initialize.js
```

Start the backend:
```bash
npm start
# or for development:
npm run dev
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:4000/api
```

Start the frontend:
```bash
npm start
```

The app will be available at `http://localhost:3000`.

---

## Default Admin Account

After running `db/initialize.js`, a default admin is seeded:

| Field | Value |
|-------|-------|
| Email | owenshema76@gmail.com |
| Password | Owen@123! |
| Role | Administrator |

> You will receive an OTP to your email on first login.

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns userId for OTP) |
| POST | `/api/auth/verify-otp` | Verify OTP to complete login |
| POST | `/api/auth/resend-otp` | Resend OTP |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List all documents |
| POST | `/api/documents` | Upload document |
| GET | `/api/documents/:id/download` | Download file |
| DELETE | `/api/documents/:id` | Delete document |

### AI Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analysis/:id/analyze` | Run AI audit on document |
| GET | `/api/analysis/:id/insights` | Get analysis results |
| POST | `/api/analysis/bulk/analyze` | Bulk analyze documents |

### Audit Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/audits/reports` | Generate audit report |
| GET | `/api/audits/reports` | List reports |
| GET | `/api/audits/reports/:id/export` | Export PDF or CSV |

### Activity Log
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit-logs` | Get audit logs |
| GET | `/api/audit-logs/activity` | Get activity timeline |

---

## AI Audit Engine

The audit engine (`backend/services/auditRules.js`) runs 15 compliance checks per document:

**Policy Rules (SIFCO AE)**
- P1: Invoice must reference BOL/shipment number
- P2: Payment terms must be stated
- P3: Department/cost center must be assigned
- P4: Transactions >$10,000 require dual authorization
- P5: Invoices >$10,000 must include VAT/tax
- P6: Transactions >$100,000 require board approval
- S1: Hazardous goods require HAZMAT declaration
- S2: Shipments >$1,000 require cargo insurance

**Fraud Detection**
- Duplicate invoice numbers
- Round-number amount patterns
- Weight discrepancy >15%
- PII exposure (SSN, credit card)
- Subtotal/total mismatch
- Missing tax on large invoices

**Authenticity Checks**
- AI-generated content indicators
- Template placeholder text
- Unfilled form fields
- Forgery-related terminology
- Excessive text repetition
- Mixed date format inconsistencies

---

## Screenshots

> Dashboard with compliance metrics, risk distribution, and recent activity

> AI Analysis page with document inspection panel showing signature, organization, financials, forgery check

> Audit Reports with activity log showing who uploaded and audited each document

> Document Hub with inline PDF viewer

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Author

**Owen Shema**  
SIFCO AE — DocAudit AI System  
[GitHub](https://github.com/owenshema)
