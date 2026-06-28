-- =============================================================================
-- SIFCO DocAudit AI — PostgreSQL Database Schema
-- Database: AIDOCUMENT_DB (default)
-- ORM: Sequelize 6 | Dialect: PostgreSQL 14+
-- Generated from backend/db/models/*
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. USERS — Authentication & role-based access
-- Roles: client | document_manager | auditor | administrator
-- =============================================================================

CREATE TABLE users (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name                   VARCHAR(255) NOT NULL,
    email                       VARCHAR(255) NOT NULL UNIQUE,
    phone                       VARCHAR(20),
    employee_id                 VARCHAR(50) UNIQUE,
    role                        VARCHAR(50) NOT NULL DEFAULT 'client'
                                CHECK (role IN ('auditor', 'document_manager', 'administrator', 'client')),
    approval_status             VARCHAR(30) NOT NULL DEFAULT 'approved'
                                CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by                 UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at                 TIMESTAMPTZ,
    department                  VARCHAR(100) NOT NULL,
    password_hash               VARCHAR(255) NOT NULL,
    password_strength           VARCHAR(20),
    mfa_enabled                 BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret                  VARCHAR(255),
    otp_code                    VARCHAR(10),
    otp_expiry                  TIMESTAMPTZ,
    otp_purpose                 VARCHAR(30),  -- login | verify_email | reset_password
    email_verified              BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token    VARCHAR(255),
    password_reset_token        VARCHAR(255),
    password_reset_token_expiry TIMESTAMPTZ,
    login_attempts                INTEGER NOT NULL DEFAULT 0,
    lock_until                  TIMESTAMPTZ,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    last_login                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_approval_status ON users(approval_status);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- =============================================================================
-- 2. DOCUMENTS — Document hub & cargo workflow
-- Workflow state is stored in metadata (JSONB) — see metadata keys below
-- =============================================================================

CREATE TABLE documents (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                 VARCHAR(255) NOT NULL,
    description           TEXT,
    file_name             VARCHAR(255) NOT NULL,
    file_path             VARCHAR(500) NOT NULL,
    file_size             BIGINT,
    file_format           VARCHAR(100) NOT NULL DEFAULT 'PDF',
    mime_type             VARCHAR(100),
    category              VARCHAR(100) NOT NULL,
    status                VARCHAR(100) DEFAULT 'draft',
    department            VARCHAR(100) NOT NULL,
    project               VARCHAR(255),
    tags                  VARCHAR(255)[] DEFAULT '{}',
    classification_level  VARCHAR(100) DEFAULT 'internal',
    retention_days        INTEGER DEFAULT 365,
    uploaded_by           UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at           TIMESTAMPTZ DEFAULT NOW(),
    last_modified_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    last_modified_at      TIMESTAMPTZ,
    expiry_date           TIMESTAMPTZ,
    is_archived           BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at           TIMESTAMPTZ,
    is_duplicate          BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_of          UUID REFERENCES documents(id) ON DELETE SET NULL,
    ocr_processed         BOOLEAN NOT NULL DEFAULT FALSE,
    extracted_text        TEXT,
    metadata              JSONB DEFAULT '{}',
    archive_reason        TEXT,
    legal_hold_active     BOOLEAN NOT NULL DEFAULT FALSE,
    legal_hold_reason     TEXT,
    legal_hold_end_date   TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_metadata ON documents USING GIN (metadata);
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);

-- =============================================================================
-- 3. DOCUMENT_VERSIONS — Version history
-- =============================================================================

CREATE TABLE document_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number  INTEGER NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    file_path       VARCHAR(1024) NOT NULL,
    file_size       BIGINT NOT NULL,
    file_format     VARCHAR(100) NOT NULL,
    changed_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    change_reason   TEXT,
    change_type     VARCHAR(100) DEFAULT 'upload',
    change_details  JSONB DEFAULT '{}',
    extracted_text  TEXT,
    ocr_performed   BOOLEAN NOT NULL DEFAULT FALSE,
    checksum        VARCHAR(255),
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_version_number ON document_versions(version_number);
CREATE INDEX idx_document_versions_changed_by ON document_versions(changed_by);

-- =============================================================================
-- 4. DOCUMENT_ANALYSES — AI audit & analysis results
-- =============================================================================

CREATE TABLE document_analyses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    analysis_type   VARCHAR(100) NOT NULL DEFAULT 'compliance_audit',
    status          VARCHAR(100) DEFAULT 'pending',
    confidence      DECIMAL(3, 2),
    results         JSONB DEFAULT '{}',
    entities        JSONB DEFAULT '[]',
    keywords        JSONB DEFAULT '[]',
    summary         TEXT,
    risk_factors    JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    performed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    processing_time INTEGER,
    model           VARCHAR(100),
    model_version   VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_analyses_document_id ON document_analyses(document_id);
CREATE INDEX idx_document_analyses_analysis_type ON document_analyses(analysis_type);
CREATE INDEX idx_document_analyses_status ON document_analyses(status);
CREATE INDEX idx_document_analyses_created_at ON document_analyses(created_at);

-- =============================================================================
-- 5. POLICIES — Compliance rules
-- =============================================================================

CREATE TABLE policies (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                      VARCHAR(255) NOT NULL,
    description               TEXT,
    policy_type               VARCHAR(100) NOT NULL,
    version                   VARCHAR(20) DEFAULT '1.0',
    status                    VARCHAR(100) DEFAULT 'draft',
    department                VARCHAR(100),
    applicable_roles          VARCHAR(255)[] DEFAULT '{}',
    rules                     JSONB DEFAULT '[]',
    regulatory_frameworks     VARCHAR(255)[] DEFAULT '{}',
    applicable_document_types VARCHAR(255)[] DEFAULT '{}',
    exception_rules           JSONB DEFAULT '[]',
    effective_date            TIMESTAMPTZ NOT NULL,
    expiry_date               TIMESTAMPTZ,
    owner                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_reviewed_at          TIMESTAMPTZ,
    last_reviewed_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    next_review_due           TIMESTAMPTZ,
    created_by                UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policies_policy_type ON policies(policy_type);
CREATE INDEX idx_policies_status ON policies(status);

-- =============================================================================
-- 6. COMPLIANCE_CHECKS — Policy evaluation results per document
-- =============================================================================

CREATE TABLE compliance_checks (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id         UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    policy_id           UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    check_type          VARCHAR(100) DEFAULT 'automatic',
    status              VARCHAR(100) NOT NULL,
    compliance_score    INTEGER NOT NULL CHECK (compliance_score BETWEEN 0 AND 100),
    findings            JSONB DEFAULT '[]',
    violations          JSONB DEFAULT '{"critical":0,"high":0,"medium":0,"low":0}',
    exceptions          JSONB DEFAULT '[]',
    remediation_actions JSONB DEFAULT '[]',
    performed_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    performed_at        TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ,
    next_check_due      TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_checks_document_id ON compliance_checks(document_id);
CREATE INDEX idx_compliance_checks_policy_id ON compliance_checks(policy_id);
CREATE INDEX idx_compliance_checks_status ON compliance_checks(status);

-- =============================================================================
-- 7. AUDIT_REPORTS — Generated audit reports
-- =============================================================================

CREATE TABLE audit_reports (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type         VARCHAR(100) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    status              VARCHAR(100) DEFAULT 'draft',
    period_start        TIMESTAMPTZ NOT NULL,
    period_end          TIMESTAMPTZ NOT NULL,
    scope               JSONB DEFAULT '{}',
    findings            JSONB DEFAULT '[]',
    summary             TEXT,
    executive_summary   TEXT,
    risk_summary        JSONB DEFAULT '{}',
    recommendations     JSONB DEFAULT '[]',
    metrics             JSONB DEFAULT '{}',
    statistics          JSONB DEFAULT '{}',
    sampled_documents   JSONB DEFAULT '[]',
    compliance_score    DECIMAL(5, 2),
    created_by          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ,
    approved_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at         TIMESTAMPTZ,
    published_at        TIMESTAMPTZ,
    external_references JSONB DEFAULT '[]',
    attachments         JSONB DEFAULT '[]',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_reports_report_type ON audit_reports(report_type);
CREATE INDEX idx_audit_reports_status ON audit_reports(status);
CREATE INDEX idx_audit_reports_created_by ON audit_reports(created_by);
CREATE INDEX idx_audit_reports_period ON audit_reports(period_start, period_end);

-- =============================================================================
-- 8. WORKFLOWS — Approval / review workflow definitions
-- =============================================================================

CREATE TABLE workflows (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                      VARCHAR(255) NOT NULL,
    description               TEXT,
    workflow_type             VARCHAR(100) NOT NULL,
    status                    VARCHAR(100) DEFAULT 'draft',
    version                   VARCHAR(20) DEFAULT '1.0',
    steps                     JSONB DEFAULT '[]',
    department                VARCHAR(100),
    applicable_roles          VARCHAR(100)[] DEFAULT '{}',
    applicable_document_types VARCHAR(100)[] DEFAULT '{}',
    escalation_rules          JSONB DEFAULT '{}',
    notification_rules        JSONB DEFAULT '{}',
    sla                       JSONB DEFAULT '{}',
    created_by                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_modified_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    last_modified_at          TIMESTAMPTZ,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflows_workflow_type ON workflows(workflow_type);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_created_by ON workflows(created_by);

-- =============================================================================
-- 9. TASKS — Workflow task tracker
-- =============================================================================

CREATE TABLE tasks (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id       UUID REFERENCES documents(id) ON DELETE SET NULL,
    workflow_id       UUID REFERENCES workflows(id) ON DELETE SET NULL,
    title             VARCHAR(255) NOT NULL,
    description       TEXT,
    status            VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority          VARCHAR(20) NOT NULL DEFAULT 'medium',
    assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date          TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    comments          JSONB DEFAULT '[]',
    approval_decision VARCHAR(50),
    decision          VARCHAR(50),
    rejection_reason  TEXT,
    category          VARCHAR(100),
    created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    escalated_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_document_id ON tasks(document_id);
CREATE INDEX idx_tasks_workflow_id ON tasks(workflow_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);

-- =============================================================================
-- 10. NOTIFICATIONS — In-app & email notifications
-- =============================================================================

CREATE TABLE notifications (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type     VARCHAR(100) NOT NULL,
    channel               VARCHAR(100) DEFAULT 'in_app',
    priority              VARCHAR(100) DEFAULT 'medium',
    subject               VARCHAR(255) NOT NULL,
    message               TEXT NOT NULL,
    details               JSONB DEFAULT '{}',
    related_entity_type   VARCHAR(100) NOT NULL,
    related_entity_id     UUID,
    action_url            VARCHAR(1024),
    status                VARCHAR(100) DEFAULT 'unread',
    read_at               TIMESTAMPTZ,
    archived_at           TIMESTAMPTZ,
    sent_at               TIMESTAMPTZ,
    delivery_status       VARCHAR(100) DEFAULT 'pending',
    delivery_attempts     INTEGER DEFAULT 0,
    last_delivery_attempt TIMESTAMPTZ,
    expires_at            TIMESTAMPTZ,
    attachments           JSONB DEFAULT '[]',
    tags                  VARCHAR(255)[] DEFAULT '{}',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_notification_type ON notifications(notification_type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_recipient_status ON notifications(recipient_id, status);

-- =============================================================================
-- 11. AUDIT_LOGS — System activity trail (immutable)
-- =============================================================================

CREATE TABLE audit_logs (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
    user_role            VARCHAR(50),
    action               VARCHAR(100) NOT NULL,
    resource_type        VARCHAR(50),
    resource_id          UUID,
    status               VARCHAR(100),
    description          TEXT,
    details              JSONB,
    session_id           VARCHAR(255),
    ip_address           VARCHAR(45),
    user_agent           TEXT,
    location             JSONB,
    device               JSONB,
    performance_metrics  JSONB,
    risk_score           INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    anomalies            JSONB DEFAULT '[]',
    compliance_relevant  BOOLEAN DEFAULT FALSE,
    regulatory_framework VARCHAR(50),
    retention_expiry     TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =============================================================================
-- 12. SEARCHES — Saved & recent searches
-- =============================================================================

CREATE TABLE searches (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_name            VARCHAR(255),
    query                  TEXT,
    search_type            VARCHAR(100) DEFAULT 'document_search',
    is_quick_search        BOOLEAN DEFAULT FALSE,
    is_saved               BOOLEAN DEFAULT FALSE,
    is_public              BOOLEAN DEFAULT FALSE,
    is_default             BOOLEAN DEFAULT FALSE,
    keywords               VARCHAR(255)[] DEFAULT '{}',
    filters                JSONB DEFAULT '{}',
    search_scope           VARCHAR(100) DEFAULT 'all_documents',
    sort_by                VARCHAR(50) DEFAULT 'relevance',
    sort_order             VARCHAR(100) DEFAULT 'desc',
    page_size              INTEGER DEFAULT 20,
    result_count           INTEGER DEFAULT 0,
    search_execution_time  INTEGER,
    last_executed_at       TIMESTAMPTZ,
    execution_count        INTEGER DEFAULT 0,
    search_history         JSONB DEFAULT '[]',
    tags                   VARCHAR(255)[] DEFAULT '{}',
    sharing_settings       JSONB DEFAULT '{}',
    alerts_enabled         BOOLEAN DEFAULT FALSE,
    alert_frequency        VARCHAR(100) DEFAULT 'daily',
    alert_last_sent_at     TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_searches_user_id ON searches(user_id);
CREATE INDEX idx_searches_is_saved ON searches(is_saved);
CREATE INDEX idx_searches_last_executed_at ON searches(last_executed_at);
CREATE INDEX idx_searches_user_saved ON searches(user_id, is_saved);

-- =============================================================================
-- 13. RETENTION_POLICIES — Document retention rules
-- =============================================================================

CREATE TABLE retention_policies (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_name               VARCHAR(255) NOT NULL,
    name                      VARCHAR(255),
    description               TEXT,
    policy_type               VARCHAR(100) NOT NULL,
    retention_period          INTEGER NOT NULL,
    retention_unit            VARCHAR(100) DEFAULT 'years',
    archival_action           VARCHAR(100) DEFAULT 'archive',
    archival_location         VARCHAR(255),
    applicable_document_types VARCHAR(100)[] DEFAULT '{}',
    document_types            VARCHAR(100)[] DEFAULT '{}',
    retention_days            INTEGER,
    automation_rules          JSONB DEFAULT '{}',
    applicable_departments    VARCHAR(100)[] DEFAULT '{}',
    classification_levels     VARCHAR(50)[] DEFAULT '{}',
    regulatory_frameworks     VARCHAR(50)[] DEFAULT '{}',
    exceptions                JSONB DEFAULT '[]',
    status                    VARCHAR(100) DEFAULT 'draft',
    effective_date            TIMESTAMPTZ NOT NULL,
    expiry_date               TIMESTAMPTZ,
    auto_execution            BOOLEAN DEFAULT FALSE,
    executed_count            INTEGER DEFAULT 0,
    last_executed_at          TIMESTAMPTZ,
    next_execution_due        TIMESTAMPTZ,
    created_by                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approved_by               UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at               TIMESTAMPTZ,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_retention_policies_policy_type ON retention_policies(policy_type);
CREATE INDEX idx_retention_policies_status ON retention_policies(status);
CREATE INDEX idx_retention_policies_created_by ON retention_policies(created_by);
CREATE INDEX idx_retention_policies_effective_date ON retention_policies(effective_date);

-- =============================================================================
-- DOCUMENTS.METADATA — Key JSONB fields (cargo / audit workflow)
-- =============================================================================
/*
  Client request (no upload):
    requestOnly              BOOLEAN   true when client requested without file
    clientDocumentRequest    BOOLEAN
    requestStatus            VARCHAR   pending_manager_preparation | prepared_pending_audit
    preparedAt               TIMESTAMP
    preparedBy               UUID
    preparationNote          TEXT

  Client upload / assignment:
    clientUpload             BOOLEAN
    assignedClientIds        UUID[]
    assignedAt               TIMESTAMP
    assignedBy               UUID
    assignmentNote           TEXT
    clientReleasedAt         TIMESTAMP
    clientReleasePath        VARCHAR
    clientReleaseFileName    VARCHAR
    cargoPort / arrivalPort  VARCHAR

  Document request (Magerwa / port):
    magerwaRequested         BOOLEAN
    magerwaRequestStatus     VARCHAR   pending | fulfilled
    magerwaRequestedAt       TIMESTAMP
    magerwaRequestPort       VARCHAR
    magerwaRequestNote       TEXT

  Auditor workflow:
    managerReviewStatus      VARCHAR   needs_correction | ready_for_client | released_to_client
    returnedToManagerAt      TIMESTAMP
    auditMarkup              JSONB[]   mistake annotations
    lastAuditRequestAt       TIMESTAMP
    isUrgent                 BOOLEAN
    statusReason             TEXT
    latestAuditSummary       TEXT
    latestComplianceScore    NUMBER
    latestAuditDecision      VARCHAR

  File storage:
    storedFileName           VARCHAR
    originalName             VARCHAR
    reuploads                JSONB[]
    statusHistory            JSONB[]
*/
