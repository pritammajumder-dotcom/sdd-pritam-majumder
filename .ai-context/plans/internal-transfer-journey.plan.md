# Plan: Employee Internal Transfer Digital Journey

> **Status: Draft (partial).** Created 2026-10-09 to answer Gate 1 feedback G1-06 ("document the exact constraint/index strategy in plan.md"). Only D71 item 1 and the submission idempotency store (G1-04) are defined here. **These were approved at Gate 1 on 2026-10-13** (`pr_reviews/internal-transfer-journey-G1-20261013-172245.md`). The other D71 entry conditions (items 2 to 7) are still to be written by the spec author and approved at Gate 1 before development of those areas starts.

## Derived From
.ai-context/specs/internal-transfer-journey.spec.md (v1.1)

## Architecture Approach
NestJS modular monolith with PostgreSQL via Prisma (`architecture.md`). This draft covers only the `transfer-request` module's persistence and concurrency rules for submission and HR approval. The other components are pending.

## Data Model

### D71 item 1: Single-active-request rule (D07, D35, D68)

**Active set (exact):** `Submitted`, `PendingManagerApproval`, `PendingHRValidation`, `PendingFulfilment`, `FulfilmentFailed`, `Scheduled`.
`CancellationPending` is non-terminal but **not** active, so it never blocks a new submission. Terminal statuses are never active.

**Rejected alternative:** a plain unique constraint on `(employeeId, status)`. It allows one active row per status, and if `CancellationPending` were in the active set it would refuse a submission that D68 allows.

**Layer 1: partial unique index (database backstop).** Prisma cannot express partial indexes, so this is added in a hand-written SQL migration and kept out of `schema.prisma` drift checks:
```sql
CREATE UNIQUE INDEX ux_transfer_request_one_active_per_employee
  ON "TransferRequest" ("employeeId")
  WHERE "status" IN ('Submitted','PendingManagerApproval','PendingHRValidation',
                     'PendingFulfilment','FulfilmentFailed','Scheduled');
```
`status` is a PostgreSQL enum, so a value outside D32 cannot be stored. If a new active status is ever added, this index must be recreated in the same migration. A migration test checks that the predicate equals the active set.

**Layer 2: employee row lock (D68 ordering).** The index cannot stop HR approval, so the following transactions all start with `SELECT 1 FROM "Employee" WHERE "id" = $1 FOR UPDATE`. For one employee they run one at a time. Lock timeout: 5 s.

| Operation | Work done under the lock |
|---|---|
| Submission (API01, T1/T2) | Insert the request. Set *BlockedByPriorCancellation* if any other request of the employee is `CancellationPending` |
| HR approve (API06, T6) | `EXISTS` check for another request of the employee in `CancellationPending` → refuse with the D68 error. Otherwise approve and insert fulfilment items and adapter-dispatch **outbox** rows in the same transaction. The dispatcher reads only committed outbox rows, so nothing is dispatched for a blocked or rolled-back approval |
| Enter `CancellationPending` (T14, T16) | Change status. Set *BlockedByPriorCancellation* on the employee's other non-terminal requests that have not passed HR approval |
| Leave `CancellationPending` (T17) | Change status to `Cancelled`. If none of the employee's other requests is still `CancellationPending`, clear the flag on them and restart their HR SLA (D30) |

The `EXISTS` check at T6 is the authority; the flag is for display only. The optimistic version check (D43) still applies to every transition.

**Error mapping**
| Database outcome | API response |
|---|---|
| `23505` on `ux_transfer_request_one_active_per_employee` | `409 You already have an active transfer request` |
| Lock timeout (`55P03`) on the employee lock | `409 This request has already been updated. Please refresh.` |
| Either one | Never `500` |

### Submission idempotency store (G1-04)
```sql
CREATE TABLE "SubmissionIdempotency" (
  "employeeId"        uuid        NOT NULL,
  "operation"         text        NOT NULL,   -- 'CreateTransfer'
  "idempotencyKey"    uuid        NOT NULL,
  "payloadHash"       char(64)    NOT NULL,   -- SHA-256 hex of the canonical body
  "transferRequestId" uuid        NOT NULL REFERENCES "TransferRequest"("id"),
  "responseStatus"    smallint    NOT NULL,
  "responseBody"      jsonb       NOT NULL,
  "createdAt"         timestamptz NOT NULL DEFAULT now(),
  "expiresAt"         timestamptz NOT NULL,   -- createdAt + 24 h
  PRIMARY KEY ("employeeId", "operation", "idempotencyKey")
);
CREATE INDEX ix_submission_idempotency_expires ON "SubmissionIdempotency" ("expiresAt");
```
Flow, in one transaction: insert key `ON CONFLICT DO NOTHING` → if it already exists, `SELECT ... FOR UPDATE` (5 s), then replay the stored response or return `422` on a hash mismatch → otherwise take the employee lock, validate, create the request, store the response, commit. A daily job deletes rows past `expiresAt`. The full contract is in spec API01.

### Pending (D71 items 2 to 7)
Adapter contract and idempotency (D69, D53 to D56), callback authentication (D57), audit hash chain and database permissions (D64), scheduler and serialisation (D60, D62, D43), timezone handling (D31), server-side field filtering (D65): **not yet defined**.

## Constitution Check
- [x] No new datastore introduced without ADR (PostgreSQL only)
- [ ] Testing discipline matches constitution.md. Concurrency is proven by IT-01 to IT-08 against real PostgreSQL; the rest is pending
- [ ] Security posture matches constitution.md. Pending (D57, D64, D65)

## Explicitly Deferred
- D71 items 2 to 7, to be written by the spec author and approved at Gate 1 before development of each area starts.

## Sequencing
1. Migration: `TransferRequest` status enum, partial unique index, `SubmissionIdempotency`.
2. Integration tests IT-07 and IT-08 (index), then IT-01 to IT-06 (concurrency), written before the service code (TDD).
3. API01 submission service with idempotency and the employee lock; API06 approval with the D68 check and outbox.
4. Remaining sequencing to follow once items 2 to 7 are defined.
