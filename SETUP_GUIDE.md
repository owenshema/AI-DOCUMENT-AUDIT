# AI-Powered Document Audit System - Setup Guide

Complete setup and deployment guide for the full-stack audit system with frontend and backend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              React Frontend (Port 3000)              │
│  - Dark Mode Support                                 │
│  - Role-Based Dashboard                             │
│  - Document Management UI                           │
│  - Responsive Design (Mobile/Tablet/Desktop)        │
└─────────────────────────────────────────────────────┘
                        ↓ ↓ ↓ (HTTPS/CORS)
┌─────────────────────────────────────────────────────┐
│          Express.js Backend API (Port 4000)          │
│  - JWT Authentication                                │
│  - Role-Based Access Control (RBAC)                 │
│  - 13 Active Modules                                │
│  - PostgreSQL Database                              │
│  - Audit Logging                                    │
│  - Compliance Management                            │
└─────────────────────────────────────────────────────┘
                        ↓ ↓ ↓ SQL
┌─────────────────────────────────────────────────────┐
│          PostgreSQL Database                         │
│  - Database: AIDOCUMENT_DB                          │
│  - User Management & Roles                          │
│  - Document Storage & Versioning                    │
│  - Audit Logs & Compliance Data                     │
└─────────────────────────────────────────────────────┘
```

## System Requirements

- **Node.js**: v16.0 or higher
- **npm**: v7.0 or higher
- **PostgreSQL**: v12 or higher
- **Internet**: For npm packages

## Quick Start (5 minutes)

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create database
createdb AIDOCUMENT_DB

# Start backend (development mode with auto-reload)
npm run dev
```

Backend will run on `http://localhost:4000`

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local if backend is on different URL
# REACT_APP_API_URL=http://localhost:4000/api

# Start frontend (development mode)
npm start
```

Frontend will open at `http://localhost:3000`

### 3. Test the System

1. **Landing Page**: http://localhost:3000
2. **Register**: Create a new account
3. **Login**: Use your credentials
4. **Dashboard**: View role-based dashboard

## User Roles & Permissions

### 1. Administrator
```
✓ Full system access
✓ Manage all users
✓ System settings
✓ View all audit logs
✓ Create and manage policies
✓ Administrator panel
```

**API Access**:
- All endpoints
- `/api/admin/*`
- `/api/audit-logs` (full access)

### 2. Auditor
```
✓ Create and run audits
✓ Generate compliance reports
✓ View all documents (read-only)
✓ Access compliance dashboard
✓ Create compliance checks
✗ Cannot delete or modify documents
✗ Cannot manage users
```

**API Access**:
- `/api/documents` (GET)
- `/api/compliance/*`
- `/api/audits/*`
- `/api/audit-logs` (limited)

### 3. Document Manager
```
✓ Upload and manage documents
✓ Organize documents by category
✓ Set retention policies
✓ Create workflows
✓ View team documents
✗ Cannot run audits
✗ Cannot delete other users' documents
✗ Cannot access compliance dashboard
```

**API Access**:
- `/api/documents` (full CRUD)
- `/api/workflows/*`
- `/api/retention/*`
- `/api/search`

### 4. Viewer
```
✓ View documents
✓ View reports
✓ Read-only access to all resources
✗ Cannot upload documents
✗ Cannot modify anything
✗ Cannot access admin functions
```

**API Access**:
- `/api/documents` (GET only)
- `/api/dashboard` (limited)

## Environment Configuration

### Backend (.env)
```
# Server
PORT=4000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=AIDOCUMENT_DB
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h

# File Upload
MAX_UPLOAD_SIZE=50mb
UPLOAD_DIR=./uploads

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password

# Security
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```
# API Configuration
REACT_APP_API_URL=http://localhost:4000/api

# Optional
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0
```

## API Endpoints by Role

### Public Endpoints (No Authentication)
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/verify-email
POST   /api/auth/reset-password
GET    /api/status                    (Health check)
```

### Authenticated Endpoints (All Roles)
```
GET    /api/documents                 (with role-based filtering)
GET    /api/documents/:id
GET    /api/documents/:id/download
POST   /api/documents                 (Document Manager+)
PUT    /api/documents/:id             (Owner/Manager+)
DELETE /api/documents/:id             (Owner/Manager+)
GET    /api/search
GET    /api/dashboard
```

### Compliance (Auditor/Admin)
```
GET    /api/compliance/policies
POST   /api/compliance/policies       (Admin)
GET    /api/compliance/reports
POST   /api/compliance/check
POST   /api/compliance/check/bulk
GET    /api/compliance/violations/:id
```

### Audit & Logs (Admin/Auditor)
```
GET    /api/audits
POST   /api/audits
GET    /api/audit-logs                (Admin/Auditor)
POST   /api/audits/:id/verify
```

### Admin Only
```
GET    /api/admin/users
POST   /api/admin/users               (Create)
PUT    /api/admin/users/:id           (Update)
DELETE /api/admin/users/:id           (Delete)
GET    /api/admin/settings
PUT    /api/admin/settings
```

## JWT Token & Sessions

### Token Structure
```
Header: {
  "alg": "HS256",
  "typ": "JWT"
}

Payload: {
  "id": "user-uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "administrator",
  "department": "Finance",
  "iat": 1234567890,
  "exp": 1234654290
}

Secret: process.env.JWT_SECRET
```

### Token Management
- **Expiration**: 24 hours (configurable)
- **Storage**: Client localStorage
- **Refresh**: Re-login required (implement refresh tokens in production)
- **Validation**: Checked on every protected route

## Database Schema Highlights

### Users Table
```
id (UUID PK)
email (Unique)
passwordHash
fullName
role (ENUM: administrator, auditor, document_manager, viewer)
department
emailVerified
lastLogin
createdAt
updatedAt
```

### Documents Table
```
id (UUID PK)
title
description
fileName
fileSize
category
department
classificationLevel
status
uploadedBy (FK to Users)
uploadedAt
tags (Array)
fileHash (For duplicate detection)
ocrEnabled
```

### Audit Logs Table
```
id (UUID PK)
userId (FK to Users)
action
resourceType
resourceId
description
ipAddress
userAgent
createdAt
```

## Running Behind Firewall/Proxy

### NGINX Configuration Example
```nginx
server {
    listen 80;
    server_name audit.example.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    }
}
```

## Troubleshooting

### Frontend Won't Connect to Backend
```bash
# Check if backend is running
curl http://localhost:4000/api/status

# Check CORS configuration in backend
# Verify .env.local has correct REACT_APP_API_URL
# Check browser console for CORS errors
```

### Database Connection Error
```bash
# Verify PostgreSQL is running
psql -U postgres

# Check database exists
\l

# Create database if missing
createdb AIDOCUMENT_DB

# Check DB credentials in .env
```

### Login Loop
```bash
# Clear browser storage
# localStorage.clear()
# sessionStorage.clear()

# Check JWT_SECRET in backend .env
# Verify token is being stored correctly
```

### Port Already in Use
```bash
# Find process using port
# Windows: netstat -ano | findstr :4000
# Linux: lsof -i :4000
# Mac: lsof -i :4000

# Kill process or use different port
PORT=4001 npm run dev
```

## Production Deployment

### Environment Variables
```
# Change required in production
JWT_SECRET=<strong-random-secret>
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
DB_HOST=<production-db-host>
```

### Security Checklist
- [ ] Change all default passwords
- [ ] Enable HTTPS/TLS
- [ ] Set strong JWT_SECRET
- [ ] Configure proper CORS
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Configure firewall rules
- [ ] Set up monitoring/logging
- [ ] Regular security audits
- [ ] Two-factor authentication (optional)

### Build for Production
```bash
# Frontend
cd frontend
npm run build

# Creates optimized build in frontend/build/

# Backend
cd backend
npm start

# Serve frontend build with backend
NODE_ENV=production npm start
```

## Performance Optimization

### Frontend
- Lazy loading components
- Code splitting with React Router
- Image optimization
- CSS minification
- Caching with service workers (future)

### Backend
- Connection pooling
- Query optimization
- Caching layer (Redis - future)
- Rate limiting
- Compression middleware

### Database
- Indexed queries on frequently searched columns
- Proper relationship modeling
- Regular VACUUM maintenance
- Connection pooling

## Testing

### Manual Testing Checklist
- [ ] User registration with all roles
- [ ] Login/logout functionality
- [ ] Dark mode toggle
- [ ] Navigate between pages
- [ ] Upload documents
- [ ] Role-based access denial
- [ ] Search functionality
- [ ] Compliance checks
- [ ] Audit logging
- [ ] Responsive design (mobile/tablet)

### Automated Testing (Future)
```bash
# Frontend unit tests
npm test

# Backend API tests
npm test

# E2E tests with Cypress
npm run test:e2e
```

## Monitoring & Logging

### Backend Logging
- Request logging (method, path, status, duration)
- Error logging with stack traces
- Audit logging for all data changes
- Database query logging (development only)

### Frontend Error Handling
- API error interception
- User-friendly error messages
- Automatic retry logic
- Error boundary components

## Support & Resources

### Documentation
- [Backend API Docs](../API_DOCUMENTATION.md)
- [Architecture Design](../ARCHITECTURE_IMPLEMENTATION.md)
- [Package Structure](../FILES_CREATED_INVENTORY.md)

### Development Strategy
```
Day 1-2: Backend Setup & Testing
Day 3-4: Frontend Development
Day 5-6: Integration Testing
Day 7: Deployment & Optimization
```

## Version History

- **v1.0.0** (Current)
  - 13 Active Modules
  - PostgreSQL Integration
  - JWT Authentication
  - Role-Based Access Control
  - Audit Logging
  - React Frontend with Dark Mode

## License

MIT - See LICENSE file

---

**Last Updated**: April 2024
**Maintainer**: AI Audit System Team
**Support**: support@auditsystem.com
