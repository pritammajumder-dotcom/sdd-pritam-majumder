# Tasks: Employee Internal Transfer Digital Journey

## Derived From
.ai-context/plans/internal-transfer-journey.plan.md

## Scope Boundary
> **D71 Item 1 Approved Scope (Sequencing Steps 1 to 3)**
> - Database schema migration, partial index, submission idempotency table.
> - Integration test suite (IT-01 to IT-08) under TDD (Real PostgreSQL).
> - API01 submission service with idempotency store & employee row lock.
> - API06 HR approval check with D68 cancellation pending lock & outbox.
> 
> *Note: D71 items 2 to 7 remain blocked until defined in plan.md and approved at Gate 1.*

## Sequence
- [x] internal-transfer-journey.T01 — Create PostgreSQL schema migrations for TransferRequest enum, partial unique index `ux_transfer_request_one_active_per_employee`, and `SubmissionIdempotency` table — Acceptance: AC-N50, AC-N52
- [x] internal-transfer-journey.T02 — Implement TDD integration tests IT-07 and IT-08 for partial unique index constraints (Red phase) — Acceptance: AC-N50, AC-N52
- [x] internal-transfer-journey.T03 — Implement TDD integration tests IT-01 to IT-06 for concurrency, idempotency, and D68 lock protocol under barrier testing (Red phase) — Acceptance: AC-N40, AC-N41, AC-N42, AC-N50, AC-N53, AC-N54, AC-P29
- [x] internal-transfer-journey.T04 — Implement SubmissionIdempotency repository, SHA-256 fingerprinting, replay, and conflict handling (Green phase) — Acceptance: AC-N39, AC-N40, AC-N41, AC-N42
- [x] internal-transfer-journey.T05 — Implement API01 TransferRequest creation service with employee row lock (`SELECT FOR UPDATE`), active set check, and BlockedByPriorCancellation flag (Green phase) — Acceptance: AC-P01, AC-P22, AC-N03, AC-N50, AC-N52, AC-N53
- [x] internal-transfer-journey.T06 — Implement API06 HR approval validation against D68 CancellationPending conflict and transaction outbox insertion (Green phase) — Acceptance: AC-P06, AC-P29, AC-N54
- [x] internal-transfer-journey.T07 — Run integration test suite (IT-01 to IT-08) and verify all tests pass green — Acceptance: IT-01, IT-02, IT-03, IT-04, IT-05, IT-06, IT-07, IT-08
