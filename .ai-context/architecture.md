# Architecture: Employee Internal Transfer Digital Journey

Living system-design document. Governs system architecture, technology choices, module boundaries, persistence rules, database concurrency, security controls, and integration patterns. If this file disagrees with the code, the code wins — fix this file, don't propagate stale claims.

---

## 1. Executive Summary & Architecture Topology

The **Employee Internal Transfer Digital Journey** replaces manual, multi-team email coordination with an automated, end-to-end digital lifecycle. The system is engineered as a **Modular Monolith (Microservice Ready)**:

```text
+-----------------------------------------------------------------------------------+
|                           Client Layer (Flutter Mobile)                           |
|        Employee Portal — Material 3 Theming (Android / iOS / Tablet)              |
|        State: Riverpod 3.x (AsyncNotifier) | Routing: GoRouter | Network: Dio     |
+-----------------------------------------------------------------------------------+
                                          |
                                          | HTTPS / REST / JWT (Bearer)
                                          | X-Correlation-ID / Idempotency-Key
                                          v
+-----------------------------------------------------------------------------------+
|                 Backend Modular Monolith (Node.js NestJS — /api/v1)               |
|                                                                                   |
|  +--------------------+  +--------------------+  +--------------------+           |
|  |   Auth & RBAC      |  |  Transfer Request  |  |   Approval Inbox   |           |
|  | (JWT, Role Guards) |  | (Wizard, Validation|  | (Manager & HR Queues|          |
|  +--------------------+  +--------------------+  +--------------------+           |
|            |                       |                       |                      |
|            +-----------------------+-----------------------+                      |
|                                    |                                              |
|                                    v                                              |
|                     +-----------------------------+                               |
|                     |  Transactional Outbox Hub   |                               |
|                     +-----------------------------+                               |
|                                    |                                              |
|               +--------------------+--------------------+                         |
|               |                    |                    |                         |
|               v                    v                    v                         |
|      [Payroll Adapter]       [IT Adapter]      [Facilities Adapter]               |
|     (Mocked / Idempotent) (Mocked / Idempotent)(Mocked / Idempotent)              |
+-----------------------------------------------------------------------------------+
                  |                                           |
                  v                                           v
+-----------------------------------+     +-----------------------------------------+
|     Primary Relational Store      |     |           Cache & Session Store         |
|   PostgreSQL 16 + Prisma ORM      |     |             Redis 7 (In-Memory)         |
|  (Raw Partial Index + Row Locks)  |     |  (Rate Limiting & Queue Orchestration)  |
+-----------------------------------+     +-----------------------------------------+
```

---

## 2. Core Technology Stack & Versions

| Layer | Technology | Version | Purpose / Responsibilities |
|---|---|---|---|
| **Backend Core** | Node.js | `>=22.x LTS` | High-performance asynchronous execution runtime. |
| **Backend Framework** | NestJS | `^10.x` | Modular Monolith architecture, dependency injection, and HTTP routing. |
| **Persistence / ORM** | PostgreSQL + Prisma ORM | PostgreSQL `16.x`, Prisma `^5.x` | Relational system of record, ACID transactions, and partial index DDL. |
| **Caching / Sessions** | Redis | `7.x` | Rate limiting, distributed locking, and temporary token sessions. |
| **Mobile Client** | Flutter (Dart) | Flutter `3.x` / Dart `3.x` | Cross-platform mobile application (Android/iOS) with Material 3. |
| **State Management** | Flutter Riverpod | `^3.4.x` (`riverpod_annotation: ^4.x`) | Reactive state management, async caching, and auto-disposal. |
| **Mobile Navigation** | GoRouter | `^14.x` | Declarative routing with authentication redirect guards. |
| **Mobile HTTP** | Dio | `^5.x` | HTTP client with JWT auth, idempotency retention, and error interceptors. |
| **API Protocol** | REST / JSON | Versioned `/api/v1` | Strict API versioning; OpenAPI 3.0 / Swagger documentation. |
| **Testing** | Jest + `ts-jest` / `flutter_test` | Jest `29.x` | Backend integration, concurrency barrier tests; Flutter widget/unit tests. |

---

## 3. Layering & Module Boundaries

### 3.1 Backend Modular Monolith (NestJS)

The backend code is organized under `src/backend/` into strict, non-negotiable architectural layers:

```text
src/backend/
├── controllers/     # HTTP route handlers, OpenAPI Swagger decorators, DTO binding
├── services/        # Business logic, state machines, row-lock coordination, transactions
├── repositories/    # Database queries, Prisma Client access, raw SQL operations
├── adapters/        # Downstream fulfilment orchestrations (Payroll, IT, Facilities)
├── common/          # Cross-cutting concerns: guards, interceptors, filters, decorators
│   ├── guards/      # JwtAuthGuard, RolesGuard (RBAC)
│   ├── interceptors/# LoggingInterceptor, PiiMaskingInterceptor, OutboxInterceptor
│   └── filters/     # GlobalExceptionFilter (maps 23505/55P03 to clean 409 Conflict)
└── types/           # Domain entities, DTO interfaces, status enums
```

#### Layering Discipline & Architectural Rules
1. **Unidirectional Flow**: `controllers` $\rightarrow$ `services` $\rightarrow$ `repositories`. Repositories NEVER call services; services NEVER access HTTP request/response objects.
2. **Domain Isolation**: Sibling domain modules (e.g. `transfer-request` vs `approval`) interact via public service contracts, never by directly invoking each other's database repositories.
3. **Transactional Boundaries**: Transactions (`prisma.$transaction`) are managed exclusively in the `services/` layer to guarantee ACID atomicity across state updates, audit logging, and outbox creation.

---

### 3.2 Mobile Client Architecture (Flutter + Riverpod 3.x)

The Flutter mobile application follows **Feature-First Clean Architecture**:

```text
src/frontend/lib/
├── app/                  # Application bootstrap, MaterialApp.router, global themes
│   ├── app.dart
│   ├── router.dart       # Declarative GoRouter configuration with auth redirection
│   └── theme.dart        # Material 3 dynamic color scheme, typography, and shape tokens
├── core/                 # Cross-feature infrastructure, network, local storage, security
│   ├── network/          # Dio HTTP client, interceptors (Auth, Idempotency, Error)
│   ├── storage/          # flutter_secure_storage for encrypted JWT token retention
│   ├── errors/           # Failure and AppException domain definitions
│   └── utils/            # Timezone utilities (UTC <-> Asia/Kolkata), UUID v4 generators
├── features/             # Vertical domain slices (Presentation, Domain, Data)
│   ├── auth/             # Login, session refresh, user identity provider
│   ├── transfer_form/    # Transfer request wizard (client validation D03-D07, idempotency session)
│   ├── transfer_tracker/ # Request journey timeline, status badges, details view
│   └── approval_inbox/   # Manager and HR queues, action modals (Approve, Reject, Reassign)
└── shared/               # Shared reusable widgets (status badges, buttons, loading skeletons)
```

#### State Management Strategy (Riverpod 3.x)
- **`@riverpod` Code Generation**: Standardizes on code-generated notifiers (`riverpod_generator`) for compile-time safety and auto-disposal.
- **Form Idempotency Session (BRD D07, D43; Spec API01)**:
  - Opening the Transfer Form initializes a client-side **UUID v4 `Idempotency-Key`** within `transferFormControllerProvider`.
  - The key is retained across validation errors, network retries, and button double-clicks during that session.
  - A brand-new key is generated only when a fresh form is opened after submission completion.
- **Auto-Invalidation**: `ref.invalidate()` refreshes dependent providers (`activeTransferProvider`, `approvalQueueProvider`) on state mutations.

---

## 4. Data Persistence & Concurrency Engine

### 4.1 Single-Active-Request Protocol (BRD-001.D07, D35, D68)

An employee may have **at most one active transfer request** at any given moment.

- **Active Set (Exact)**: `Submitted`, `PendingManagerApproval`, `PendingHRValidation`, `PendingFulfilment`, `FulfilmentFailed`, `Scheduled`.
- **Non-Active Non-Terminal**: `CancellationPending` (unwinding downstream items; does not block new submissions per D68).
- **Terminal Statuses**: `Completed`, `RejectedByManager`, `RejectedByHR`, `Withdrawn`, `Cancelled`.

```text
+------------------------------------------------------------------------------------+
|                         CONCURRENCY DEFENSE PIPELINE                               |
+------------------------------------------------------------------------------------+
|  1. Layer 1 (Database Backstop): Partial Unique Index                              |
|     ux_transfer_request_one_active_per_employee                                    |
|     WHERE status IN ('Submitted','PendingManagerApproval','PendingHRValidation',   |
|                      'PendingFulfilment','FulfilmentFailed','Scheduled')           |
|     -> Fails second active insert with SQLSTATE 23505 -> HTTP 409 Conflict         |
|                                                                                    |
|  2. Layer 2 (Row-Lock Ordering): Employee Lock (D68 Ordering)                      |
|     SELECT 1 FROM "Employee" WHERE "id" = $1 FOR UPDATE (Lock Timeout: 5s)         |
|     -> Serializes concurrent submission vs cancellation vs HR approval             |
|     -> Enforces D68: Refuses HR approve (API06) if prior is CancellationPending   |
+------------------------------------------------------------------------------------+
```

### 4.2 Optimistic Concurrency Control (BRD-001.D43)
Every record in `TransferRequest` contains an integer `version` field. Every update statement executes `WHERE id = :id AND version = :expectedVersion` and increments `version = version + 1`. If the row count is 0, the transaction throws `409 Conflict: This request has already been updated. Please refresh.`

---

## 5. Submission Idempotency & Replay Engine (BRD-001.D43, Spec API01)

All state-changing submission calls (`POST /api/v1/transfers`) require an `Idempotency-Key: <UUID-v4>` header.

```sql
CREATE TABLE "SubmissionIdempotency" (
    "employeeId"        UUID        NOT NULL,
    "operation"         TEXT        NOT NULL,   -- 'CreateTransfer'
    "idempotencyKey"    UUID        NOT NULL,
    "payloadHash"       CHAR(64)    NOT NULL,   -- SHA-256 hex of canonical payload
    "transferRequestId" UUID        NOT NULL REFERENCES "TransferRequest"("id"),
    "responseStatus"    SMALLINT    NOT NULL,
    "responseBody"      JSONB       NOT NULL,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"         TIMESTAMPTZ NOT NULL,   -- createdAt + 24 hours
    CONSTRAINT "SubmissionIdempotency_pkey" PRIMARY KEY ("employeeId", "operation", "idempotencyKey")
);
CREATE INDEX ix_submission_idempotency_expires ON "SubmissionIdempotency" ("expiresAt");
```

### Idempotency Execution Lifecycle
1. **Fingerprint**: Computes SHA-256 hash of the canonical request body (keys sorted alphabetically, strings trimmed, missing reason stored as `null`).
2. **Atomic Reserve**: Executes `INSERT ... ON CONFLICT DO NOTHING` on `SubmissionIdempotency`.
3. **Collision Handling**:
   - If key exists: Acquires row lock (`SELECT ... FOR UPDATE`, 5 s timeout).
   - If `payloadHash` matches: Replays cached `responseBody` with header `Idempotent-Replayed: true` (HTTP 201).
   - If `payloadHash` differs: Immediately rejects with HTTP `422 IDEMPOTENCY_KEY_REUSED`.
4. **Retention & Expiration**: Valid for 24 hours. A scheduled cron (`0 0 * * *` Asia/Kolkata) purges expired records.

---

## 6. Downstream Fulfilment & Transactional Outbox Pattern (BRD D53–D57, D69)

Fulfilment coordination with Payroll, IT, and Facilities systems uses the **Transactional Outbox Pattern**:

```sql
CREATE TABLE "FulfilmentOutbox" (
    "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
    "transferRequestId" UUID        NOT NULL REFERENCES "TransferRequest"("id"),
    "targetSystem"      TEXT        NOT NULL,   -- 'PAYROLL', 'IT', 'FACILITIES'
    "operation"         TEXT        NOT NULL,   -- 'DISPATCH', 'AMEND', 'UNWIND'
    "payload"           JSONB       NOT NULL,
    "status"            TEXT        NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
    "retryCount"        INTEGER     NOT NULL DEFAULT 0,
    "nextRetryAt"       TIMESTAMPTZ,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FulfilmentOutbox_pkey" PRIMARY KEY ("id")
);
```

1. **Transactional Insertion**: Outbox records and fulfilment item rows are created inside the exact same database transaction as the HR Approval transition (`API06`). If the approval transaction rolls back, nothing is written to the outbox.
2. **Asynchronous Dispatcher**: A background poller reads committed `PENDING` rows, dispatches to the corresponding adapter, and updates status to `COMPLETED` on success.
3. **Adapter Idempotency (D69)**: Every dispatch passes an adapter idempotency key (`transferRequestId + targetSystem + operation`). Re-deliveries return the previously committed adapter outcome without duplicate side-effects.
4. **Callback Authentication (D57)**: External callback webhooks (`POST /api/v1/callbacks/:system`) require HMAC SHA-256 signature verification via header `X-Signature-SHA256` matching the system secret.

---

## 7. Tamper-Evident Audit Trail & Immutability (BRD-001.D64)

Compliance mandates a cryptographically verifiable, append-only audit trail:

```sql
CREATE TABLE "AuditTrail" (
    "id"                BIGSERIAL   PRIMARY KEY,
    "entityName"        TEXT        NOT NULL,   -- 'TransferRequest'
    "entityId"          UUID        NOT NULL,
    "action"            TEXT        NOT NULL,   -- 'SUBMIT', 'APPROVE', 'CANCEL', etc.
    "actorId"           UUID        NOT NULL,
    "actorRole"         TEXT        NOT NULL,
    "payloadDiff"       JSONB       NOT NULL,
    "previousHash"      CHAR(64)    NOT NULL,
    "currentHash"       CHAR(64)    NOT NULL,   -- SHA-256(previousHash + entityId + action + payloadDiff + createdAt)
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Database-Level Protection (D64)
- **Engine-Level Revocation**: The application's database role is granted `INSERT` and `SELECT` privileges only on `AuditTrail`.
- `UPDATE`, `DELETE`, and `TRUNCATE` privileges are strictly **REVOKED** at the PostgreSQL engine level to prevent historical tampering, even by an application administrator account.

---

## 8. Security Posture, RBAC & Server-Side Filtering (BRD-001.D65)

- **JWT Token Architecture**:
  - Stateless Access Tokens: 15-minute TTL, signed with RSA-256 / HS-256.
  - Refresh Tokens: 7-day TTL, stored in `httpOnly` secure, SameSite cookies.
  - Token claims contain: `sub` (employeeId), `email`, `roles` (`EMPLOYEE`, `MANAGER`, `HR`, `PAYROLL`, `IT`, `FACILITIES`).
- **Caller Identity Authority**: The caller's identity is derived strictly from the verified JWT payload (`req.user.employeeId`). Any `employeeId` passed in client HTTP request bodies is ignored.
- **Server-Side Field Filtering by Role (D65)**:
  - Repositories and serialization interceptors filter response fields based on caller role:
    - `Employee`: Can view own requests, general progress timeline, and public rejection reasons; cannot view internal HR validation notes or candidate approver rankings.
    - `Manager`: Views department details, direct reports' requests, and manager approval history.
    - `HR`: Full visibility across all compliance fields, approval candidates, outbox records, and audit chains.

---

## 9. Scheduler, Timezones & SLA Mechanics (BRD-001.D31, D60, D62)

- **Universal Storage in UTC**: All timestamps in PostgreSQL are stored with timezone (`TIMESTAMPTZ`), normalized strictly to UTC.
- **Business Cutoff Timezone (`Asia/Kolkata`)**:
  - Effective date transitions (D60, D61, D62) and daily idempotency purges are governed by midnight in Indian Standard Time (`Asia/Kolkata`, `UTC+05:30`).
  - Scheduled cron: `0 0 * * *` configured with `{ timeZone: 'Asia/Kolkata' }`.
- **SLA Countdown (D30)**: SLA countdowns (e.g. 5 business days for Manager, 3 business days for HR) pause while an earlier request is in `CancellationPending` and resume automatically upon reaching `Cancelled`.

---

## 10. Observability, Resiliency & Production Operations

### 10.1 Production Performance Baselines (Constitution)
| Tier | Latency Target (p95) | Scope |
|---|---|---|
| **Tier 1 (Critical)** | **`< 300 ms`** | Auth verification, session refresh, status lookups |
| **Tier 2 (Standard CRUD)** | **`< 500 ms`** | API01 submission, API06 approval, queue pagination |
| **Tier 3 (Batch / Reports)**| **`< 2.0 s`** | Audit trail queries, daily cutoffs, outbox dispatching |
- **Availability Target**: 99.5% uptime baseline.

### 10.2 Observability & Telemetry
- **Distributed Tracing**: Incoming requests generate a UUID v4 `X-Correlation-ID` header (or accept existing from API Gateway), propagated across all backend services, database transactions, outbox records, and log lines.
- **Structured JSON Logging**: Centralized logging using Pino/Winston with log levels (`INFO`, `WARN`, `ERROR`).
- **PII Masking**: Custom logger interceptor automatically sanitizes sensitive fields (`name`, `email`, `phone`, `accountNumber`) before emitting to stdout.
- **Health Checks & Liveness Probes**: Implemented via `@nestjs/terminus`:
  - `GET /health/live`: Container liveness check.
  - `GET /health/ready`: Validates active PostgreSQL connection pool and Redis ping.

### 10.3 Resiliency & Connection Pooling
- **PostgreSQL Connection Pool**: Sized per container instance (default: `min: 5`, `max: 20`, idle timeout: `10000 ms`).
- **Graceful Shutdown**: Intercepts `SIGTERM` / `SIGINT` to allow active HTTP requests and ongoing database transactions up to 15 seconds to complete before closing connection pools.

---

## 11. Current Project Directory Structure

```text
.
├── .agent/                  # INT Control Plane workflows and skills
├── .ai-context/             # Persistent Memory, Status Board, Specs, Plans, Tasks
│   ├── plans/               # Feature implementation plans
│   ├── pr_reviews/          # Gate 0, Gate 1, and Gate 2 review records
│   ├── specs/               # Feature specifications (internal-transfer-journey.spec.md)
│   ├── tasks/               # Executable task breakdowns
│   ├── test_cases/          # Acceptance test case specifications
│   ├── architecture.md      # This authoritative living system-design document
│   ├── constitution.md      # Project governing standards & thresholds
│   ├── dashboard.html       # Visual Gate review board
│   └── status.md            # Authoritative project lifecycle status board
├── prisma/                  # Database schema & migrations
│   ├── migrations/          # Hand-crafted raw SQL migrations & indexes
│   └── schema.prisma        # Prisma ORM data models
├── src/
│   ├── backend/             # Node.js NestJS Modular Monolith
│   │   ├── services/        # Domain business logic (SubmissionService, ApprovalService)
│   │   ├── types.ts         # Backend domain models and DTO interfaces
│   │   └── index.ts         # Backend entry point
│   └── frontend/            # Flutter Mobile Application
│       ├── lib/
│       │   ├── app/         # App bootstrap, GoRouter, Material 3 theming
│       │   ├── core/        # Dio network client, interceptors, secure storage
│       │   ├── features/    # Vertical slices: transfer_form, transfer_tracker, approval_inbox
│       │   └── shared/      # Shared reusable UI widgets
│       └── pubspec.yaml     # Flutter dependencies (flutter_riverpod, go_router, dio)
├── tests/
│   ├── backend/
│   │   ├── helpers/         # Test utilities (Barrier synchronization for concurrency tests)
│   │   └── integration/     # Jest integration test suites (IT-01 to IT-08)
│   └── frontend/            # Flutter widget, provider, and golden tests
├── jest.config.js           # Jest configuration for TypeScript integration tests
├── package.json             # Root npm dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```
