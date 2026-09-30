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
.ai-context/BRD.md#BRD-001 (v1.2)

## Intent
Enable an employee to initiate, track, and complete an Internal Transfer Request entirely through the One-Point Employee Portal. This replaces the manual, multi-team coordination process with a single digital journey. Following BRD v1.2, HR approval authorises the transfer and dispatches fulfilment to Payroll, IT, and Facilities. The system supports full cancellation unwinding (Cancel/Reverse), authenticated adapter callbacks, strict idempotency, atomic data application on the effective date, and strict data visibility by role.

## Context
- Builds on: .ai-context/architecture.md (Modular Monolith, Postgres, NestJS, Flutter)
- Related: None
- API contract: Internal endpoints for workflow orchestration; Mocked adapters for downstream fulfilment with defined Callback contract.

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
      "delayedFlag": "boolean",
      "flags": ["string"]
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
  "proposedDetails": { "departmentId": "...", "locationId": "...", "roleId": "...", "approvedNewManagerId": "uuid" },
  "effectiveDate": "YYYY-MM-DD",
  "flags": ["string"],
  "fulfilmentStatus": {
    "payroll": "Pending|InProgress|Retrying|Completed|Failed|UnableToFulfil|ReversalPending|ReversalFailed|Cancelled|Reversed|ReversalWaived",
    "it": "...",
    "facilities": "..."
  },
  "eligibility": [ { "rule": "R1", "passed": true } ],
  "auditTrail": [ { "timestamp": "...", "action": "...", "actor": "..." } ]
}
```
*Note: Fields like `eligibility` and `auditTrail` are strictly stripped from the response based on the caller's RBAC role (BRD-001.D65).*

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
  "action": "approve | reject | cancel | reschedule | resume | assign_approver",
  "reason": "string (required for reject/cancel/reschedule)",
  "effectiveDate": "YYYY-MM-DD (required for reschedule)",
  "assignedApproverId": "string (required for assign_approver)"
}
```
**Success response (200):**
```json
{ "id": "uuid", "status": "NewStatus" }
```
**Exceptions:**
| Code | Condition | Response body |
|---|---|---|
| 400 | HR approve when eligibility fails or prior cancellation blocks | `{ "error": "Cannot approve: rules failed, master data invalid, or blocked by prior cancellation" }` |
| 400 | Reschedule limit reached (3 times) | `{ "error": "Reschedule limit reached. Cancel the request if the transfer cannot go ahead." }` |
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
  "action": "retry | complete | unable_to_fulfil | reverse_manually",
  "evidenceOrReason": "string (required for complete/unable_to_fulfil/reverse_manually)"
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

### internal-transfer-journey.API08 — POST /api/v1/transfers/callbacks (Adapter Webhook)
**Request payload:**
```json
{
  "referenceId": "string",
  "operationType": "DISPATCH | AMEND | CANCEL | REVERSE",
  "idempotencyKey": "string",
  "status": "completed | accepted | cancelled | not executed | failed",
  "errorCode": "string (optional)",
  "errorMessage": "string (optional)",
  "timestamp": "ISO8601"
}
```
**Headers:** `x-adapter-signature: <hmac>`
**Success response (200):**
```json
{ "accepted": true }
```
**Exceptions:**
| Code | Condition | Response body |
|---|---|---|
| 401 | Invalid signature / credential | `{ "error": "Unauthorized" }` |

## Acceptance Criteria

### Positive Scenarios
1. internal-transfer-journey.AC01 — Given an eligible employee (TE-01), when they submit a valid request, then the request is created in `PendingManagerApproval`, notifications are sent, and the action is audited (D01–D08, T1–T2).
2. internal-transfer-journey.AC02 — Given a request in `PendingManagerApproval`, when the manager approves, then the status becomes `PendingHRValidation` and the HR queue shows the R1-R3 evaluation results (D13, D21, T3).
3. internal-transfer-journey.AC03 — Given a request in `PendingHRValidation`, when HR approves (all rules passing), then the status becomes `PendingFulfilment`, the three fulfilment items are dispatched with unique reference IDs and `DISPATCH:1` keys, approved new manager recorded, organisational data unchanged (D16, D21, D24, D53, D67, T6).
4. internal-transfer-journey.AC04 — Given dispatched fulfilment, when Payroll, IT, and Facilities complete independently, then each item is marked `Completed`. Overall stays `PendingFulfilment` until the last one (D24, D28, D36).
5. internal-transfer-journey.AC05 — Given active fulfilment, when the employee views the request, then they see the individual status of all three items and a summary (D28, D48).
6. internal-transfer-journey.AC06 — Given all three items complete before the effective date, when the effective date arrives, then status becomes `Scheduled`, then `Completed` at 00:00 on the effective date. Organisational data updated then, not earlier (D16, D60, T9, T13).
7. internal-transfer-journey.AC07 — Given a request in `PendingManagerApproval`, when the manager rejects, then the status becomes `RejectedByManager` (terminal) (D13, T4).
8. internal-transfer-journey.AC08 — Given a request in `PendingHRValidation` failing a rule, when HR rejects, then the status becomes `RejectedByHR` (terminal) citing the failed rule(s) (D21, D22, D65, T7).
9. internal-transfer-journey.AC09 — Given a request before HR approval, when the employee withdraws, then the status becomes `Withdrawn` (terminal) (D09, T5, T8).
10. internal-transfer-journey.AC10 — Given SLAs are breached at Manager, HR, or Fulfilment stages, when the time expires, then a `Delayed` flag is set, reminders/escalations are sent, but no auto-approval occurs (D29–D31).
11. internal-transfer-journey.AC23 — Given manager becomes inactive, or reporting manager changes during `PendingManagerApproval`, when it happens, then request moves to new manager or HR approver assignment (*AwaitingApproverAssignment*); SLA restarts (D14, D30, D37, D59).
12. internal-transfer-journey.AC24 — Given HR reschedules effective date, when changed, then new date recorded with reason; employee notified; audited; Amend with new key sent to each dispatched item (D17, D53, D66).
13. internal-transfer-journey.AC25 — Given functional user manually completes a `Failed` item with mandatory evidence, when submitted, then item `Completed` (source `Manual`); evidence visible to HR/queue only; audited (D26, D58).
14. internal-transfer-journey.AC26 — Given functional user retries a `Failed` item, when actioned, then same reference ID used; same key after unknown outcome, next key after 4xx; item SLA not restarted (D26, D30, D53).
15. internal-transfer-journey.AC27 — Given HR cancels after HR approval with a mix of completed and open items, when actioned, then request `CancellationPending`; completed items get Reverse; never-executed get `Cancelled`; request `Cancelled` once all items resolved (D10, D54, D55, T14, T17).
16. internal-transfer-journey.AC28 — Given all fulfilment completes before the effective date, when effective date run executes, then department, location, role, manager and last transfer date change together in one unit (D16, D60, D61).
17. internal-transfer-journey.AC29 — Given real-time notification fails, when saved, then persistent notification available when user next opens portal; workflow unaffected (D45, D47).
18. internal-transfer-journey.AC30 — Given HR approves a request with no designated manager, when attempting, then approval blocked until HR selects active manager in target department; manager applied on effective date (D21, D67).
19. internal-transfer-journey.AC31 — Given employee with no active manager submits, when received, then *AwaitingApproverAssignment*; employee sees "Waiting for HR"; HR assigns skip-level manager; 5-day SLA starts at assignment (D29, D59).
20. internal-transfer-journey.AC32 — Given HR cancels while an item is `InProgress`; adapter confirms Cancel, when received, then item `Cancelled` with no Reverse; request `Cancelled` when all items resolved (D54, D55).
21. internal-transfer-journey.AC33 — Given a `ReversalFailed` item is resolved by retry, manual reversal, or HR Lead waiver, when actioned, then item `Reversed` or `ReversalWaived`; request moves to `Cancelled` only when last item resolved (D55, D58, T17).

### Negative Scenarios
22. internal-transfer-journey.AC11 — Given effective date < 14 calendar days away, when submitting, then submission rejected (D05).
23. internal-transfer-journey.AC12 — Given employee already has active request, when submitting another, then rejected "You already have an active transfer request" (D07).
24. internal-transfer-journey.AC13 — Given duplicate submission, when received, then exactly one request created; same idempotency key returns original (D07, D43).
25. internal-transfer-journey.AC14 — Given employee opens another employee's request, when attempted, then refused (D37).
26. internal-transfer-journey.AC15 — Given employee tries to approve own request, when attempted, then refused (D23, D37).
27. internal-transfer-journey.AC16 — Given manager tries to approve someone outside reporting line, when attempted, then refused (D12, D14, D37).
28. internal-transfer-journey.AC17 — Given non-HR user attempts HR action, when attempted, then refused (D37).
29. internal-transfer-journey.AC18 — Given Payroll user attempts to update IT item, when attempted, then refused (D37).
30. internal-transfer-journey.AC19 — Given fulfilment adapter times out, when it happens, then `Retrying` with same key and payload, up to 3 automatic retries, then `Failed` (unknown outcome) (D25, D53).
31. internal-transfer-journey.AC20 — Given adapter returns 4xx or 5xx, when received, then 4xx -> `Failed` (no automatic retry); 5xx -> automatic retry as for timeout (D25).
32. internal-transfer-journey.AC21 — Given adapter returns invalid response, when received, then treated as unknown outcome and retried (D25).
33. internal-transfer-journey.AC22 — Given same operation received twice by adapter, when it happens, then action performed once; second call returns original result (D53, D56).
34. internal-transfer-journey.ACN13 — Given one item succeeds while another fails, when happened, then overall `PendingFulfilment` while failure is open, then `FulfilmentFailed` after Unable to Fulfil. Never `Completed` (D26–D28).
35. internal-transfer-journey.ACN14 — Given invalid status transition attempted, when attempted, then refused with error, audited (D33).
36. internal-transfer-journey.ACN15 — Given any action on withdrawn, completed, rejected, or cancelled request, when attempted, then refused (D34).
37. internal-transfer-journey.ACN16 — Given employee tries to withdraw after HR approval, when attempted, then refused "Please contact HR" (D09).
38. internal-transfer-journey.ACN17 — Given proposed details identical to current assignment, when submitting, then rejected (D04).
39. internal-transfer-journey.ACN18 — Given invalid combination sent via API, when received, then rejected (D03).
40. internal-transfer-journey.ACN19 — Given two users act concurrently on same request, when happened, then exactly one transition applied, other gets refresh error (D43).
41. internal-transfer-journey.ACN20 — Given fulfilment incomplete on effective date, when date arrives, then transfer not applied. *EffectiveDateMissed* shown. HR can reschedule or cancel (D17, D60).
42. internal-transfer-journey.ACN21 — Given employee becomes inactive mid-request, when happened, then before HR approval: `Cancelled` (System). After: `CancellationPending`, unwound, then `Cancelled` (D11, D41, D55, T15, T16).
43. internal-transfer-journey.ACN22 — Given master-data deactivated before HR decision, when reviewed, then HR cannot approve, must reject "Proposed position invalid" (D40).
44. internal-transfer-journey.ACN23 — Given HR cancels and one downstream reversal fails, when happened, then request stays `CancellationPending`; item `ReversalFailed`; queue notified, HR escalated after 1 day (D29, D55).
45. internal-transfer-journey.ACN24 — Given adapter sends original callback after manual completion/cancellation, when received, then no backward transition; no duplicate notification; *AdapterDiscrepancy* if contradicts record (D56).
46. internal-transfer-journey.ACN25 — Given callback with unknown IDs, missing credential, or no auth, when received, then rejected, audited as security event (D57).
47. internal-transfer-journey.ACN26 — Given effective-date run fails or does not run, when happened, then recovery check applies request; after 01:00 *ApplicationOverdue* and HR alerted; never left `Scheduled` (D62).
48. internal-transfer-journey.ACN27 — Given one organisational field fails to save during application, when happened, then whole change rolled back; organisational record unchanged; audited; recovery under D62 (D61, D62).
49. internal-transfer-journey.ACN28 — Given same business event processed twice, when happened, then recipient receives one notification (D63).
50. internal-transfer-journey.ACN29 — Given employee submits new request while earlier request is `CancellationPending`, when submitted, then submission allowed; HR Approve refused *BlockedByPriorCancellation*; approval allowed once earlier `Cancelled` (D07, D35, D68).
51. internal-transfer-journey.ACN30 — Given non-HR calls APIs for TE-04 request, when returning, then disciplinary data, eligibility detail, HR-only fields are absent from response (D22, D65).
52. internal-transfer-journey.ACN31 — Given manual completion attempted on invalid state, wrong role, or empty evidence, when attempted, then refused, audited (D23, D37, D58).
53. internal-transfer-journey.ACN32 — Given last item completes at 23:59:59 on day before effective date, and second run at 00:00:01, when happened, then first is `Scheduled` applied at 00:00; second is *EffectiveDateMissed* applied immediately. Same result (D43, D60).
54. internal-transfer-journey.ACN33 — Given audit record edited directly in DB, when verified, then next verification reports break and alerts HR Lead (D64).
55. internal-transfer-journey.ACN34 — Given HR tries 4th reschedule, when attempted, then refused "Reschedule limit reached" (D66).
56. internal-transfer-journey.ACN35 — Given new Amend operation sent before previous Dispatch is processed, when happened, then Amend is deferred until Dispatch outcome is known (D53).
57. internal-transfer-journey.ACN36 — Given adapter Cancel operation returns "Not Supported", when received, then item stays `ReversalPending`, portal waits for original Dispatch outcome (D54).
58. internal-transfer-journey.ACN37 — Given HR assigned skip-level manager becomes inactive, when happened, then request flagged *AwaitingApproverAssignment* again, SLA restarts upon next assignment (D59).
59. internal-transfer-journey.ACN38 — Given duplicate callback outcome received, when processed, then ignored and audited, no notifications (D56).

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
| internal-transfer-journey.UT23 | AC23 | Manager inactive during approval | Route to new manager or HR |
| internal-transfer-journey.UT24 | AC24 | HR reschedules effective date | `Amend` dispatched, new date saved |
| internal-transfer-journey.UT25 | AC25 | Manual completion of failed item | Item `Completed`, source `Manual` |
| internal-transfer-journey.UT26 | AC26 | Manual retry of failed item | Key incremented for 4xx, reused for timeout |
| internal-transfer-journey.UT27 | AC27 | HR cancels request | Request `CancellationPending`, items unwound |
| internal-transfer-journey.UT28 | AC28 | Atomic data application | Organiational data updated atomically |
| internal-transfer-journey.UT29 | AC29 | Notification real-time fail | Persisted for next session |
| internal-transfer-journey.UT30 | AC30 | No designated manager on HR approve | Must assign active target manager |
| internal-transfer-journey.UT31 | AC31 | No manager at submission | Route to HR for approver assignment |
| internal-transfer-journey.UT32 | AC32 | Cancel during `InProgress` | Item `Cancelled` if adapter confirms |
| internal-transfer-journey.UT33 | AC33 | Resolve `ReversalFailed` | Moves to `Reversed` or `ReversalWaived` |
| internal-transfer-journey.UT11 | ACN11 | Effective date < 14 days | 400 Bad Request |
| internal-transfer-journey.UT12 | ACN12 | Employee has active request | 409 Conflict |
| internal-transfer-journey.UT13 | ACN13 | Duplicate submission idempotency | 201 Created (Original response returned) |
| internal-transfer-journey.UT14 | ACN14 | Employee fetches another's request | 403 Forbidden |
| internal-transfer-journey.UT15 | ACN15 | Employee approves own request | 403 Forbidden |
| internal-transfer-journey.UT16 | ACN16 | Manager approves for non-report | 403 Forbidden |
| internal-transfer-journey.UT17 | ACN17 | Non-HR user calls HR approval | 403 Forbidden |
| internal-transfer-journey.UT18 | ACN18 | Payroll updates IT item | 403 Forbidden |
| internal-transfer-journey.UT19 | ACN19 | Adapter timeout | Item status `Retrying` |
| internal-transfer-journey.UT20 | ACN20 | Adapter 4xx response | Item status `Failed` (No retry) |
| internal-transfer-journey.UT21 | ACN21 | Adapter invalid response | Item status `Retrying` |
| internal-transfer-journey.UT22 | ACN22 | Duplicate adapter completion | 200 OK (Ignored subsequent) |
| internal-transfer-journey.UTN13 | ACN13 | Item fails while another succeeds | Request `PendingFulfilment` or `FulfilmentFailed` |
| internal-transfer-journey.UTN14 | ACN14 | Invalid state transition | 400 Bad Request |
| internal-transfer-journey.UTN15 | ACN15 | Action on terminal request | 400 Bad Request |
| internal-transfer-journey.UTN16 | ACN16 | Employee withdraw after HR approval | 400 Bad Request |
| internal-transfer-journey.UTN17 | ACN17 | Proposed == Current assignment | 400 Bad Request |
| internal-transfer-journey.UTN18 | ACN18 | Invalid combo submitted | 400 Bad Request |
| internal-transfer-journey.UTN19 | ACN19 | Concurrent DB updates | 409 Conflict (Optimistic locking fail) |
| internal-transfer-journey.UTN20 | ACN20 | Effective date missed | Flag `EffectiveDateMissed` |
| internal-transfer-journey.UTN21 | ACN21 | Employee deactivated mid-flight | `Cancelled` or `CancellationPending` |
| internal-transfer-journey.UTN22 | ACN22 | Master data invalid at HR approval | 400 Bad Request (Must reject) |
| internal-transfer-journey.UTN23 | ACN23 | Reversal fails | `ReversalFailed`, escalate |
| internal-transfer-journey.UTN24 | ACN24 | Late callback after manual complete | Ignore if same, alert if discrepancy |
| internal-transfer-journey.UTN25 | ACN25 | Unauthorized callback | 401 Unauthorized |
| internal-transfer-journey.UTN26 | ACN26 | Recovery job processes missed items | `ApplicationOverdue` caught up |
| internal-transfer-journey.UTN27 | ACN27 | Partial application fail | Rollback |
| internal-transfer-journey.UTN28 | ACN28 | Duplicate notification trigger | Single notification created |
| internal-transfer-journey.UTN29 | ACN29 | Submit while cancellation pending | Allowed but block HR approve |
| internal-transfer-journey.UTN30 | ACN30 | API filters HR-only fields | PII stripped for non-HR |
| internal-transfer-journey.UTN31 | ACN31 | Manual completion invalid rules | 400 Bad Request / 403 Forbidden |
| internal-transfer-journey.UTN32 | ACN32 | Concurrent run completions | Serialized handling |
| internal-transfer-journey.UTN33 | ACN33 | Audit log tamper check | Break detected |
| internal-transfer-journey.UTN34 | ACN34 | 4th reschedule | 400 Bad Request |
| internal-transfer-journey.UTN35 | ACN35 | Amend while Dispatch inflight | Amend deferred |
| internal-transfer-journey.UTN36 | ACN36 | Cancel not supported by adapter | Wait for dispatch outcome |
| internal-transfer-journey.UTN37 | ACN37 | Assigned manager becomes inactive | Re-flag `AwaitingApproverAssignment` |
| internal-transfer-journey.UTN38 | ACN38 | Duplicate callback outcome | Ignore and audit |

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
- **Security:** Strict RBAC access controls, JWT, and no PII logged. Audit is tamper-evident.
