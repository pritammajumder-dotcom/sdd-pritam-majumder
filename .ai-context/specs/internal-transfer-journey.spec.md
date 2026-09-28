# Spec: Employee Internal Transfer Digital Journey

## Spec ID
internal-transfer-journey

## Status
In Peer Review

## Roles & Assignments
- **Developer:** Pritam Majumder
- **Gate 1 Reviewer(s):** Shamik Bhattacharya
- **Gate 2 Reviewer(s):** Subhajit Mukherjee

## Linked BRD
.ai-context/BRD.md#BRD-001 (v1.1)

## Intent
Enable an employee to initiate, track, and complete an Internal Transfer Request entirely through the One-Point Employee Portal. This replaces the manual, multi-team coordination process with a single digital journey. Following BRD v1.1, HR approval authorises the transfer and dispatches fulfilment to Payroll, IT, and Facilities, but the actual organisational data change is only applied on the Effective Date once all fulfilment is complete.

## Context
- Builds on: .ai-context/architecture.md (Modular Monolith, Postgres, NestJS, Flutter)
- Related: None
- API contract: Internal endpoints for workflow orchestration; Mocked adapters for downstream fulfilment.

## API Contract (Internal Portal APIs)

### internal-transfer-journey.API01 — POST /api/v1/transfers
**Request payload:**
```json
{
  "departmentId": "string",
  "locationId": "string",
  "roleId": "string",
  "effectiveDate": "YYYY-MM-DD",
  "reason": "string (optional)"
}
```
**Success response (201):**
```json
{ "id": "uuid", "status": "PendingManagerApproval" }
```
**Exceptions:**
| Code | Condition | Response body |
|---|---|---|
| 400 | Effective date < 14 days | `{ "error": "Effective date must be at least 14 days away" }` |
| 400 | Invalid combination or same as current | `{ "error": "Proposed details invalid or identical to current" }` |
| 409 | Active request already exists | `{ "error": "You already have an active transfer request" }` |

### internal-transfer-journey.API02 — GET /api/v1/transfers
**Query parameters:** `?roleContext=employee|manager|hr|payroll|it|facilities`
**Success response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "status": "string",
      "employeeId": "string",
      "effectiveDate": "YYYY-MM-DD",
      "delayedFlag": "boolean"
    }
  ],
  "meta": { "total": "number", "page": "number" }
}
```
**Exceptions:**
| Code | Condition | Response body |
|---|---|---|
| 403 | Invalid or unauthorised role context | `{ "error": "Forbidden" }` |

### internal-transfer-journey.API03 — GET /api/v1/transfers/:id
**Success response (200):**
```json
{
  "id": "uuid",
  "status": "string",
  "employeeSnapshot": { "department": "...", "location": "...", "role": "..." },
  "proposedDetails": { "departmentId": "...", "locationId": "...", "roleId": "..." },
  "effectiveDate": "YYYY-MM-DD",
  "fulfilmentStatus": {
    "payroll": "Pending|InProgress|Retrying|Completed|Failed|UnableToFulfil",
    "it": "...",
    "facilities": "..."
  },
  "eligibility": [ { "rule": "R1", "passed": true } ],
  "auditTrail": [ { "timestamp": "...", "action": "...", "actor": "..." } ]
}
```
*Note: Fields like `eligibility` and `auditTrail` are stripped from the response based on the caller's RBAC role (BRD-001.D37).*

### internal-transfer-journey.API04 — POST /api/v1/transfers/:id/manager-action
**Request payload:**
```json
{
  "action": "approve | reject",
  "reason": "string (required if action=reject, else optional)"
}
```
**Success response (200):**
```json
{ "id": "uuid", "status": "PendingHRValidation | RejectedByManager" }
```
**Exceptions:**
| Code | Condition | Response body |
|---|---|---|
| 400 | Invalid status transition | `{ "error": "Request is not pending manager approval" }` |
| 403 | Caller is not current direct manager | `{ "error": "Forbidden" }` |

### internal-transfer-journey.API05 — POST /api/v1/transfers/:id/hr-action
**Request payload:**
```json
{
  "action": "approve | reject | cancel | reschedule | resume",
  "reason": "string (required for reject/cancel)",
  "effectiveDate": "YYYY-MM-DD (required for reschedule)"
}
```
**Success response (200):**
```json
{ "id": "uuid", "status": "NewStatus" }
```
**Exceptions:**
| Code | Condition | Response body |
|---|---|---|
| 400 | HR approve when eligibility fails | `{ "error": "Cannot approve: rules failed or master data invalid" }` |
| 400 | Invalid status transition | `{ "error": "Action not allowed in current status" }` |
| 403 | HR acting on own request | `{ "error": "Forbidden: Cannot action own request" }` |

### internal-transfer-journey.API06 — POST /api/v1/transfers/:id/withdraw
**Success response (200):**
```json
{ "id": "uuid", "status": "Withdrawn" }
```
**Exceptions:**
| Code | Condition | Response body |
|---|---|---|
| 400 | After HR approval | `{ "error": "This request can no longer be withdrawn. Please contact HR." }` |

### internal-transfer-journey.API07 — POST /api/v1/transfers/:id/fulfilment/:type/action
**Request payload:**
```json
{
  "action": "retry | complete | unable_to_fulfil",
  "evidenceOrReason": "string (required for complete/unable_to_fulfil)"
}
```
**Success response (200):**
```json
{ "id": "uuid", "fulfilmentItemStatus": "NewItemStatus" }
```
**Exceptions:**
| Code | Condition | Response body |
|---|---|---|
| 403 | Caller does not hold the specific functional role | `{ "error": "Forbidden" }` |

## Acceptance Criteria

### Positive Scenarios
1. internal-transfer-journey.AC01 — Given an eligible employee (TE-01), when they submit a valid request, then the request is created in `PendingManagerApproval`, notifications are sent, and the action is audited (D01–D08, T1–T2).
2. internal-transfer-journey.AC02 — Given a request in `PendingManagerApproval`, when the manager approves, then the status becomes `PendingHRValidation` and the HR queue shows the R1-R3 evaluation results (D13, D21, T3).
3. internal-transfer-journey.AC03 — Given a request in `PendingHRValidation`, when HR approves (all rules passing), then the status becomes `PendingFulfilment`, the three fulfilment items are dispatched with unique reference IDs, and organisational data remains unchanged (D16, D21, D24, T6).
4. internal-transfer-journey.AC04 — Given dispatched fulfilment, when Payroll, IT, and Facilities complete independently, then each item is marked `Completed`, and the overall status stays `PendingFulfilment` until the last item completes (D24, D28, D36).
5. internal-transfer-journey.AC05 — Given active fulfilment, when the employee views the request, then they see the individual status of all three items and a summary (e.g., "2 of 3 complete") (D28, D48).
6. internal-transfer-journey.AC06 — Given all three items complete before the effective date, when the effective date arrives at 00:00, then the status moves from `Scheduled` to `Completed` and the organisational data is updated (D16, T9, T13).
7. internal-transfer-journey.AC07 — Given a request in `PendingManagerApproval`, when the manager rejects, then the status becomes `RejectedByManager` (terminal) and the employee is notified (D13, T4).
8. internal-transfer-journey.AC08 — Given a request in `PendingHRValidation` failing a rule, when HR rejects, then the status becomes `RejectedByHR` (terminal) citing the failed rule(s) (D21, D22, T7).
9. internal-transfer-journey.AC09 — Given a request before HR approval, when the employee withdraws, then the status becomes `Withdrawn` (terminal) and the approver loses the item (D09, T5, T8).
10. internal-transfer-journey.AC10 — Given SLAs are breached at Manager, HR, or Fulfilment stages, when the time expires, then a `Delayed` flag is set, reminders/escalations are sent, but no auto-approval occurs (D29–D31).

### Negative Scenarios
11. internal-transfer-journey.AC11 — Given an effective date less than 14 calendar days away, when submitting, then the submission is rejected with a validation message (D05).
12. internal-transfer-journey.AC12 — Given an employee already has an active request, when they submit another, then it is rejected with "You already have an active transfer request" (D07).
13. internal-transfer-journey.AC13 — Given a duplicate submission (double click), when received, then exactly one request is created (D07, D43).
14. internal-transfer-journey.AC14 — Given an employee opening another employee's request, when attempted, then it is refused (Forbidden) (D37).
15. internal-transfer-journey.AC15 — Given an employee tries to approve their own request, when attempted, then it is refused (D23, D37).
16. internal-transfer-journey.AC16 — Given a manager trying to approve someone outside their reporting line, when attempted, then it is refused (D12, D14, D37).
17. internal-transfer-journey.AC17 — Given a non-HR user attempting an HR action, when attempted, then it is refused (D37).
18. internal-transfer-journey.AC18 — Given a Payroll user attempting to update an IT item, when attempted, then it is refused (D37).
19. internal-transfer-journey.AC19 — Given a fulfilment adapter times out, when it happens, then the item status becomes `Retrying` up to 3 times before moving to `Failed` (D24, D25).
20. internal-transfer-journey.AC20 — Given an adapter returns a 4xx or 5xx, when it happens, then 4xx goes to `Failed` with no retry, and 5xx goes to `Retrying` (D25).
21. internal-transfer-journey.AC21 — Given an adapter returns an invalid response, when it happens, then it is treated as an unknown outcome and retried (D25).
22. internal-transfer-journey.AC22 — Given the same fulfilment request is received twice by the adapter, when it happens, then the action is performed once (D24).
23. internal-transfer-journey.AC23 — Given one item succeeds while another fails, when it happens, then the overall status stays `PendingFulfilment` and becomes `FulfilmentFailed` if an item is Unable to Fulfil (D26–D28).
24. internal-transfer-journey.AC24 — Given an invalid status transition is attempted, when it happens, then it is refused with an error and audited (D33).
25. internal-transfer-journey.AC25 — Given any action on a terminal request, when attempted, then it is refused (D34).
26. internal-transfer-journey.AC26 — Given an employee tries to withdraw after HR approval, when attempted, then it is refused with "Please contact HR" (D09).
27. internal-transfer-journey.AC27 — Given proposed details identical to the current assignment, when submitting, then it is rejected (D04).
28. internal-transfer-journey.AC28 — Given an invalid combination sent via API, when received, then it is rejected (D03).
29. internal-transfer-journey.AC29 — Given two users act concurrently on the same request, when it happens, then exactly one transition is applied and the other receives a refresh error (D43).
30. internal-transfer-journey.AC30 — Given fulfilment is incomplete on the effective date, when the date arrives, then the transfer is not applied, flagged "Effective date missed", and HR can reschedule (D17).
31. internal-transfer-journey.AC31 — Given an employee becomes inactive mid-request, when it happens, then the request is `Cancelled` and completed items are reversed (D41, D26).
32. internal-transfer-journey.AC32 — Given master-data is deactivated before HR decision, when HR reviews, then HR cannot approve and must reject (D40).

## Unit Test Cases (spec-derived)

| Test ID | Maps to AC | Scenario | Expected |
|---|---|---|---|
| internal-transfer-journey.UT01 | AC01 | Eligible employee submits valid request | 201 Created, status `PendingManagerApproval` |
| internal-transfer-journey.UT02 | AC02 | Manager approves request | Status changes to `PendingHRValidation` |
| internal-transfer-journey.UT03 | AC03 | HR approves request | Status `PendingFulfilment`, items dispatched |
| internal-transfer-journey.UT04 | AC04 | All adapters complete | Items `Completed`, request stays `PendingFulfilment` until all done |
| internal-transfer-journey.UT05 | AC05 | Employee fetches request status | Summary shows "X of 3 complete" |
| internal-transfer-journey.UT06 | AC06 | Effective date arrives at 00:00 with all items complete | Status `Completed`, DB profile updated |
| internal-transfer-journey.UT07 | AC07 | Manager rejects request | Status `RejectedByManager` |
| internal-transfer-journey.UT08 | AC08 | HR rejects failing request | Status `RejectedByHR` |
| internal-transfer-journey.UT09 | AC09 | Employee withdraws before HR approval | Status `Withdrawn` |
| internal-transfer-journey.UT10 | AC10 | Manager SLA breaches 5 days | Flag `Delayed`, reminder sent to Manager/Skip-level |
| internal-transfer-journey.UT11 | AC11 | Effective date < 14 days | 400 Bad Request |
| internal-transfer-journey.UT12 | AC12 | Employee has active request | 409 Conflict |
| internal-transfer-journey.UT13 | AC13 | Duplicate submission idempotency | 201 Created (Original response returned) |
| internal-transfer-journey.UT14 | AC14 | Employee fetches another's request | 403 Forbidden |
| internal-transfer-journey.UT15 | AC15 | Employee approves own request | 403 Forbidden |
| internal-transfer-journey.UT16 | AC16 | Manager approves for non-report | 403 Forbidden |
| internal-transfer-journey.UT17 | AC17 | Non-HR user calls HR approval | 403 Forbidden |
| internal-transfer-journey.UT18 | AC18 | Payroll updates IT item | 403 Forbidden |
| internal-transfer-journey.UT19 | AC19 | Adapter timeout | Item status `Retrying` |
| internal-transfer-journey.UT20 | AC20 | Adapter 4xx response | Item status `Failed` (No retry) |
| internal-transfer-journey.UT21 | AC21 | Adapter invalid response | Item status `Retrying` |
| internal-transfer-journey.UT22 | AC22 | Duplicate adapter completion | 200 OK (Ignored subsequent) |
| internal-transfer-journey.UT23 | AC23 | Adapter unable to fulfil | Item `UnableToFulfil`, Request `FulfilmentFailed` |
| internal-transfer-journey.UT24 | AC24 | Invalid state transition (e.g., withdraw after approve) | 400 Bad Request |
| internal-transfer-journey.UT25 | AC25 | Action on terminal request | 400 Bad Request |
| internal-transfer-journey.UT26 | AC26 | Employee withdraw after HR approval | 400 Bad Request |
| internal-transfer-journey.UT27 | AC27 | Proposed == Current assignment | 400 Bad Request |
| internal-transfer-journey.UT28 | AC28 | Invalid combo submitted | 400 Bad Request |
| internal-transfer-journey.UT29 | AC29 | Concurrent DB updates | 409 Conflict (Optimistic locking fail) |
| internal-transfer-journey.UT30 | AC30 | Effective date arrives but items incomplete | Request flagged "Effective date missed" |
| internal-transfer-journey.UT31 | AC31 | Employee deactivated mid-flight | Status `Cancelled`, reversals sent |
| internal-transfer-journey.UT32 | AC32 | Master data invalid at HR approval | 400 Bad Request (Must reject) |

## Explicitly Out of Scope
- Real integration with actual Payroll, IT, or Facilities systems.
- Secondary approvers, budget sign-off, or multi-level chains.
- HR override for failing eligibility rules.
- Dedicated manager app or full manager dashboard.
- Email, SMS, and push notifications (APNs/FCM).
- Public-holiday calendar.
- Changing effective date by anyone other than HR.

## Non-Functional Constraints (from constitution.md)
- **Latencies:** API responses ≤ 500 ms; Queue loads ≤ 2s (screen); Status loads ≤ 1.5s (screen) (D51).
- **Concurrency:** Strong idempotent processing for DB locks and adapter calls.
- **Security:** Strict RBAC access controls, JWT, and no PII logged.
