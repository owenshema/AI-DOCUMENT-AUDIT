# Full Stack Setup & Integration Guide

Quick visual guide for understanding the full system integration.

## System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                     USER BROWSER / CLIENT                          │
└────────────────────────────────────────────────────────────────────┘
                               ↓ HTTP/HTTPS
┌────────────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (Port 3000)                      │
│  ├── Navigation.jsx (Header with Dark Mode)                       │
│  ├── HomePage.jsx (Landing Page)                                  │
│  ├── LoginPage.jsx / RegisterPage.jsx (Auth)                      │
│  ├── DashboardPage.jsx (Main Dashboard)                           │
│  ├── store/authStore.js (Zustand State Management)                │
│  └── api/client.js (Axios with JWT Interceptors)                  │
│                                                                    │
│  Role-Based UI:                                                    │
│  - Administrator: Admin Panel, User Management                    │
│  - Auditor: Compliance Dashboard, Audit Reports                  │
│  - Document Manager: Upload, Workflows, Retention                │
│  - Viewer: Read-Only Access                                       │
└────────────────────────────────────────────────────────────────────┘
                          ↓ API Requests (CORS)
                   Authorization: Bearer {JWT}
                          ↓ Response (JSON)
┌────────────────────────────────────────────────────────────────────┐
│                   EXPRESS BACKEND API (Port 4000)                  │
├────────────────────────────────────────────────────────────────────┤
│  Authentication Layer                                              │
│  ├── authMiddleware.js (JWT Verification)                         │
│  ├── rbacMiddleware.js (Role-Based Access Control) ← ENHANCED     │
│  ├── errorMiddleware.js (Error Handling)                          │
│  └── loggingMiddleware.js (Request Logging)                       │
├────────────────────────────────────────────────────────────────────┤
│  13 Active Modules                                                 │
│  ├── 1. Auth (Register, Login, JWT)                              │
│  ├── 2. Documents (CRUD, Upload, Download)                       │
│  ├── 3. Analysis (AI Document Analysis)                          │
│  ├── 4. Compliance (Policy Checks, Reports)                      │
│  ├── 5. Audit (Audit Reports, Trails)                            │
│  ├── 6. Workflows (Task Management)                              │
│  ├── 7. Tasks (Task Tracking)                                    │
│  ├── 8. Search (Full-Text Search)                                │
│  ├── 9. Retention (Data Retention Policies)                      │
│  ├── 10. Dashboard (Statistics & Metrics)                        │
│  ├── 11. Security (Security Features)                            │
│  ├── 12. Version Control (Document Versioning)                   │
│  └── 13. Audit Logs (Activity Logs)                              │
├────────────────────────────────────────────────────────────────────┤
│  Controllers (Handle Requests)                                     │
│  └── authController, documentController, complianceController...  │
├────────────────────────────────────────────────────────────────────┤
│  Services (Business Logic)                                         │
│  └── authService, documentService, complianceService...           │
├────────────────────────────────────────────────────────────────────┤
│  Repositories (Data Access)                                        │
│  └── userRepository, documentRepository, complianceRepository...  │
├────────────────────────────────────────────────────────────────────┤
│  Data Transfer Objects (DTOs - Validation)                         │
│  └── RegisterRequestDTO, LoginRequestDTO, DocumentDTO...          │
└────────────────────────────────────────────────────────────────────┘
                          ↓ PostgreSQL Driver
┌────────────────────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE (Port 5432)                       │
│  Database: AIDOCUMENT_DB                                           │
├────────────────────────────────────────────────────────────────────┤
│  Tables                                                            │
│  ├── Users (with ENUM role: admin|auditor|doc_manager|viewer)     │
│  ├── Documents (with soft delete, versioning support)             │
│  ├── DocumentVersions (history & rollback)                        │
│  ├── AuditLogs (all actions tracked)                              │
│  ├── ComplianceChecks (policy compliance)                         │
│  ├── Workflows (task workflows)                                   │
│  ├── Tasks (workflow tasks)                                       │
│  ├── RetentionPolicies (data retention)                           │
│  ├── Searches (search history)                                    │
│  └── ... (15+ tables total)                                       │
└────────────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### 1. User Login Flow

```
Browser
  ↓ POST /api/auth/login {email, password}
Backend Auth Middleware
  ✓ No token required - public endpoint
Backend Auth Controller
  ↓ Delegates to authService
Auth Service
  • Hash password verification
  • Generate JWT token
  • Log login attempt
Database: Users table
  ← Fetch user record
  ← Verify password
Service returns {token, user}
  ↓ Response with JWT
Browser
  • Stores token in localStorage
  • Stores user data in Zustand
  • Sets Authorization header for future requests
```

### 2. Protected API Request (Upload Document)

```
Browser
  ↓ POST /api/documents
  Header: "Authorization: Bearer {JWT_TOKEN}"
  Body: {title, category, file...}

Backend
  ↓ authMiddleware.js
  • Extracts token from header
  • Verifies JWT signature
  • Decodes token -> req.user = {id, email, role}
  ✓ If valid, continue
  ✗ If expired/invalid, return 401

  ↓ documentController.uploadDocument()
  • req.user.id from decoded token
  • req.user.role determines permissions

  ↓ rbacMiddleware (verifyRolePermissions)
  • Checks if user.role can upload (document_manager+)
  ✓ If allowed, continue
  ✗ If not allowed, return 403 Forbidden

  ↓ documentService.uploadDocument()
  • Business logic
  • Validation with DTOs
  • Duplicate detection
  • Audit logging

  ↓ documentRepository.create()
  • Database INSERT
  • PostgreSQL stores document

Service returns result
  ↓ Response {message, document}
Browser
  • Receives response
  • Updates UI with new document
```

### 3. Role-Based Access Denied

```
Browser (User with role: viewer)
  ↓ DELETE /api/documents/123
  Header: "Authorization: Bearer {viewer_token}"

Backend
  ↓ authMiddleware ✓ (token valid)
  ↓ rbacMiddleware (verifyRolePermissions(['document_manager', 'administrator']))
  
  req.user.role = 'viewer'
  Allowed roles = ['document_manager', 'administrator']
  
  'viewer' NOT IN allowed roles
  
  ✗ Return 403 Forbidden
  {
    error: "Insufficient permissions",
    required: ["document_manager", "administrator"],
    userRole: "viewer"
  }

Browser
  • Shows error message to user
  • User cannot delete document
```

## API Response Patterns

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2024-04-16T10:30:00Z"
}
```

### Error Response
```json
{
  "error": "Error message",
  "status": 400,
  "details": { ... },
  "timestamp": "2024-04-16T10:30:00Z"
}
```

### Authentication Error (401)
```json
{
  "error": "Token expired",
  "status": 401,
  "message": "Please login again"
}
```

### Authorization Error (403)
```json
{
  "error": "Insufficient permissions",
  "status": 403,
  "required": ["administrator", "auditor"],
  "userRole": "viewer"
}
```

## Frontend to Backend Request Examples

### Request 1: List Documents
```javascript
// Frontend
const docs = await documentAPI.getAll({
  page: 1,
  limit: 10,
  category: 'Financial'
});

// HTTP Request
GET /api/documents?page=1&limit=10&category=Financial
Authorization: Bearer eyJhbGc...

// Backend Processing
authMiddleware ✓
documentController.getAllDocuments()
  ├─ Apply role-based filters
  ├─ Apply pagination
  └─ Query database
```

### Request 2: Create Audit (Auditor Only)
```javascript
// Frontend
const audit = await auditAPI.create({
  title: 'Q1 Financial Review',
  scope: 'Financial Documents',
  startDate: '2024-01-01'
});

// HTTP Request
POST /api/audits
Authorization: Bearer {auditor_token}
Content-Type: application/json
{
  "title": "Q1 Financial Review",
  "scope": "Financial Documents",
  "startDate": "2024-01-01"
}

// Backend Processing
authMiddleware ✓
rbacMiddleware: role='auditor' ✓ (allowed)
auditController.createAudit()
  ├─ Validate with AuditDTO
  ├─ Log action to auditLogs table
  ├─ Save to database
  └─ Return audit ID
```

### Request 3: Admin User Management
```javascript
// Frontend
const users = await adminAPI.getUsers();

// HTTP Request
GET /api/admin/users
Authorization: Bearer {admin_token}

// Backend Processing
authMiddleware ✓
rbacMiddleware: role='administrator' ✓
adminController.getUsers()
  ├─ Fetch all users (no filtering)
  ├─ Include role, department, lastLogin
  └─ Return user list

// Response
[
  {
    id: "uuid-1",
    fullName: "John Admin",
    email: "admin@example.com",
    role: "administrator",
    department: "IT",
    lastLogin: "2024-04-16T10:00:00Z"
  },
  ...
]
```

## Token Lifecycle

```
❶ User Logs In
  ↓ POST /auth/login
  ↓ Backend creates JWT with payload:
  {
    id: user.id,
    email: user.email,
    role: user.role,
    iat: current_time,
    exp: current_time + 24hours
  }
  ↓ Backend returns token to frontend

❷ Frontend Stores Token
  localStorage.setItem('token', token)
  Zustand store: setToken(token)

❸ Frontend Makes Authenticated Request
  ↓ Axios interceptor adds token
  Headers: { Authorization: `Bearer ${token}` }

❹ Backend Verifies Token
  ↓ Extract token from header
  ↓ Verify JWT signature (using JWT_SECRET)
  ↓ Check expiration: if (exp < now) return 401
  ↓ Decode token to get user data
  ↓ Continue processing request

❺ Token Expires (24 hours later)
  ↓ Frontend makes request with expired token
  ↓ Backend: jwt.verify() throws TokenExpiredError
  ↓ Backend returns 401 Unauthorized
  ↓ Axios interceptor catches 401
  ↓ Frontend redirects to /login
  ↓ User must login again to get new token
```

## Environment Variable Mapping

```
Frontend (.env.local)
  REACT_APP_API_URL ──→ Used in axios baseURL
  REACT_APP_ENV ──────→ Controls logging/features

Backend (.env)
  PORT ────────────────→ Server port (4000)
  JWT_SECRET ──────────→ Used to sign/verify tokens
  DB_HOST ─────────────→ PostgreSQL host
  DB_NAME ─────────────→ Database name (AIDOCUMENT_DB)
  NODE_ENV ────────────→ development/production mode
  CORS_ORIGIN ─────────→ Allowed frontend URL (http://localhost:3000)
```

## Deployment Checklist

- [ ] Both services run without errors
- [ ] Frontend connects to backend API
- [ ] Login/Register works with valid credentials
- [ ] Login fails with invalid credentials
- [ ] JWT token is stored and sent with requests
- [ ] Role-based access is enforced
- [ ] Dark mode toggle works
- [ ] Responsive design on mobile/tablet
- [ ] Database CRUD operations work
- [ ] Audit logs are created
- [ ] Error messages display correctly
- [ ] Token expiration redirects to login

## Performance Metrics

### Target Metrics
- Page load time: < 3 seconds
- API response time: < 500ms
- JWT verification: < 5ms
- Database query: < 100ms

### Optimization Tips
1. Enable gzip compression on backend
2. Use database connection pooling
3. Implement caching for frequently accessed data
4. Lazy load components in React
5. Optimize database queries with proper indexes
6. Use CDN for static assets in production
