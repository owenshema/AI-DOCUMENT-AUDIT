# DocAudit AI — Five-Tier Architecture Diagram

System architecture for the AI-Powered Audit Document platform, showing tier separation and labelled data flow.

---

## Five-Tier Architecture (with Data Flow)

```mermaid
flowchart TB
    subgraph T1["TIER 1 — Presentation Tier"]
        direction LR
        REACT["React 18 SPA<br/>─────────────<br/>React Router · Zustand · Axios<br/>Tailwind CSS · Protected Routes<br/>Port 3000"]
    end

    subgraph T2["TIER 2 — Application Tier"]
        direction LR
        EXPRESS["Express.js REST API<br/>─────────────<br/>Routes · Controllers · Middleware<br/>JWT Auth · Multer Upload<br/>Port 4000 · /api/*"]
    end

    subgraph T3["TIER 3 — Service Tier"]
        direction LR
        AI["AI Engine<br/>aiService.js<br/>sifcoMlTrainingService"]
        COMPLIANCE["Compliance<br/>complianceService.js<br/>auditRules.js"]
        FRAUD["Fraud Detection<br/>forgeryDetectionService.js<br/>Python ONNX pipeline"]
        AUDIT["Audit<br/>auditService.js<br/>auditScoreService.js<br/>reportBuilderService.js"]
    end

    subgraph T4["TIER 4 — Data Access Tier"]
        direction LR
        DTO["DTO Layer<br/>─────────────<br/>Input validation & mapping<br/>authDTO · documentDTO · analysisDTO"]
        SEQUELIZE["Sequelize ORM<br/>─────────────<br/>Repositories · Models<br/>Query builders · Transactions"]
    end

    subgraph T5["TIER 5 — Persistence Tier"]
        direction LR
        PG["PostgreSQL 14<br/>─────────────<br/>Database: AIDOCUMENT_DB<br/>Users · Documents · Analyses<br/>AuditReports · Workflows"]
    end

    %% Downstream request flow (top → bottom)
    REACT -->|"① HTTP REST requests<br/>(JSON + JWT Bearer token)"| EXPRESS
    EXPRESS -->|"② Route to controller →<br/>invoke service method"| AI
    EXPRESS -->|"② Route to controller →<br/>invoke service method"| COMPLIANCE
    EXPRESS -->|"② Route to controller →<br/>invoke service method"| FRAUD
    EXPRESS -->|"② Route to controller →<br/>invoke service method"| AUDIT

    AI -->|"③ Business result →<br/>persist via repository"| DTO
    COMPLIANCE -->|"③ Business result →<br/>persist via repository"| DTO
    FRAUD -->|"③ Business result →<br/>persist via repository"| DTO
    AUDIT -->|"③ Business result →<br/>persist via repository"| DTO

    DTO -->|"④ Validated entity objects<br/>passed to ORM layer"| SEQUELIZE
    SEQUELIZE -->|"⑤ SQL queries<br/>(SELECT · INSERT · UPDATE · DELETE)"| PG

    %% Upstream response flow (bottom → top)
    PG -->|"⑥ Query result sets<br/>(rows / recordsets)"| SEQUELIZE
    SEQUELIZE -->|"⑦ Mapped model instances<br/>& DTO responses"| DTO
    DTO -->|"⑧ Structured data<br/>returned to services"| AI
    DTO -->|"⑧ Structured data<br/>returned to services"| COMPLIANCE
    DTO -->|"⑧ Structured data<br/>returned to services"| FRAUD
    DTO -->|"⑧ Structured data<br/>returned to services"| AUDIT

    AI -->|"⑨ JSON payload<br/>(scores, reports, status)"| EXPRESS
    COMPLIANCE -->|"⑨ JSON payload<br/>(scores, reports, status)"| EXPRESS
    FRAUD -->|"⑨ JSON payload<br/>(scores, reports, status)"| EXPRESS
    AUDIT -->|"⑨ JSON payload<br/>(scores, reports, status)"| EXPRESS

    EXPRESS -->|"⑩ HTTP 200/4xx response<br/>(JSON to client)"| REACT

    %% Styling
    classDef tier1 fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
    classDef tier2 fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d
    classDef tier3 fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f
    classDef tier4 fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#581c87
    classDef tier5 fill:#fce7f3,stroke:#db2777,stroke-width:2px,color:#831843

    class REACT tier1
    class EXPRESS tier2
    class AI,COMPLIANCE,FRAUD,AUDIT tier3
    class DTO,SEQUELIZE tier4
    class PG tier5
```

---

## Tier Summary

| Tier | Name | Technology | Responsibility |
|------|------|------------|----------------|
| **1** | Presentation | React 18 | UI, routing, client state, API calls |
| **2** | Application | Express.js REST API | HTTP handling, auth middleware, request routing |
| **3** | Service | AI Engine · Compliance · Fraud Detection · Audit | Business logic, document analysis, scoring |
| **4** | Data Access | Sequelize ORM / DTO | Validation, entity mapping, repository pattern |
| **5** | Persistence | PostgreSQL 14 | Durable storage of users, documents, analyses, reports |

---

## Labelled Data Flow (Arrow Key)

| # | Direction | Label | Description |
|---|-----------|-------|-------------|
| ① | Presentation → Application | HTTP REST requests (JSON + JWT) | User actions (upload, audit, login) sent as REST calls |
| ② | Application → Service | Route to controller → invoke service | Express routes dispatch to the correct service module |
| ③ | Service → Data Access | Business result → persist via repository | Services write/read through DTO-validated repositories |
| ④ | Data Access (DTO → ORM) | Validated entity objects passed to ORM | DTOs sanitize input before Sequelize operations |
| ⑤ | Data Access → Persistence | SQL queries | Sequelize generates and executes SQL against PostgreSQL |
| ⑥ | Persistence → Data Access | Query result sets | PostgreSQL returns rows to Sequelize |
| ⑦ | Data Access (ORM → DTO) | Mapped model instances & DTO responses | ORM maps rows to JS objects; DTOs shape API output |
| ⑧ | Data Access → Service | Structured data returned to services | Repositories return typed data to service layer |
| ⑨ | Service → Application | JSON payload (scores, reports, status) | Services assemble business results for the controller |
| ⑩ | Application → Presentation | HTTP 200/4xx response (JSON) | Express sends final JSON response to React client |

---

## Example: Document Audit Flow Across All Five Tiers

```
React 18          Express.js         Service Tier              Data Access           PostgreSQL 14
   │                  │                    │                         │                      │
   │ POST /analysis   │                    │                         │                      │
   │ /:id/analyze ───►│ analysisController │                         │                      │
   │                  │ .analyzeDocument() │                         │                      │
   │                  │ ──────────────────►│ aiService.auditDocument │                      │
   │                  │                    │ forgeryDetectionService │                      │
   │                  │                    │ ───────────────────────►│ analysisRepository   │
   │                  │                    │                         │ .upsert() ──────────►│
   │                  │                    │                         │                      │ INSERT/UPDATE
   │                  │                    │                         │ ◄─────────────────────│ DocumentAnalysis
   │                  │                    │ ◄───────────────────────│ mapped model         │
   │                  │ ◄──────────────────│ audit result JSON       │                      │
   │ ◄────────────────│ 200 JSON response  │                         │                      │
   │  (compliance     │                    │                         │                      │
   │   score, decision)│                   │                         │                      │
```

---

*Diagram file: `FIVE_TIER_ARCHITECTURE_DIAGRAM.md` · DocAudit AI · SIFCO AE*
