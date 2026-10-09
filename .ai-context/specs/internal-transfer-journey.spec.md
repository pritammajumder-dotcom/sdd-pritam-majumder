# Spec: Employee Internal Transfer Digital Journey

## Spec ID
internal-transfer-journey

## Status
In Peer Review (Gate 1 re-review of v1.1). v1.0 was not approved on 2026-10-09; v1.1 addresses all Gate 1 feedback (G1-04 to G1-06) and was resubmitted on 2026-10-09.

## Spec Version History
| Version | Date | Change | Author | Gate 1 Outcome |
|---|---|---|---|---|
| v1.0 | 2026-10-05 | Initial spec generated from BRD v1.2. Archived unchanged at `.ai-context/archive/specs/internal-transfer-journey.spec-v1.0.md` | Agent (on behalf of Pritam Majumder) | Changes Requested (2026-10-09, Shamik Bhattacharya). Record: `.ai-context/pr_reviews/internal-transfer-journey-G1-20261009-164323.md` |
| v1.1 | 2026-10-09 | **G1-04:** API01 idempotency contract (`Idempotency-Key` header, scope, retention, payload fingerprint, concurrency, replay, conflicting payload). **G1-05:** new APIs API18 to API24 for master-data combinations, the Manager, HR and fulfilment queues, and approver/manager candidates; API02 scoped and paginated; common queue rules. **G1-06:** exact active set, partial unique index, and the D68 employee-lock protocol for `CancellationPending`. New AC-P22 to AC-P29, AC-N39 to AC-N54, matching UT rows, and integration tests IT-01 to IT-08 (real PostgreSQL) for the concurrency cases | Agent (on behalf of Pritam Majumder) | Pending |

## Roles & Assignments
- **Developer:** Pritam Majumder (pritam.majumder@intglobal.com)
- **Gate 1 Reviewer(s):** Shamik Bhattacharya (shamik.bhattacharya@intglobal.com)
- **Gate 2 Reviewer(s):** Subhajit Mukherjee (subhajit.mukherjee@intglobal.com)

## Linked BRD
.ai-context/BRD.md#BRD-001

## Gate Approvals & History
| Gate | Approver Name | Approver Email/ID | Date/Time | Outcome | Approval Comment / Summary |
|---|---|---|---|---|---|
| Gate 1 (Spec Review), v1.0 | Shamik Bhattacharya | shamik.bhattacharya@intglobal.com | 2026-10-09 16:43:23 | Changes Requested | API01 idempotency contract incomplete (G1-04); queue and master-data APIs not defined (G1-05); active set vs `CancellationPending` undefined (G1-06). Add positive and negative tests for each |
| Gate 1 (Spec Review), v1.1 | Pending | Pending | Pending | Pending | Pending |
| Gate 2 (Code Review) | Pending | Pending | Pending | Pending | Pending |

## Intent
Enable an employee to initiate, track, and complete an internal transfer request entirely through the One-Point Employee Portal. This orchestrates a single digital journey spanning Manager approval, HR eligibility validation (based on 3 seeded rules), and downstream fulfilment coordination via mock API adapters (Payroll, IT, Facilities). The system enforces strict access matrices, robust idempotency for adapter operations, rollback/cancellation mechanisms (`CancellationPending`), SLA-driven escalations, and an atomic organisational application on a scheduled effective date.

## Context
- Builds on: `.ai-context/architecture.md` (Standard NestJS/PostgreSQL/Redis stack)
- Related: None
- API contract: Defines all internal system API endpoints and authenticated webhook callbacks for mock adapters.

## API Contract (Exhaustive)

### internal-transfer-journey.API01 — POST /api/transfers
**Request headers:**
| Header | Required | Rule |
|---|---|---|
| `Authorization` | Yes | `Bearer <JWT>`. The employee is always taken from the token, never from the body |
| `Idempotency-Key` | **Yes** | Client-generated UUID v4. The portal creates one when the submission form opens and reuses it for every retry and double click of that form. A new form gets a new key (D07, D43) |

**Request payload:**
```json
{
  "proposedDepartmentId": "string",
  "proposedLocationId": "string",
  "proposedRoleId": "string",
  "effectiveDate": "YYYY-MM-DD",
  "reason": "string (optional, max 500)"
}
```

**Success response (`201`):**
```json
{
  "id": "uuid",
  "status": "PendingManagerApproval",
  "proposedEffectiveDate": "YYYY-MM-DD",
  "flags": ["string"]
}
```
`flags` contains `AwaitingApproverAssignment` (D59) and/or `BlockedByPriorCancellation` (D68) when they apply at submission.

**Replay response (`201`, header `Idempotent-Replayed: true`):** the stored body of the original `201`, byte for byte. It is not re-read from the current request state, and nothing is created, audited or notified again. The client uses API03 to get the current state.

**Idempotency contract (G1-04, D07, D43):**
1. **Scope.** The key is unique per `(employeeId from the JWT, operation "CreateTransfer")`. Two employees can use the same key value without effect on each other, and a replay never returns another employee's request.
2. **Persistence.** Table `SubmissionIdempotency`: `employeeId`, `operation`, `idempotencyKey`, `payloadHash`, `transferRequestId`, `responseStatus`, `responseBody` (JSONB), `createdAt`, `expiresAt`. Unique index on `(employeeId, operation, idempotencyKey)`.
3. **Payload fingerprint.** `payloadHash` = SHA-256 of the canonical body: the five fields above with sorted keys, trimmed strings, the date as `YYYY-MM-DD`, and a missing or empty `reason` stored as `null`. Unknown fields are rejected by validation (400) before hashing.
4. **One transaction.** The idempotency row, the `TransferRequest` row, the snapshot (D08), the audit entry and the notification outbox rows are written in **one** database transaction. Order of work: (a) `INSERT ... ON CONFLICT DO NOTHING` on `SubmissionIdempotency`; (b) if inserted, take the employee lock (see Data Model), validate (D03 to D07) and create the request; (c) store `responseStatus` and `responseBody`; (d) commit. If any step fails, the whole transaction rolls back and the key row disappears with it.
5. **Same key, same payload.** If step (a) hits an existing row, the server waits for that row (`SELECT ... FOR UPDATE`, lock timeout 5 s) and then: hash equal and response stored → replay as above. This covers sequential retries and concurrent duplicates: a concurrent duplicate waits for the first transaction to commit and then replays its result.
6. **Same key, different payload.** Hash differs → `422 IDEMPOTENCY_KEY_REUSED`. Nothing is created or changed, and the original request is unaffected. The attempt is audited.
7. **Only successes are stored.** A rejected submission (400, 409, 422) rolls back and stores no key, so the employee can correct the form and submit again with the same key.
8. **Retention.** Key rows expire 24 hours after `createdAt`. A daily purge deletes rows past `expiresAt`. A key reused after expiry is treated as a new submission and is still blocked by the single-active-request index (D07) while the original request is active.
9. **Different keys at the same time.** Exactly one succeeds through the partial unique index (Data Model). The others get `409` and create nothing. A unique-violation on `ux_transfer_request_one_active_per_employee` is always mapped to this `409`, never to a `500`.

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 400  | `Idempotency-Key` missing or not a UUID v4 | `{"error": "IDEMPOTENCY_KEY_REQUIRED", "message": "A valid Idempotency-Key header is required."}` |
| 400  | Invalid Master Data (D03) | `{"error": "Invalid master data combination"}` |
| 400  | Identical to current (D04)| `{"error": "Proposed details are the same as your current assignment."}` |
| 400  | Date < 14 days (D05)    | `{"error": "Effective date must be at least 14 days in future."}` |
| 409  | Has active request (D07), including a concurrent submission with a different key that won | `{"error": "You already have an active transfer request"}` |
| 409  | Same key still in flight after the 5 s lock wait | `{"error": "IDEMPOTENCY_IN_PROGRESS", "message": "This submission is still being processed. Please retry."}` |
| 422  | Same key reused with a different payload | `{"error": "IDEMPOTENCY_KEY_REUSED", "message": "This idempotency key was already used for a different submission."}` |

### internal-transfer-journey.API02 — GET /api/transfers
Returns **only the caller's own requests** (Employee view, D37, D48), whatever other roles the caller holds. Other users' requests are reached only through the queue endpoints API21 to API23.

**Query parameters:** `status` (optional, repeatable, request statuses from D32), `page` (default 1), `pageSize` (default 25, max 100). Sorted by `createdAt` descending.

**Success response (`200`):**
```json
{
  "data": [
    {
      "id": "uuid",
      "status": "string",
      "flags": ["string"],
      "proposedEffectiveDate": "YYYY-MM-DD"
    }
  ],
  "page": "number",
  "pageSize": "number",
  "total": "number"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 400  | Invalid paging or filter value | `{"error": "Invalid query parameter: <name>"}` |
| 401  | Unauthorized | `{"error": "Unauthorized"}` |

### internal-transfer-journey.API03 — GET /api/transfers/{id}
**Request payload:**
```json
{}
```

**Success response (`200`):**
```json
{
  "id": "uuid",
  "status": "string",
  "items": [],
  "flags": ["string"],
  "rejectionReason": "string (stripped if manager/queue)",
  "disciplinaryCase": "boolean (stripped if manager/queue)"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 403  | Cross-employee access | `{"error": "Forbidden"}` |
| 404  | Not found | `{"error": "Not found"}` |

### internal-transfer-journey.API04 — POST /api/transfers/{id}/withdraw
**Request payload:**
```json
{}
```

**Success response (`200`):**
```json
{
  "id": "uuid",
  "status": "Withdrawn"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 400  | Invalid transition | `{"error": "Cannot withdraw after HR approval"}` |

### internal-transfer-journey.API05 — POST /api/transfers/{id}/manager-decision
**Request payload:**
```json
{
  "decision": "APPROVE | REJECT",
  "comment": "string (optional for APPROVE, mandatory for REJECT)"
}
```

**Success response (`200`):**
```json
{
  "id": "uuid",
  "status": "PendingHRValidation | RejectedByManager"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 403  | Not assigned manager | `{"error": "Forbidden"}` |

### internal-transfer-journey.API06 — POST /api/transfers/{id}/hr-decision
**Request payload:**
```json
{
  "decision": "APPROVE | REJECT",
  "revisedEffectiveDate": "YYYY-MM-DD (optional)",
  "rejectionCategory": "string (optional)",
  "comment": "string",
  "approvedNewManagerId": "uuid (optional)"
}
```

**Success response (`200`):**
```json
{
  "id": "uuid",
  "status": "PendingFulfilment | RejectedByHR"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 400  | Missing approved new manager (D67) | `{"error": "Must select an approved new manager."}` |
| 400  | Rule failure on approve | `{"error": "Cannot approve due to failing rules: R1."}` |
| 400  | Blocked by prior cancellation (D68): any other request of the employee is `CancellationPending`, checked under the employee lock (see Data Model) | `{"error": "Approval blocked until the earlier transfer's cancellation is complete."}` |

### internal-transfer-journey.API07 — POST /api/transfers/{id}/cancel
**Request payload:**
```json
{
  "reason": "string"
}
```

**Success response (`200`):**
```json
{
  "id": "uuid",
  "status": "CancellationPending | Cancelled"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 403  | Non-HR user | `{"error": "Forbidden"}` |

### internal-transfer-journey.API08 — POST /api/transfers/{id}/reschedule
**Request payload:**
```json
{
  "revisedEffectiveDate": "YYYY-MM-DD",
  "reasonCategory": "string",
  "comment": "string"
}
```

**Success response (`200`):**
```json
{
  "id": "uuid",
  "effectiveDate": "YYYY-MM-DD"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 400  | Over 3 reschedules (D66) | `{"error": "Reschedule limit reached."}` |

### internal-transfer-journey.API09 — POST /api/transfers/{id}/assign-approver
**Request payload:**
```json
{
  "approverId": "uuid",
  "reason": "string (mandatory if not skip-level)"
}
```

**Success response (`200`):**
```json
{
  "id": "uuid",
  "status": "PendingManagerApproval"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 400  | Self-assignment | `{"error": "Cannot self-assign."}` |

### internal-transfer-journey.API10 — POST /api/transfers/{id}/select-manager
**Request payload:**
```json
{
  "managerId": "uuid"
}
```

**Success response (`200`):**
```json
{
  "id": "uuid",
  "approvedNewManagerId": "uuid"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 400  | Self-assignment | `{"error": "Cannot assign employee as manager."}` |

### internal-transfer-journey.API11 — POST /api/transfers/{id}/items/{itemId}/retry
**Request payload:**
```json
{}
```

**Success response (`200`):**
```json
{
  "id": "uuid",
  "itemStatus": "Retrying | ReversalPending"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 403  | Wrong queue | `{"error": "Forbidden"}` |

### internal-transfer-journey.API12 — POST /api/transfers/{id}/items/{itemId}/manual-complete
**Request payload:**
```json
{
  "evidenceNote": "string (20-1000 chars)",
  "externalReference": "string (optional)"
}
```

**Success response (`200`):**
```json
{
  "id": "uuid",
  "itemStatus": "Completed | Reversed",
  "completionSource": "Manual"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 400  | Missing note | `{"error": "Evidence note required."}` |

### internal-transfer-journey.API13 — POST /api/transfers/{id}/items/{itemId}/unable-to-fulfil
**Request payload:**
```json
{
  "reason": "string"
}
```

**Success response (`200`):**
```json
{
  "id": "uuid",
  "itemStatus": "UnableToFulfil",
  "status": "FulfilmentFailed"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 403  | Wrong queue | `{"error": "Forbidden"}` |

### internal-transfer-journey.API14 — POST /api/transfers/{id}/items/{itemId}/waive-reversal
**Request payload:**
```json
{
  "justification": "string (min 20 chars)"
}
```

**Success response (`200`):**
```json
{
  "id": "uuid",
  "itemStatus": "ReversalWaived"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 403  | Not HR Lead | `{"error": "Forbidden"}` |

### internal-transfer-journey.API15 — POST /api/transfers/apply-now
**Request payload:**
```json
{
  "transferId": "uuid"
}
```

**Success response (`200`):**
```json
{
  "id": "uuid",
  "status": "Completed"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 403  | Not HR Lead | `{"error": "Forbidden"}` |

### internal-transfer-journey.API16 — POST /api/transfers/webhook
**Request payload:**
```json
{
  "referenceId": "string",
  "idempotencyKey": "string",
  "status": "COMPLETED | FAILED | REVERSED",
  "message": "string"
}
```

**Success response (`200`):**
```json
{
  "success": true
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 401  | Invalid credential (D57) | `{"error": "Unauthorized"}` |

### internal-transfer-journey.API17 — GET /api/transfers/{id}/audit
**Request payload:**
```json
{}
```

**Success response (`200`):**
```json
{
  "trail": [
    {
      "timestamp": "ISO UTC",
      "eventType": "string",
      "actingUserId": "string",
      "previousStatus": "string",
      "newStatus": "string"
    }
  ]
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 403  | Non-HR user | `{"error": "Forbidden"}` |

### Discovery and queue APIs (G1-05)

**Common rules for API18 to API24:**
- Every rule below is enforced on the server, in the database query. Filtering in the client or after the query is not allowed. A record the caller may not see is never counted in `total`.
- **Segregation of duties (D23):** no queue ever returns the caller's own request, or a request where the caller has already acted at another stage (for example HR never sees, in the HR queue, a request they approved as Manager).
- **Field filtering (D65):** each role gets a fixed DTO with only the fields listed for it. HR-only fields are left out of the response, not sent as `null`.
- **Pagination:** `page` (default 1) and `pageSize` (default 25, max 100). A value outside these limits gets `400`. The response is `{ "data": [...], "page", "pageSize", "total" }`. Default sort is SLA due date ascending (oldest breach first), then `createdAt` ascending. A first page of 25 must meet D51 (≤ 500 ms p95).
- **Role check:** a caller without the required role gets `403 {"error": "Forbidden"}` and the refusal is audited (D37). A request ID the caller may not see in a filter gets an empty result, not an error.

### internal-transfer-journey.API18 — GET /api/master-data/departments
Any authenticated user. Returns active departments that have at least one active, valid combination (D01 to D03).

**Success response (`200`):**
```json
{ "data": [ { "id": "string", "name": "string" } ] }
```

**Exceptions:**
| Code | Condition | Response body |
| ---- | --------- | ------------- |
| 401  | Unauthorized | `{"error": "Unauthorized"}` |

### internal-transfer-journey.API19 — GET /api/master-data/locations?departmentId={id}
Any authenticated user. Returns active locations that form at least one active, valid combination with the given department (D03 cascade).

**Success response (`200`):**
```json
{ "data": [ { "id": "string", "name": "string" } ] }
```

**Exceptions:**
| Code | Condition | Response body |
| ---- | --------- | ------------- |
| 400  | `departmentId` missing, unknown or inactive | `{"error": "Invalid master data combination"}` |
| 401  | Unauthorized | `{"error": "Unauthorized"}` |

### internal-transfer-journey.API20 — GET /api/master-data/roles?departmentId={id}&locationId={id}
Any authenticated user. Returns active roles that complete an active, valid (department, location, role) combination. The designated reporting manager (D67) is **not** returned to employees.

**Success response (`200`):**
```json
{ "data": [ { "id": "string", "name": "string" } ] }
```

**Exceptions:**
| Code | Condition | Response body |
| ---- | --------- | ------------- |
| 400  | Department or location missing, unknown, inactive, or not a valid pair | `{"error": "Invalid master data combination"}` |
| 401  | Unauthorized | `{"error": "Unauthorized"}` |

API01 validates the submitted combination against the same active combination table on the server (D03). The master-data APIs are a convenience for the UI, not the check.

### internal-transfer-journey.API21 — GET /api/queues/manager-approvals ("My Approvals")
Caller must be a Manager or an HR-assigned approver (D12, D59).

**Query parameters:** `view` = `pending` (default) | `decided`, plus the common paging parameters.
- `pending`: requests in `PendingManagerApproval` where the caller is the **current approver** at query time (current manager under D12/D14, or the HR-assigned approver under D59). A replaced manager stops seeing the request at once (D14).
- `decided`: read-only list of requests on which the caller recorded an approve or reject decision (D37 view (b)).

**Success response (`200`), item fields:**
```json
{
  "id": "uuid",
  "employee": { "id": "string", "name": "string" },
  "from": { "department": "string", "location": "string", "role": "string" },
  "to": { "department": "string", "location": "string", "role": "string" },
  "effectiveDate": "YYYY-MM-DD",
  "reason": "string | absent",
  "status": "string",
  "flags": ["Delayed"],
  "slaDueAt": "ISO UTC",
  "myDecision": { "decision": "APPROVE | REJECT", "comment": "string", "decidedAt": "ISO UTC" }
}
```
`myDecision` appears only in `view=decided`. The response never includes eligibility results, HR comments, disciplinary data or audit detail (D22, D65).

**Exceptions:**
| Code | Condition | Response body |
| ---- | --------- | ------------- |
| 400  | Invalid `view` or paging value | `{"error": "Invalid query parameter: <name>"}` |
| 403  | Caller is not a manager or assigned approver for any employee | `{"error": "Forbidden"}` |

### internal-transfer-journey.API22 — GET /api/queues/hr
Caller must hold the HR role.

**Query parameters:** `bucket` (optional, repeatable) = `validation` (`PendingHRValidation`, default) | `approverAssignment` (`PendingManagerApproval` with *AwaitingApproverAssignment*) | `fulfilmentFailed` | `cancellationPending` | `exceptions` (any request with *EffectiveDateMissed*, *ApplicationOverdue*, *NewManagerRequired*, *EligibilityChangedAfterApproval*, *CurrentAssignmentChanged* or *ProposedPositionInvalid*); `flag` (optional, repeatable); plus the common paging parameters.

Shared queue: every HR user sees every request in the selected buckets (D42), **except** their own requests and requests where they acted as Manager or assigned approver (D23).

**Success response (`200`), item fields:** the API21 fields, plus `eligibility` (per-rule R1 to R3 result, D21), `disciplinaryCase`, `approvedNewManager`, `items` (team, item status, flags), `rescheduleCount`, and `blockedBy`:
```json
"blockedBy": [ { "requestId": "uuid", "status": "CancellationPending", "unresolvedItems": [ { "team": "Payroll", "itemStatus": "ReversalFailed" } ] } ]
```
`blockedBy` lists the earlier requests and unresolved items behind *BlockedByPriorCancellation* (D68).

**Exceptions:**
| Code | Condition | Response body |
| ---- | --------- | ------------- |
| 400  | Invalid bucket, flag or paging value | `{"error": "Invalid query parameter: <name>"}` |
| 403  | Non-HR user | `{"error": "Forbidden"}` |

### internal-transfer-journey.API23 — GET /api/queues/fulfilment/{team}
`team` = `payroll` | `it` | `facilities`. Caller must hold the matching role (D26, D37). A user with several functional roles calls once per team.

**Query parameters:** `itemStatus` (optional, repeatable, item statuses from D36), `flag` (`Delayed` | `AdapterDiscrepancy`), plus the common paging parameters.

Returns only the caller's team's **item** on requests in `PendingFulfilment` or later, including `CancellationPending` (D37). Never returns items of requests that have not reached HR approval, items of another team, or items on the caller's own request (D23).

**Success response (`200`), item fields (exactly the D37 functional data set):**
```json
{
  "requestId": "uuid",
  "itemId": "uuid",
  "team": "Payroll | IT | Facilities",
  "referenceId": "string",
  "itemStatus": "string",
  "flags": ["Delayed", "AdapterDiscrepancy"],
  "employee": { "id": "string", "name": "string" },
  "from": { "department": "string", "location": "string", "role": "string" },
  "to": { "department": "string", "location": "string", "role": "string", "approvedNewManager": "string" },
  "effectiveDate": "YYYY-MM-DD",
  "slaDueAt": "ISO UTC",
  "operations": [ { "type": "Dispatch | Amend | Cancel | Reverse", "status": "string", "at": "ISO UTC" } ]
}
```
No reason, eligibility, disciplinary or HR comment data (D65).

**Exceptions:**
| Code | Condition | Response body |
| ---- | --------- | ------------- |
| 400  | Unknown `team`, item status, flag or paging value | `{"error": "Invalid query parameter: <name>"}` |
| 403  | Caller does not hold the role for `team` | `{"error": "Forbidden"}` |

### internal-transfer-journey.API24 — GET /api/transfers/{id}/candidates?type={approver|newManager}
Caller must hold the HR role and pass D23 for this request. This is how HR finds the IDs used by API09 and API10.
- `type=approver` (D59): active managers in the employee's reporting hierarchy, nearest first (skip-level, then upward), tagged `tier: "hierarchy"`. Only if there are none: active managers in the employee's current department, tagged `tier: "department"` (API09 then requires a reason). Excludes the employee, the caller, and anyone who would break D23.
- `type=newManager` (D67): active managers in the target department, excluding the employee.

**Success response (`200`):**
```json
{ "data": [ { "userId": "uuid", "name": "string", "tier": "hierarchy | department", "level": "number" } ] }
```
An empty `data` for `type=approver` means no eligible approver exists. HR Lead may then cancel (T18).

**Exceptions:**
| Code | Condition | Response body |
| ---- | --------- | ------------- |
| 400  | Missing or unknown `type` | `{"error": "Invalid query parameter: type"}` |
| 403  | Non-HR user, or caller barred by D23 | `{"error": "Forbidden"}` |
| 404  | Not found | `{"error": "Not found"}` |


## Acceptance Criteria

1. `internal-transfer-journey.AC-P01` — Given the system is ready, when Eligible employee submits a valid request, then Request created, status PendingManagerApproval, Manager A and employee notified, audited.
2. `internal-transfer-journey.AC-P02` — Given the system is ready, when Manager approves, then PendingHRValidation, HR queue shows R1 to R3 results.
3. `internal-transfer-journey.AC-P03` — Given the system is ready, when HR approves (all rules pass), then PendingFulfilment, three items dispatched with unique reference IDs and DISPATCH:1 keys, approved new manager recorded, organisational data unchanged.
4. `internal-transfer-journey.AC-P04` — Given the system is ready, when Payroll, IT, and Facilities complete independently and in any order, then Each item Completed separately. Overall stays PendingFulfilment until the last one.
5. `internal-transfer-journey.AC-P05` — Given the system is ready, when Employee views individual status of all three items, then Each items status and Delayed flag visible, with a 2 of 3 style summary.
6. `internal-transfer-journey.AC-P06` — Given the system is ready, when All three complete before the effective date, then the effective date arrives, then Scheduled, then Completed at 00:00 on the effective date. Organisational data updated then, not earlier.
7. `internal-transfer-journey.AC-P07` — Given the system is ready, when Manager rejects, then RejectedByManager (terminal), employee notified, new request allowed.
8. `internal-transfer-journey.AC-P08` — Given the system is ready, when HR rejects on failed rule, then RejectedByHR, failed rule name(s) shown to the employee, manager sees no rule detail.
9. `internal-transfer-journey.AC-P09` — Given the system is ready, when Employee withdraws at PendingManagerApproval and at PendingHRValidation, then Withdrawn (terminal), approver loses the item.
10. `internal-transfer-journey.AC-P10` — Given the system is ready, when Manager, HR, and fulfilment SLAs are exceeded, then Delayed flag, reminders, and escalation at the defined points. No auto-approval.
11. `internal-transfer-journey.AC-P11` — Given the system is ready, when Manager becomes inactive, or the reporting manager changes, while the request is PendingManagerApproval, then Request moves to the new manager or to HR approver assignment; the replaced manager loses access; the manager SLA restarts from assignment.
12. `internal-transfer-journey.AC-P12` — Given the system is ready, when HR reschedules the effective date, then New date recorded with reason; employee sees old and new date and is notified; audit entry created; an Amend with a new key is sent to each dispatched item.
13. `internal-transfer-journey.AC-P13` — Given the system is ready, when Functional user manually completes a Failed item with mandatory evidence, then Item Completed (source Manual); evidence visible to HR and the queue only; audit entry created.
14. `internal-transfer-journey.AC-P14` — Given the system is ready, when Functional user retries a Failed item, then Same reference ID; same key after an unknown outcome, next key after a 4xx; item SLA not restarted.
15. `internal-transfer-journey.AC-P15` — Given the system is ready, when HR cancels after HR approval with a mix of completed and open items, then Request CancellationPending; completed items get Reverse operations; never-executed items Cancelled; request Cancelled once all items are resolved.
16. `internal-transfer-journey.AC-P16` — Given the system is ready, when All fulfilment completes before the effective date, then Organisational data unchanged until the effective date, then department, location, role, manager and last transfer date change together in one unit.
17. `internal-transfer-journey.AC-P17` — Given the system is ready, when Real-time notification fails, then Persistent notification is available when the user next opens the portal; workflow unaffected.
18. `internal-transfer-journey.AC-P18` — Given the system is ready, when HR approves a request for a combination with no designated manager, then Approve blocked until HR selects an active manager in the target department; that manager is applied on the effective date.
19. `internal-transfer-journey.AC-P19` — Given the system is ready, when Employee with no active manager submits, then AwaitingApproverAssignment; employee sees Waiting for HR to assign an approver; HR assigns the skip-level manager; the 5-day manager SLA starts at assignment.
20. `internal-transfer-journey.AC-P20` — Given the system is ready, when HR cancels while an item is InProgress; adapter confirms the Cancel, then Item Cancelled with no Reverse; request Cancelled when all items are resolved.
21. `internal-transfer-journey.AC-P21` — Given the system is ready, when A ReversalFailed item is resolved by retry, by manual reversal, or by HR Lead waiver, then Item Reversed or ReversalWaived; request moves to Cancelled only when the last item is resolved.
22. `internal-transfer-journey.AC-N01` — Given the system is ready, when Effective date less than 14 calendar days away, then Submission rejected with a validation message. Nothing created.
23. `internal-transfer-journey.AC-N02` — Given the system is ready, when Employee already has an active request, then Rejected: You already have an active transfer request.
24. `internal-transfer-journey.AC-N03` — Given the system is ready, when Duplicate submission (double click, two tabs, or concurrent API calls), then Exactly one request created. Same idempotency key returns the original.
25. `internal-transfer-journey.AC-N04` — Given the system is ready, when Employee opens another employees request by ID, then Refused (indistinguishable from not-found), audited.
26. `internal-transfer-journey.AC-N05` — Given the system is ready, when Employee tries to approve their own request, then Refused, audited.
27. `internal-transfer-journey.AC-N06` — Given the system is ready, when Manager approves someone for whom they are not the current approver, or after being replaced, then Refused.
28. `internal-transfer-journey.AC-N07` — Given the system is ready, when Non-HR user calls an HR action, then Refused.
29. `internal-transfer-journey.AC-N08` — Given the system is ready, when Payroll user updates the IT item, then Refused.
30. `internal-transfer-journey.AC-N09` — Given the system is ready, when Fulfilment adapter times out, then Retrying with the same idempotency key and payload, up to 3 automatic retries, then Failed (outcome unknown) and the queue is notified.
31. `internal-transfer-journey.AC-N10` — Given the system is ready, when Adapter returns 4xx or 5xx, then 4xx: Failed with no automatic retry. 5xx: automatic retry as for a timeout.
32. `internal-transfer-journey.AC-N11` — Given the system is ready, when Adapter returns an invalid response, then Treated as unknown outcome and retried. Payload audited.
33. `internal-transfer-journey.AC-N12` — Given the system is ready, when Same operation received twice (retry or duplicate), then Action performed once. Second call returns the original result. Duplicate callback ignored.
34. `internal-transfer-journey.AC-N13` — Given the system is ready, when One item succeeds while another fails, then Overall PendingFulfilment while the failure is open, then FulfilmentFailed after Unable to Fulfil. Never Completed.
35. `internal-transfer-journey.AC-N14` — Given the system is ready, when Invalid status transition attempted, then Refused with an error, nothing changed, audited.
36. `internal-transfer-journey.AC-N15` — Given the system is ready, when Any action on a withdrawn, completed, rejected, or cancelled request, then Refused.
37. `internal-transfer-journey.AC-N16` — Given the system is ready, when Employee tries to withdraw after HR approval, then Refused: Please contact HR.
38. `internal-transfer-journey.AC-N17` — Given the system is ready, when Proposed details identical to current assignment, then Submission rejected.
39. `internal-transfer-journey.AC-N18` — Given the system is ready, when Invalid department/location/role combination sent directly to the API, then Rejected.
40. `internal-transfer-journey.AC-N19` — Given the system is ready, when Two users act on the same request at the same moment, then Exactly one transition applied. The other is told to refresh.
41. `internal-transfer-journey.AC-N20` — Given the system is ready, when Fulfilment still incomplete on the effective date, then Transfer not applied. EffectiveDateMissed shown. HR can reschedule or cancel.
42. `internal-transfer-journey.AC-N21` — Given the system is ready, when Employee becomes inactive mid-request, then Before HR approval: Cancelled (System). After HR approval: CancellationPending, items unwound, then Cancelled.
43. `internal-transfer-journey.AC-N22` — Given the system is ready, when Master data deactivated before HR decision, then HR cannot approve and must reject as Proposed position invalid.
44. `internal-transfer-journey.AC-N23` — Given the system is ready, when HR cancels; one downstream reversal fails, then Request stays CancellationPending (not Cancelled); item ReversalFailed; queue notified, HR and HR Lead escalated after 1 business day; employee sees which item is unresolved.
45. `internal-transfer-journey.AC-N24` — Given the system is ready, when Late contradictory callback, then AdapterDiscrepancy flag (D56).
46. `internal-transfer-journey.AC-N25` — Given the system is ready, when Callback with unknown IDs, missing or invalid credential, or no authentication, then Rejected, nothing changed, audited as a security event.
47. `internal-transfer-journey.AC-N26` — Given the system is ready, when Effective-date run fails or does not run, then Recovery check applies the request; after 01:00 ApplicationOverdue and HR/HR Lead alerted; never silently left Scheduled.
48. `internal-transfer-journey.AC-N27` — Given the system is ready, when One organisational field fails to save during application, then Whole change rolled back; organisational record unchanged; request not Completed; attempt audited; recovery under D62.
49. `internal-transfer-journey.AC-N28` — Given the system is ready, when Same business event processed twice, then Recipient receives one notification.
50. `internal-transfer-journey.AC-N29` — Given the system is ready, when Employee submits a new request while an earlier request is CancellationPending with an unresolved reversal, then Submission allowed; HR Approve refused with BlockedByPriorCancellation; HR may reject; approval allowed once the earlier request is Cancelled.
51. `internal-transfer-journey.AC-N30` — Given the system is ready, when Manager, Employee, Payroll, IT or Facilities calls APIs for request, then Disciplinary data, eligibility detail and HR-only fields are absent from every response, not just hidden.
52. `internal-transfer-journey.AC-N31` — Given the system is ready, when Manual completion attempted on a Pending, Retrying, non-Delayed InProgress, UnableToFulfil or unwind item, by the requests own employee, by another team, or with an empty evidence note, then Refused, nothing changed, audited.
53. `internal-transfer-journey.AC-N32` — Given the system is ready, when Last item completes at 23:59:59 on the day before the effective date, and in a second run at 00:00:01 on the effective date, then First: Scheduled, applied at 00:00. Second: EffectiveDateMissed, applied immediately. Same result whichever job runs first.
54. `internal-transfer-journey.AC-N33` — Given the system is ready, when An audit record is edited or deleted directly in the database; a user tries to edit or delete audit via the API, then Next verification reports the break and alerts the HR Lead; no API exists to edit or delete.
55. `internal-transfer-journey.AC-N34` — Given the system is ready, when HR tries a 4th reschedule, or reschedules to a date less than 3 business days away, then Refused.
56. `internal-transfer-journey.AC-N35` — Given the system is ready, when Approver assignment SLA breaches, then Escalation to HR Lead.
57. `internal-transfer-journey.AC-N36` — Given the system is ready, when Manual completion evidence note > 1000 chars, then Rejected by validation.
58. `internal-transfer-journey.AC-N37` — Given the system is ready, when HR Lead waive justification < 20 chars, then Rejected by validation.
59. `internal-transfer-journey.AC-N38` — Given the system is ready, when Real-time update stream disconnects, then State fetches fully on reconnect (no missed updates).

### Added in v1.1 (Gate 1 feedback G1-04 to G1-06)

**G1-04: Submission idempotency (API01)**

60. `internal-transfer-journey.AC-P22` — Given an employee submitted a valid request with key K and got `201`, when the same employee resends the identical payload with key K within 24 hours, then the response is `201` with header `Idempotent-Replayed: true` and the original body (same `id`); no second request, audit entry or notification is created.
61. `internal-transfer-journey.AC-P23` — Given a submission with key K was rejected (for example `400` date < 14 days), when the employee corrects the form and resubmits with key K, then the request is created (`201`), because rejected attempts store no key.
62. `internal-transfer-journey.AC-N39` — Given the system is ready, when an employee calls API01 with no `Idempotency-Key` or a value that is not a UUID v4, then `400 IDEMPOTENCY_KEY_REQUIRED`; nothing created.
63. `internal-transfer-journey.AC-N40` — Given a request was created with key K, when the same employee sends key K with a different payload (any field changed, including `reason`), then `422 IDEMPOTENCY_KEY_REUSED`; nothing created; the original request is unchanged; the attempt is audited.
64. `internal-transfer-journey.AC-N41` — Given the system is ready, when 10 identical API01 calls with the same key K arrive at the same time, then exactly one `TransferRequest` exists and all 10 responses carry the same `id` (one plain `201`, the rest replays).
65. `internal-transfer-journey.AC-N42` — Given the system is ready, when 10 API01 calls from the same employee with **different** keys arrive at the same time, then exactly one returns `201`, the other nine return `409 You already have an active transfer request`, and no `500` is returned.
66. `internal-transfer-journey.AC-N43` — Given employee A created a request with key K, when employee B submits with the same key value K, then B's submission is processed on its own (new request for B, or B's own validation error), and A's request is never returned to B.
67. `internal-transfer-journey.AC-N44` — Given a key K row is more than 24 hours old and its request is still active, when the employee submits again with key K, then the key is treated as new and the submission is refused with `409` (D07); nothing created.

**G1-05: Master-data and queue retrieval (API18 to API24)**

68. `internal-transfer-journey.AC-P24` — Given seeded master data with active and inactive values and combinations, when the employee calls API18, API19 and API20 in turn, then only active values that form an active, valid combination are returned at each step, and the designated manager is not included.
69. `internal-transfer-journey.AC-P25` — Given requests assigned to several managers, when a manager calls API21 `view=pending`, then they see exactly the requests in `PendingManagerApproval` where they are the current approver, with the listed fields; `view=decided` shows only requests they decided, read-only.
70. `internal-transfer-journey.AC-P26` — Given requests in every HR bucket, when an HR user calls API22 for each bucket, then each bucket returns exactly the matching requests with full HR fields, and `blockedBy` lists the earlier request and unresolved items for every *BlockedByPriorCancellation* request.
71. `internal-transfer-journey.AC-P27` — Given HR-approved requests, when a Payroll, IT and Facilities user each call API23 for their team, then each sees only their team's item on requests in `PendingFulfilment` or later (including `CancellationPending`), with exactly the D37 fields; 60 matching records return as pages of 25, 25 and 10 with `total` = 60.
72. `internal-transfer-journey.AC-P28` — Given a request flagged *AwaitingApproverAssignment*, or one with no designated new manager, when HR calls API24 with `type=approver` or `type=newManager`, then the candidates are returned in D59 order (hierarchy first, department only if hierarchy is empty) or as active managers in the target department, excluding the employee and the caller.
73. `internal-transfer-journey.AC-N45` — Given the system is ready, when an Employee calls API21, API22 or API23, or a Payroll user calls API23 for `it`, or a non-HR user calls API22 or API24, then `403`; nothing leaked; refusal audited.
74. `internal-transfer-journey.AC-N46` — Given a manager who is not the current approver, or was replaced before acting, when they call API21, then the request is absent from `pending` (and from `decided` when they never decided it) and is not counted in `total`.
75. `internal-transfer-journey.AC-N47` — Given an HR user who submitted their own request, or approved a request as Manager, when they call API22, API23 or API24, then that request is absent from every queue and candidate list (D23).
76. `internal-transfer-journey.AC-N48` — Given the system is ready, when any queue (API21, API23) is called by a Manager, Payroll, IT or Facilities user, then `eligibility`, `disciplinaryCase`, HR comments, waiver justifications and audit detail are absent from the JSON (not `null`), and functional queues never return requests that have not reached HR approval.
77. `internal-transfer-journey.AC-N49` — Given the system is ready, when a queue or list endpoint is called with `pageSize` > 100, `page` < 1, or an unknown status, bucket, flag or team, then `400`; API19 or API20 with an inactive or invalid department/location gets `400 Invalid master data combination`.

**G1-06: Active set and `CancellationPending` (D07, D35, D68)**

78. `internal-transfer-journey.AC-N50` — Given an employee's earlier request is `CancellationPending`, when two submissions from that employee with different keys arrive at the same time, then exactly one new request is created (`201`, flag *BlockedByPriorCancellation*), the other gets `409`; the earlier request is unchanged; no adapter operation is created for the new request.
79. `internal-transfer-journey.AC-N51` — Given an employee's earlier request is `CancellationPending` and the new request is `PendingHRValidation`, when HR approves, then `400` "Approval blocked until the earlier transfer's cancellation is complete."; the status stays `PendingHRValidation`; no fulfilment items or adapter operations are created; the HR SLA is paused (D30).
80. `internal-transfer-journey.AC-N52` — Given an employee's earlier request is in any active status (`Submitted`, `PendingManagerApproval`, `PendingHRValidation`, `PendingFulfilment`, `FulfilmentFailed` or `Scheduled`), when the employee submits, then `409` (one test per status).
81. `internal-transfer-journey.AC-N53` — Given HR cancels the earlier `Scheduled` request (T14 → `CancellationPending`), when the employee's new submission arrives at the same moment, then the result is either `409` (submission ran first) or `201` with *BlockedByPriorCancellation* (cancellation ran first); never two active requests, and never a new request without the flag while the earlier one is `CancellationPending`.
82. `internal-transfer-journey.AC-N54` — Given the last unresolved item of the earlier request is resolved (T17 → `Cancelled`) at the same moment HR approves the new request, then either the approval is refused (`400`, block still in place) or it succeeds after T17 commits; it never succeeds while the earlier request is still `CancellationPending`.
83. `internal-transfer-journey.AC-P29` — Given the earlier request reaches `Cancelled` (T17), then in the same transaction *BlockedByPriorCancellation* is cleared from the employee's other requests, the HR SLA restarts (D30), and HR approval of the new request then succeeds with fulfilment dispatched normally.

## Unit Test Cases (spec-derived)

| Test ID | Maps to AC | Scenario | Expected |
|---------|------------|----------|----------|
| `internal-transfer-journey.UT-P01` | `internal-transfer-journey.AC-P01` | Eligible employee submits a valid request | Request created, status PendingManagerApproval, Manager A and employee notified, audited |
| `internal-transfer-journey.UT-P02` | `internal-transfer-journey.AC-P02` | Manager approves | PendingHRValidation, HR queue shows R1 to R3 results |
| `internal-transfer-journey.UT-P03` | `internal-transfer-journey.AC-P03` | HR approves (all rules pass) | PendingFulfilment, three items dispatched with unique reference IDs and DISPATCH:1 keys, approved new manager recorded, organisational data unchanged |
| `internal-transfer-journey.UT-P04` | `internal-transfer-journey.AC-P04` | Payroll, IT, and Facilities complete independently and in any order | Each item Completed separately. Overall stays PendingFulfilment until the last one |
| `internal-transfer-journey.UT-P05` | `internal-transfer-journey.AC-P05` | Employee views individual status of all three items | Each items status and Delayed flag visible, with a 2 of 3 style summary |
| `internal-transfer-journey.UT-P06` | `internal-transfer-journey.AC-P06` | All three complete before the effective date, then the effective date arrives | Scheduled, then Completed at 00:00 on the effective date. Organisational data updated then, not earlier |
| `internal-transfer-journey.UT-P07` | `internal-transfer-journey.AC-P07` | Manager rejects | RejectedByManager (terminal), employee notified, new request allowed |
| `internal-transfer-journey.UT-P08` | `internal-transfer-journey.AC-P08` | HR rejects on failed rule | RejectedByHR, failed rule name(s) shown to the employee, manager sees no rule detail |
| `internal-transfer-journey.UT-P09` | `internal-transfer-journey.AC-P09` | Employee withdraws at PendingManagerApproval and at PendingHRValidation | Withdrawn (terminal), approver loses the item |
| `internal-transfer-journey.UT-P10` | `internal-transfer-journey.AC-P10` | Manager, HR, and fulfilment SLAs are exceeded | Delayed flag, reminders, and escalation at the defined points. No auto-approval |
| `internal-transfer-journey.UT-P11` | `internal-transfer-journey.AC-P11` | Manager becomes inactive, or the reporting manager changes, while the request is PendingManagerApproval | Request moves to the new manager or to HR approver assignment; the replaced manager loses access; the manager SLA restarts from assignment |
| `internal-transfer-journey.UT-P12` | `internal-transfer-journey.AC-P12` | HR reschedules the effective date | New date recorded with reason; employee sees old and new date and is notified; audit entry created; an Amend with a new key is sent to each dispatched item |
| `internal-transfer-journey.UT-P13` | `internal-transfer-journey.AC-P13` | Functional user manually completes a Failed item with mandatory evidence | Item Completed (source Manual); evidence visible to HR and the queue only; audit entry created |
| `internal-transfer-journey.UT-P14` | `internal-transfer-journey.AC-P14` | Functional user retries a Failed item | Same reference ID; same key after an unknown outcome, next key after a 4xx; item SLA not restarted |
| `internal-transfer-journey.UT-P15` | `internal-transfer-journey.AC-P15` | HR cancels after HR approval with a mix of completed and open items | Request CancellationPending; completed items get Reverse operations; never-executed items Cancelled; request Cancelled once all items are resolved |
| `internal-transfer-journey.UT-P16` | `internal-transfer-journey.AC-P16` | All fulfilment completes before the effective date | Organisational data unchanged until the effective date, then department, location, role, manager and last transfer date change together in one unit |
| `internal-transfer-journey.UT-P17` | `internal-transfer-journey.AC-P17` | Real-time notification fails | Persistent notification is available when the user next opens the portal; workflow unaffected |
| `internal-transfer-journey.UT-P18` | `internal-transfer-journey.AC-P18` | HR approves a request for a combination with no designated manager | Approve blocked until HR selects an active manager in the target department; that manager is applied on the effective date |
| `internal-transfer-journey.UT-P19` | `internal-transfer-journey.AC-P19` | Employee with no active manager submits | AwaitingApproverAssignment; employee sees Waiting for HR to assign an approver; HR assigns the skip-level manager; the 5-day manager SLA starts at assignment |
| `internal-transfer-journey.UT-P20` | `internal-transfer-journey.AC-P20` | HR cancels while an item is InProgress; adapter confirms the Cancel | Item Cancelled with no Reverse; request Cancelled when all items are resolved |
| `internal-transfer-journey.UT-P21` | `internal-transfer-journey.AC-P21` | A ReversalFailed item is resolved by retry, by manual reversal, or by HR Lead waiver | Item Reversed or ReversalWaived; request moves to Cancelled only when the last item is resolved |
| `internal-transfer-journey.UT-N01` | `internal-transfer-journey.AC-N01` | Effective date less than 14 calendar days away | Submission rejected with a validation message. Nothing created |
| `internal-transfer-journey.UT-N02` | `internal-transfer-journey.AC-N02` | Employee already has an active request | Rejected: You already have an active transfer request |
| `internal-transfer-journey.UT-N03` | `internal-transfer-journey.AC-N03` | Duplicate submission (double click, two tabs, or concurrent API calls) | Exactly one request created. Same idempotency key returns the original |
| `internal-transfer-journey.UT-N04` | `internal-transfer-journey.AC-N04` | Employee opens another employees request by ID | Refused (indistinguishable from not-found), audited |
| `internal-transfer-journey.UT-N05` | `internal-transfer-journey.AC-N05` | Employee tries to approve their own request | Refused, audited |
| `internal-transfer-journey.UT-N06` | `internal-transfer-journey.AC-N06` | Manager approves someone for whom they are not the current approver, or after being replaced | Refused |
| `internal-transfer-journey.UT-N07` | `internal-transfer-journey.AC-N07` | Non-HR user calls an HR action | Refused |
| `internal-transfer-journey.UT-N08` | `internal-transfer-journey.AC-N08` | Payroll user updates the IT item | Refused |
| `internal-transfer-journey.UT-N09` | `internal-transfer-journey.AC-N09` | Fulfilment adapter times out | Retrying with the same idempotency key and payload, up to 3 automatic retries, then Failed (outcome unknown) and the queue is notified |
| `internal-transfer-journey.UT-N10` | `internal-transfer-journey.AC-N10` | Adapter returns 4xx or 5xx | 4xx: Failed with no automatic retry. 5xx: automatic retry as for a timeout |
| `internal-transfer-journey.UT-N11` | `internal-transfer-journey.AC-N11` | Adapter returns an invalid response | Treated as unknown outcome and retried. Payload audited |
| `internal-transfer-journey.UT-N12` | `internal-transfer-journey.AC-N12` | Same operation received twice (retry or duplicate) | Action performed once. Second call returns the original result. Duplicate callback ignored |
| `internal-transfer-journey.UT-N13` | `internal-transfer-journey.AC-N13` | One item succeeds while another fails | Overall PendingFulfilment while the failure is open, then FulfilmentFailed after Unable to Fulfil. Never Completed |
| `internal-transfer-journey.UT-N14` | `internal-transfer-journey.AC-N14` | Invalid status transition attempted | Refused with an error, nothing changed, audited |
| `internal-transfer-journey.UT-N15` | `internal-transfer-journey.AC-N15` | Any action on a withdrawn, completed, rejected, or cancelled request | Refused |
| `internal-transfer-journey.UT-N16` | `internal-transfer-journey.AC-N16` | Employee tries to withdraw after HR approval | Refused: Please contact HR |
| `internal-transfer-journey.UT-N17` | `internal-transfer-journey.AC-N17` | Proposed details identical to current assignment | Submission rejected |
| `internal-transfer-journey.UT-N18` | `internal-transfer-journey.AC-N18` | Invalid department/location/role combination sent directly to the API | Rejected |
| `internal-transfer-journey.UT-N19` | `internal-transfer-journey.AC-N19` | Two users act on the same request at the same moment | Exactly one transition applied. The other is told to refresh |
| `internal-transfer-journey.UT-N20` | `internal-transfer-journey.AC-N20` | Fulfilment still incomplete on the effective date | Transfer not applied. EffectiveDateMissed shown. HR can reschedule or cancel |
| `internal-transfer-journey.UT-N21` | `internal-transfer-journey.AC-N21` | Employee becomes inactive mid-request | Before HR approval: Cancelled (System). After HR approval: CancellationPending, items unwound, then Cancelled |
| `internal-transfer-journey.UT-N22` | `internal-transfer-journey.AC-N22` | Master data deactivated before HR decision | HR cannot approve and must reject as Proposed position invalid |
| `internal-transfer-journey.UT-N23` | `internal-transfer-journey.AC-N23` | HR cancels; one downstream reversal fails | Request stays CancellationPending (not Cancelled); item ReversalFailed; queue notified, HR and HR Lead escalated after 1 business day; employee sees which item is unresolved |
| `internal-transfer-journey.UT-N24` | `internal-transfer-journey.AC-N24` | Late contradictory callback | AdapterDiscrepancy flag (D56) |
| `internal-transfer-journey.UT-N25` | `internal-transfer-journey.AC-N25` | Callback with unknown IDs, missing or invalid credential, or no authentication | Rejected, nothing changed, audited as a security event |
| `internal-transfer-journey.UT-N26` | `internal-transfer-journey.AC-N26` | Effective-date run fails or does not run | Recovery check applies the request; after 01:00 ApplicationOverdue and HR/HR Lead alerted; never silently left Scheduled |
| `internal-transfer-journey.UT-N27` | `internal-transfer-journey.AC-N27` | One organisational field fails to save during application | Whole change rolled back; organisational record unchanged; request not Completed; attempt audited; recovery under D62 |
| `internal-transfer-journey.UT-N28` | `internal-transfer-journey.AC-N28` | Same business event processed twice | Recipient receives one notification |
| `internal-transfer-journey.UT-N29` | `internal-transfer-journey.AC-N29` | Employee submits a new request while an earlier request is CancellationPending with an unresolved reversal | Submission allowed; HR Approve refused with BlockedByPriorCancellation; HR may reject; approval allowed once the earlier request is Cancelled |
| `internal-transfer-journey.UT-N30` | `internal-transfer-journey.AC-N30` | Manager, Employee, Payroll, IT or Facilities calls APIs for request | Disciplinary data, eligibility detail and HR-only fields are absent from every response, not just hidden |
| `internal-transfer-journey.UT-N31` | `internal-transfer-journey.AC-N31` | Manual completion attempted on a Pending, Retrying, non-Delayed InProgress, UnableToFulfil or unwind item, by the requests own employee, by another team, or with an empty evidence note | Refused, nothing changed, audited |
| `internal-transfer-journey.UT-N32` | `internal-transfer-journey.AC-N32` | Last item completes at 23:59:59 on the day before the effective date, and in a second run at 00:00:01 on the effective date | First: Scheduled, applied at 00:00. Second: EffectiveDateMissed, applied immediately. Same result whichever job runs first |
| `internal-transfer-journey.UT-N33` | `internal-transfer-journey.AC-N33` | An audit record is edited or deleted directly in the database; a user tries to edit or delete audit via the API | Next verification reports the break and alerts the HR Lead; no API exists to edit or delete |
| `internal-transfer-journey.UT-N34` | `internal-transfer-journey.AC-N34` | HR tries a 4th reschedule, or reschedules to a date less than 3 business days away | Refused |
| `internal-transfer-journey.UT-N35` | `internal-transfer-journey.AC-N35` | Approver assignment SLA breaches | Escalation to HR Lead |
| `internal-transfer-journey.UT-N36` | `internal-transfer-journey.AC-N36` | Manual completion evidence note > 1000 chars | Rejected by validation |
| `internal-transfer-journey.UT-N37` | `internal-transfer-journey.AC-N37` | HR Lead waive justification < 20 chars | Rejected by validation |
| `internal-transfer-journey.UT-N38` | `internal-transfer-journey.AC-N38` | Real-time update stream disconnects | State fetches fully on reconnect (no missed updates) |
| `internal-transfer-journey.UT-P22` | `internal-transfer-journey.AC-P22` | Same key K, same payload, resent after success | `201` + `Idempotent-Replayed: true`, original body; no new request, audit or notification |
| `internal-transfer-journey.UT-P23` | `internal-transfer-journey.AC-P23` | Key K first rejected (400), then corrected payload with K | `201`, request created |
| `internal-transfer-journey.UT-P24` | `internal-transfer-journey.AC-P24` | API18 → API19 → API20 cascade over mixed active/inactive seed | Only active values in active, valid combinations; no designated manager in output |
| `internal-transfer-journey.UT-P25` | `internal-transfer-journey.AC-P25` | Manager calls API21 `pending` and `decided` | Exactly their current-approver requests / their decided requests |
| `internal-transfer-journey.UT-P26` | `internal-transfer-journey.AC-P26` | HR calls API22 for each bucket | Correct membership per bucket; `blockedBy` populated for blocked requests |
| `internal-transfer-journey.UT-P27` | `internal-transfer-journey.AC-P27` | Payroll/IT/Facilities call API23; 60 Payroll items | Own team items only, D37 fields only; pages 25/25/10, `total` 60 |
| `internal-transfer-journey.UT-P28` | `internal-transfer-journey.AC-P28` | HR calls API24 `approver` and `newManager` | D59 order and tiers; target-department managers; employee and caller excluded |
| `internal-transfer-journey.UT-P29` | `internal-transfer-journey.AC-P29` | Earlier request reaches `Cancelled` (T17) | Flag cleared in same transaction, HR SLA restarts, approval then succeeds |
| `internal-transfer-journey.UT-N39` | `internal-transfer-journey.AC-N39` | API01 without key / with non-UUID key | `400 IDEMPOTENCY_KEY_REQUIRED`; nothing created |
| `internal-transfer-journey.UT-N40` | `internal-transfer-journey.AC-N40` | Key K reused with one field changed (each field, including `reason`) | `422 IDEMPOTENCY_KEY_REUSED`; original unchanged; audited |
| `internal-transfer-journey.UT-N43` | `internal-transfer-journey.AC-N43` | Employee B uses employee A's key value | Processed independently; A's request never returned to B |
| `internal-transfer-journey.UT-N44` | `internal-transfer-journey.AC-N44` | Key K reused after 24 h expiry while request active | `409`; nothing created |
| `internal-transfer-journey.UT-N45` | `internal-transfer-journey.AC-N45` | Wrong role calls each queue / candidates endpoint | `403`; audited |
| `internal-transfer-journey.UT-N46` | `internal-transfer-journey.AC-N46` | Non-current or replaced manager calls API21 | Request absent and not counted in `total` |
| `internal-transfer-journey.UT-N47` | `internal-transfer-journey.AC-N47` | HR user with own request / prior manager decision calls API22–API24 | Request absent everywhere |
| `internal-transfer-journey.UT-N48` | `internal-transfer-journey.AC-N48` | Per-role JSON of API21 and API23 | HR-only keys absent (not `null`); no pre-HR-approval requests in functional queues |
| `internal-transfer-journey.UT-N49` | `internal-transfer-journey.AC-N49` | Bad paging/filter values; invalid cascade parent | `400` with parameter name / `Invalid master data combination` |
| `internal-transfer-journey.UT-N51` | `internal-transfer-journey.AC-N51` | HR approves while earlier request `CancellationPending` | `400` blocked; status unchanged; no items or adapter ops; HR SLA paused |
| `internal-transfer-journey.UT-N52` | `internal-transfer-journey.AC-N52` | Submit while earlier request is in each of the 6 active statuses | `409` for each |

## Integration Test Cases (spec-derived, real PostgreSQL)

These run against a real PostgreSQL instance with the production migrations, including the raw-SQL partial index. Mocks or SQLite are not allowed, because they cannot prove the concurrency guarantees. Concurrency is driven with N parallel connections released together from a barrier, and each test runs at least 20 iterations.

| Test ID | Maps to AC | Scenario | Expected |
|---------|------------|----------|----------|
| `internal-transfer-journey.IT-01` | `internal-transfer-journey.AC-N41`, `AC-N03` | 10 parallel API01 calls, same key, same payload | 1 row in `TransferRequest`, 1 in `SubmissionIdempotency`; 10 responses with the same `id` |
| `internal-transfer-journey.IT-02` | `internal-transfer-journey.AC-N42`, `AC-N03` | 10 parallel API01 calls, different keys | One `201`, nine `409`; zero `500`; 1 active row |
| `internal-transfer-journey.IT-03` | `internal-transfer-journey.AC-N40` | 2 parallel API01 calls, same key, different payloads | One `201`, one `422`; 1 row |
| `internal-transfer-journey.IT-04` | `internal-transfer-journey.AC-N50` | Earlier request `CancellationPending`; 10 parallel submissions, different keys | One `201` with *BlockedByPriorCancellation*, nine `409`; earlier request unchanged |
| `internal-transfer-journey.IT-05` | `internal-transfer-journey.AC-N53` | T14 on the earlier request in parallel with a new submission | `409` or `201` + flag; never 2 active rows; never an unflagged new request |
| `internal-transfer-journey.IT-06` | `internal-transfer-journey.AC-N54`, `AC-P29` | T17 on the earlier request in parallel with HR approve on the new one | Approve refused, or succeeds strictly after T17 commits; never approved while earlier is `CancellationPending` |
| `internal-transfer-journey.IT-07` | `internal-transfer-journey.AC-N52` | Direct `INSERT` of a second active row for one employee, bypassing the service | Rejected by `ux_transfer_request_one_active_per_employee` |
| `internal-transfer-journey.IT-08` | `internal-transfer-journey.AC-N50` | Direct `INSERT` of an active row when the employee's other row is `CancellationPending` | Accepted by the index (proves `CancellationPending` is outside the active set) |

## Explicitly Out of Scope
- Real integrations with external systems.
- OS-level push notifications.
- Holiday calendars for SLA counting.

## Non-Functional Constraints (from constitution.md)
- **Database Models & Technical Constraints**
- **Table:** `TransferRequest`. Single-active-request rule as defined in "Active set and `CancellationPending`" below (D07, D35, D68).
- **Table:** `SubmissionIdempotency`. API01 idempotency keys (G1-04). Unique `(employeeId, operation, idempotencyKey)`, 24-hour retention, daily purge.
- **Table:** `FulfilmentItem` (Tracks referenceId, status).
- **Table:** `AdapterOperation` (Tracks idempotency keys, payloads, unknown outcomes).
- **Table:** `AuditTrail` (Append-only, self-hashing chain).
- **Transactions:** `ApplyTransfer` must be wrapped in a strict ACID database transaction.
- **Timezone:** All timestamps stored in UTC. All crons (`0 0 * * *`) scheduled against `Asia/Kolkata`.

### Active set and `CancellationPending` (G1-06, D07, D35, D68, D71 item 1)

**Active set (exact):** `Submitted`, `PendingManagerApproval`, `PendingHRValidation`, `PendingFulfilment`, `FulfilmentFailed`, `Scheduled`.
`CancellationPending` is non-terminal but **not** active. Terminal statuses are never active.

**Layer 1: database backstop (partial unique index).** Prisma cannot declare partial indexes, so this is a raw-SQL migration, checked by IT-07 and IT-08:
```sql
CREATE UNIQUE INDEX ux_transfer_request_one_active_per_employee
  ON "TransferRequest" ("employeeId")
  WHERE "status" IN ('Submitted','PendingManagerApproval','PendingHRValidation',
                     'PendingFulfilment','FulfilmentFailed','Scheduled');
```
A plain unique constraint on `(employeeId, status)` is not used: it would allow one active row per status and would not express the rule. Because `CancellationPending` is outside the predicate, a new submission is allowed while an earlier request is unwinding (D68).

**Layer 2: employee lock for D68.** The index cannot block HR approval, so these operations take a row lock on the employee (`SELECT 1 FROM "Employee" WHERE "id" = $1 FOR UPDATE`) as the **first** statement of their transaction. All of them then run one at a time for that employee:
| Operation | Under the employee lock |
|---|---|
| Submission (API01, T1/T2) | Insert the request; set *BlockedByPriorCancellation* if any other request of the employee is `CancellationPending` |
| HR approve (API06, T6) | Refuse with the D68 error if `EXISTS` another request of the employee in `CancellationPending`. Otherwise approve and write fulfilment items and adapter-dispatch outbox rows in the **same** transaction, so nothing is dispatched for a blocked request |
| Enter `CancellationPending` (T14, T16) | Change status; set *BlockedByPriorCancellation* on the employee's other non-terminal requests that have not passed HR approval |
| Leave `CancellationPending` (T17) | Change status to `Cancelled`; if no other request of the employee is still `CancellationPending`, clear the flag on the others and restart their HR SLA (D30) |

The `EXISTS` check at T6 is the authority. The flag is for display and the HR queue (API22 `blockedBy`). The optimistic version check (D43) still applies to every transition.

**Error mapping.** A unique violation (SQLSTATE `23505`) on `ux_transfer_request_one_active_per_employee` maps to `409 You already have an active transfer request`. A lock wait longer than 5 s maps to `409 "This request has already been updated. Please refresh."` Neither ever surfaces as `500`.

**`plan.md` (D71 item 1).** Documented in `.ai-context/plans/internal-transfer-journey.plan.md` (Data Model › D71 item 1), with the `SubmissionIdempotency` DDL. The plan must not weaken this mechanism. Gate 1 approval of v1.1 covers this definition.
