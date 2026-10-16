# Test Cases: Employee Internal Transfer Digital Journey

## Derived From Spec
.ai-context/specs/internal-transfer-journey.spec.md (v1.1)

## Acceptance Test Scenarios (D71 Item 1 Scope)

### internal-transfer-journey.TC-IT01 — 10 Parallel Submissions with Same Idempotency Key
- **Maps to AC:** internal-transfer-journey.AC-N41, AC-N03
- **Test ID:** IT-01
- **Given:** An employee with no prior active transfer request.
- **When:** 10 parallel API01 calls are submitted simultaneously with identical `Idempotency-Key` and identical payload.
- **Then:** Exactly 1 row is created in `TransferRequest`, 1 row in `SubmissionIdempotency`, all 10 responses return identical HTTP 201 with identical request ID.
- **Automated Test File:** tests/backend/integration/idempotency_concurrency.spec.ts

### internal-transfer-journey.TC-IT02 — 10 Parallel Submissions with Different Idempotency Keys
- **Maps to AC:** internal-transfer-journey.AC-N42, AC-N03
- **Test ID:** IT-02
- **Given:** An employee with no prior active transfer request.
- **When:** 10 parallel API01 calls are submitted simultaneously with different `Idempotency-Key` headers.
- **Then:** Exactly one request succeeds with HTTP 201, exactly nine requests fail with HTTP 409 conflict, zero HTTP 500 errors occur, and exactly 1 active row exists in `TransferRequest`.
- **Automated Test File:** tests/backend/integration/concurrency_active_set.spec.ts

### internal-transfer-journey.TC-IT03 — 2 Parallel Submissions with Same Key and Conflicting Payloads
- **Maps to AC:** internal-transfer-journey.AC-N40
- **Test ID:** IT-03
- **Given:** An employee initiates two parallel requests with the same `Idempotency-Key` but different payload bodies.
- **When:** Both requests are processed.
- **Then:** Exactly one request succeeds with HTTP 201, the other request receives HTTP 422 `IDEMPOTENCY_KEY_REUSED`, and only 1 row exists in `TransferRequest`.
- **Automated Test File:** tests/backend/integration/idempotency_conflict.spec.ts

### internal-transfer-journey.TC-IT04 — Submission While Prior Request is CancellationPending
- **Maps to AC:** internal-transfer-journey.AC-N50
- **Test ID:** IT-04
- **Given:** An employee has an existing transfer request in `CancellationPending` status.
- **When:** 10 parallel API01 submissions are made with different idempotency keys.
- **Then:** Exactly one submission succeeds with HTTP 201 and has the `BlockedByPriorCancellation` flag set to true; nine fail with HTTP 409; the prior request remains in `CancellationPending`.
- **Automated Test File:** tests/backend/integration/cancellation_pending_submission.spec.ts

### internal-transfer-journey.TC-IT05 — Concurrent Cancellation and New Submission
- **Maps to AC:** internal-transfer-journey.AC-N53
- **Test ID:** IT-05
- **Given:** An existing transfer request is undergoing transition T14 (entering `CancellationPending`).
- **When:** A new submission is triggered concurrently under employee row lock.
- **Then:** Result is either HTTP 409 (if executed before T14 commits) or HTTP 201 with `BlockedByPriorCancellation` flag set (if executed after T14 commits); never two unflagged or duplicate active rows.
- **Automated Test File:** tests/backend/integration/concurrency_cancellation_race.spec.ts

### internal-transfer-journey.TC-IT06 — Concurrent Cancellation Resolution and HR Approval
- **Maps to AC:** internal-transfer-journey.AC-N54, AC-P29
- **Test ID:** IT-06
- **Given:** A prior request is in `CancellationPending` (T17 unwinding) and a new request is awaiting HR approval (API06).
- **When:** HR approval is attempted concurrently with T17 completion.
- **Then:** HR approval is either refused with D68 error code while unwinding is in progress, or succeeds strictly after T17 commits and clears the lock; approval never succeeds while prior request is `CancellationPending`.
- **Automated Test File:** tests/backend/integration/hr_approval_d68_lock.spec.ts

### internal-transfer-journey.TC-IT07 — Database Direct INSERT Second Active Row Rejected
- **Maps to AC:** internal-transfer-journey.AC-N52
- **Test ID:** IT-07
- **Given:** A database row in `TransferRequest` exists in an active status (`Submitted`, `PendingManagerApproval`, `PendingHRValidation`, `PendingFulfilment`, `FulfilmentFailed`, `Scheduled`).
- **When:** A direct SQL `INSERT` is executed attempting to insert a second active row for the same `employeeId`.
- **Then:** PostgreSQL rejects the insert with SQLSTATE `23505` violating `ux_transfer_request_one_active_per_employee`.
- **Automated Test File:** tests/backend/integration/partial_index_active_set.spec.ts

### internal-transfer-journey.TC-IT08 — Database Direct INSERT Active Row when Prior is CancellationPending
- **Maps to AC:** internal-transfer-journey.AC-N50
- **Test ID:** IT-08
- **Given:** A database row in `TransferRequest` exists in `CancellationPending` status for an employee.
- **When:** A direct SQL `INSERT` is executed inserting an active status row for the same `employeeId`.
- **Then:** PostgreSQL accepts the insert because `CancellationPending` is excluded from the partial index predicate.
- **Automated Test File:** tests/backend/integration/partial_index_cancellation_pending.spec.ts
