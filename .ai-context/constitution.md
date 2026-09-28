# Project Constitution — Employee Internal Transfer Digital Journey

**Owner:** Subhajit Mukherjee · **Adopted:** 2026-09-28 · **Version:** v1.0

Governs every feature this repository will ever build. Written once, amended rarely, and amended only through the same review rigour as a spec. Each spec operates inside this document and never restates it.

Standard in force: **INT Engineering Guidelines — Specification-Driven Delivery (SDD) v1.0**

> **Provisional & Open Values Note:** Lines marked `[Provisional]` are derived from initial baseline configurations and require confirmation from the TL. Lines marked `[Open]` require decision approval before specs depending on them can proceed.

---

## Governance & Roles

| Role | Person | Email | Responsibility |
|---|---|---|---|
| Technical Lead / Architect | Subhajit Mukherjee | subhajit.mukherjee@intglobal.com | Owns this constitution; default Gate 2 code reviewer; technical concurrence at Gate 1 |
| Senior Software Engineer | Pritam Majumder | pritam.majumder@intglobal.com | Default Spec Author for feature and retro-specs |
| Project Manager | Shamik Bhattacharya | shamik.bhattacharya@intglobal.com | Owns BRD entries and product-side sign-off; default Gate 1 reviewer |

### Core Governance Rules:
- **Author ≠ Reviewer**: Gate 1 reviewer is never the spec author (Default: SSE authors → PM reviews).
- **Technical Concurrence**: Gate 1 requires recorded TL technical concurrence whenever a spec touches Security Posture or Architectural Constraints.
- **Reviewer Split**: Gate 1 = Intent / Scope / BRD-traceability review (PM); Gate 2 = Technical evidence & code review (TL).
- **Gate 1 SLA**: Same working day for specs with ≤ 5 ACs; 48 hours maximum.

### INT Amendments to SDD v1.0:
1. **Granular Chain**: BRD/SRS → Spec → Plan → Tasks.
2. **First Quality Gate**: Spec Review (Gate 1) is mandatory before coding begins.
3. **Slugs & Identifiers**: Mandatory sub-identifiers for specs, plans, tasks, test cases, and branches.
4. **Status Board**: Maintained for every item in `.ai-context/status.md`.
5. **Traceable Artifacts**: Releases (`.ai-context/releases/`), hotfixes (`.ai-context/hotfixes/`), and change requests (`.ai-context/change_requests/`).

---

## Testing Discipline

- Test-first (TDD RED ➔ GREEN) is mandatory for every API endpoint and state-changing operation.
- **Framework & Location**: Tests live in `tests/frontend/` (Flutter) or `tests/backend/` (NestJS).
- **Coverage Floors (Measured on Changed Files Only)**:
  | Tier | Floor | Domain Contexts |
  |---|---|---|
  | **Critical** (auth, payment, security, financial) | **80%** | `auth`, `rbac`, `payments`, `audit`, `wallets` |
  | **Business** (core domain & revenue logic) | **70%** | `users`, `modules`, `domain-entities`, `services`, `transfers` |
  | **Utility** (reference data, presentation, read-only) | **60%** | `content`, `lookup`, `analytics`, `helpers`, `master-data` |
- **Verification Commands**: `npm run lint` / `flutter analyze` (zero warnings), `npm run typecheck`, and `npm test` / `flutter test` must pass before any task is complete.

---

## Security Posture

- **Authentication Strategy**: JWT
- **No PII in Logs**: PII (names, phone numbers, emails, addresses, IDs) must be masked.
- **OTP Protection**: OTP codes are NEVER logged; stored hashed in DB; TTL 5m, max 3 attempts, 15m lockout, 30s cooldown.
- **Secrets Management**: Supplied via environment variables (`.env`) and Zod/ConfigModule-validated at boot. `.env` is never committed.
- **JWT Architecture**: Distinct secrets for access tokens (15m), refresh tokens (httpOnly cookie, 7d), and signed URLs. Bcrypt cost 12.
- **Admin & Audit Rules**: Admin accounts created via super-admin tooling only; all admin writes call audit service.
- **Idempotency & Rate Limiting**: State-changing mutations require `Idempotency-Key`; rate-limit decision mandatory per endpoint.
- **Hardening**: HTTPS only, `helmet`, CORS allowlist, dependency SAST/DAST vetting.

---

## Architectural Constraints

- **Architecture Style**: Modular Monolith (Microservice Ready)
- **Database & ORM**: PostgreSQL + Prisma
- **Backend Technology**: Node.js NestJS
- **Frontend / Mobile**: Flutter (Dart) + Material 3
- **Deployment**: Docker (backend) + Flutter build (APK/IPA)
- **Approved Datastores**: Primary system of record (PostgreSQL) + Cache/Session (Redis). New datastore requires ADR.
- **Modular Monolith Default**: Single process for local dev; no new microservice without approved ADR.
- **Non-Negotiable Layering**: Business logic in `services/`, HTTP mapping in `controllers/`, DB access in `repositories/`.
- **Database Migrations**: Schema changes via migrations only (no raw `db push` on shared environments).

---

## Non-Functional Baselines

- **p95 API Latency Targets**:
  | Tier | Target | Scope |
  |---|---|---|
  | **Tier 1 (Critical)** | **< 300 ms** | Auth, session refresh, core reads |
  | **Tier 2 (Standard CRUD)** | **< 500 ms** | Entity CRUD, workflow updates (Transfers) |
  | **Tier 3 (Heavy / Reports)** | **< 2 s** | Analytics, exports, bulk ops, background jobs |
- **Availability Target**: 99.5% baseline.
- **Role-based Access Control (RBAC)**: Must strictly enforce visibility and actions across Employee, Manager, HR, Payroll, IT, and Facilities roles.

---

## Versioning Rules

- **API Path Versioning**: Mounted under `/api/v1`. Breaking changes require a new path version (`/api/v2`) and ADR.
- **OpenAPI Contract**: Swagger/OpenAPI doc updated in the same task as endpoint changes.
- **Semver Tagging**: Releases documented in `.ai-context/releases/RELEASE-vX.Y.Z.md`.

---

## Repository & Branching

- **Branch Naming**: `feature/<slug>`, `fix/<slug>`, `hotfix/<slug>`.
- **Merge Strategy**: PR squash-merge into `Dev` / `main`. Title format: `[<slug>] <summary>`.
- **Commit Messages**: `Implements <slug>.T01` (Traceability ID mandatory, no AI attribution).
