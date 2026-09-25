# Spec: Employee Internal Transfer Digital Journey

## Spec ID
internal-transfer-journey

## Status
Draft

## Roles & Assignments
- **Developer:** Pritam Majumder
- **Gate 1 Reviewer(s):** Shamik Bhattacharya
- **Gate 2 Reviewer(s):** Subhajit Mukherjee

## Linked BRD
.ai-context/BRD.md#BRD-001

## Gate Approvals & History
| Gate | Approver Name | Approver Email/ID | Date/Time | Outcome | Approval Comment / Summary |
|---|---|---|---|---|---|
| Gate 1 (Spec Review) | Pending | Pending | Pending | Pending | Pending |
| Gate 2 (Code Review) | Pending | Pending | Pending | Pending | Pending |

## Intent
Enable an employee to initiate, track, and complete an Internal Transfer Request entirely through the One-Point Employee Portal. This digital journey will replace the manual, multi-team coordination process with a single automated workflow orchestrated across Manager, HR, Payroll, IT, and Facilities, providing the employee with a unified view of progress.

## Context
- Builds on: .ai-context/architecture.md (Modular Monolith)
- Related: None
- API contract: Internal endpoints for workflow orchestration and mocked adapters for downstream fulfilment.

## API Contract (Mandatory if API surface exists)

### internal-transfer-journey.API01 — GET /api/v1/master-data
**Request payload:** None
**Success response (`200`):**
```json
{
  "departments": [{"id": 1, "name": "Engineering"}],
  "locations": [{"id": 1, "name": "New York"}],
  "roles": [{"id": 1, "name": "Senior Developer"}]
}
```

### internal-transfer-journey.API02 — POST /api/v1/transfers
**Request payload:**
```json
{
  "departmentId": 1,
  "locationId": 1,
  "roleId": 1,
  "effectiveDate": "YYYY-MM-DD",
  "reason": "Career growth"
}
```
**Success response (`201`):**
```json
{
  "id": "req-123",
  "status": "PendingManagerApproval",
  "slaDeadline": "YYYY-MM-DD"
}
```
**Exceptions:**
| Code | Condition | Response body |
|---|---|---|
| 400 | Effective date < 14 days or Active request already exists | `{"error": "Validation failed"}` |

### internal-transfer-journey.API03 — GET /api/v1/transfers/{id}
**Request payload:** None
**Success response (`200`):**
```json
{
  "id": "req-123",
  "status": "PendingFulfilment",
  "pendingWith": "Payroll, IT, Facilities",
  "slaDeadline": "YYYY-MM-DD",
  "fulfilment": {
    "payroll": "Completed",
    "it": "Pending",
    "facilities": "Delayed"
  }
}
```

### internal-transfer-journey.API04 — POST /api/v1/transfers/{id}/withdraw
**Request payload:** None
**Success response (`200`):**
```json
{ "status": "Withdrawn" }
```

### internal-transfer-journey.API05 — POST /api/v1/transfers/{id}/approve
**Request payload:** None
**Success response (`200`):**
```json
{ "status": "PendingHRValidation" }
```

### internal-transfer-journey.API06 — POST /api/v1/transfers/{id}/reject
**Request payload:**
```json
{ "reason": "Optional reason" }
```
**Success response (`200`):**
```json
{ "status": "RejectedByManager" }
```

### internal-transfer-journey.API07 — GET /api/v1/transfers
**Request payload:** None (Uses query params: `status`, `scope`, `stakeholder`, `subStatus`)
**Success response (`200`):**
```json
[
  {
    "id": "req-123",
    "status": "PendingManagerApproval",
    "slaDeadline": "YYYY-MM-DD"
  }
]
```

### internal-transfer-journey.API08 — GET /api/v1/notifications
**Request payload:** None
**Success response (`200`):**
```json
[
  {
    "id": "notif-1",
    "message": "Transfer request status changed to PendingHRValidation",
    "read": false
  }
]
```

## Acceptance Criteria

1. `internal-transfer-journey.AC1` — Given an authenticated employee with no active transfer request, when they submit a new transfer request with valid master data and an effective date >= 14 calendar days away, then the request is saved in `PendingManagerApproval` status.
2. `internal-transfer-journey.AC2` — Given an employee with an active non-terminal request, when they attempt to submit a new request, then the system rejects it.
3. `internal-transfer-journey.AC3` — Given an employee with an active non-terminal request, when they choose to withdraw it, then the request status changes to `Withdrawn`.
4. `internal-transfer-journey.AC4` — Given a request in `PendingManagerApproval`, when the manager approves it, then the status changes to `PendingHRValidation`.
5. `internal-transfer-journey.AC5` — Given a request in `PendingManagerApproval`, when the manager rejects it, then the status changes to `RejectedByManager` and is terminal.
6. `internal-transfer-journey.AC6` — Given a request in `PendingHRValidation`, when HR validates eligibility and the employee has >= 6 months tenure, no active disciplinary case, and no transfer in the last 6 months, then the request status changes to `PendingFulfilment` and organizational data is updated automatically.
7. `internal-transfer-journey.AC7` — Given a request in `PendingHRValidation`, when HR eligibility validation fails on any of the 3 rules, then the request status changes to `RejectedByHR` with the specific rule cited.
8. `internal-transfer-journey.AC8` — Given a request in `PendingFulfilment`, when Payroll, IT, and Facilities all complete their actions, then the request status changes to `Completed`.
9. `internal-transfer-journey.AC9` — Given an authenticated employee, when they view their request, they see the current status and any pending actions with stakeholders.
10. `internal-transfer-journey.AC10` — Given a request in `PendingManagerApproval` for >5 business days, when the SLA is evaluated, then a reminder notification is sent to the manager's manager and the request remains in `PendingManagerApproval`.
11. `internal-transfer-journey.AC11` — Given a fulfilment stakeholder (Payroll/IT/Facilities) item pending >3 business days, when the SLA is evaluated, then that stakeholder's sub-status changes to `Delayed` and a reminder notification is sent to that stakeholder's queue, without altering the overall request status.
12. `internal-transfer-journey.AC12` — Given a request in `PendingFulfilment` where only some stakeholders have completed their action, when status is queried, then the request remains `PendingFulfilment` and each stakeholder's individual sub-status is accurately reflected.
13. `internal-transfer-journey.AC13` — Given an authenticated Manager, when they request their approvals queue, then only requests where they are the reporting manager are returned.
14. `internal-transfer-journey.AC14` — Given an authenticated HR-role user, when they request the HR validation queue, then all org-wide requests in `PendingHRValidation` are returned, regardless of which employee submitted them.
15. `internal-transfer-journey.AC15` — Given any request status transition, when the transition occurs, then an in-app notification is generated for the relevant party (employee on any change; stakeholder queue on new item arrival; skip-level manager / stakeholder queue on SLA breach).
16. `internal-transfer-journey.AC16` — Given an authenticated user without the Manager relationship to a given request, when they attempt to approve/reject it, then the action is denied (403).
17. `internal-transfer-journey.AC17` — Given an authenticated Employee, when they attempt to view or act on another employee's request, then access is denied (403).
18. `internal-transfer-journey.AC18` — Given an authenticated user attempts to approve a request via API05, when their session role/relationship does not match the request's current pending stage, then the request is rejected (403) regardless of any client-supplied role value.

## Unit Test Cases (spec-derived)

| Test ID | Maps to AC | Scenario | Expected |
|---|---|---|---|
| `internal-transfer-journey.UT01` | AC1 | Valid submission with >= 14 days effective date | Request saved, status `PendingManagerApproval` |
| `internal-transfer-journey.UT02` | AC1 | Invalid submission with < 14 days effective date | Validation error |
| `internal-transfer-journey.UT03` | AC2 | Employee submits request when one is already active | Validation error |
| `internal-transfer-journey.UT04` | AC3 | Employee withdraws active request | Status `Withdrawn` |
| `internal-transfer-journey.UT05` | AC4 | Manager approves request | Status `PendingHRValidation` |
| `internal-transfer-journey.UT06` | AC5 | Manager rejects request | Status `RejectedByManager` |
| `internal-transfer-journey.UT07` | AC6 | HR approves eligible request | Status `PendingFulfilment`, Org data updated |
| `internal-transfer-journey.UT08` | AC7 | HR attempts approval but employee < 6mo tenure | Status `RejectedByHR` (Rule 1) |
| `internal-transfer-journey.UT09` | AC7 | HR attempts approval but open disciplinary case | Status `RejectedByHR` (Rule 2) |
| `internal-transfer-journey.UT10` | AC7 | HR attempts approval but transfer within 6mo | Status `RejectedByHR` (Rule 3) |
| `internal-transfer-journey.UT11` | AC8 | Payroll, IT, Facilities all confirm completion | Status `Completed` |
| `internal-transfer-journey.UT12` | AC9 | Employee fetches request status | Correct status and pending action returned |
| `internal-transfer-journey.UT13` | AC10 | Manager >5 business days SLA evaluated (incl. weekends) | Skip-level reminder sent, status `PendingManagerApproval` |
| `internal-transfer-journey.UT14` | AC11 | Fulfilment >3 business days SLA evaluated | Sub-status `Delayed`, reminder sent to queue, status unchanged |
| `internal-transfer-journey.UT15` | AC12 | Fulfilment partial completion | Status `PendingFulfilment`, individual sub-statuses reflect completion |
| `internal-transfer-journey.UT16` | AC13 | Manager views approvals queue | Returns only requests assigned to this manager |
| `internal-transfer-journey.UT17` | AC14 | HR views HR validation queue | Returns all org-wide `PendingHRValidation` requests |
| `internal-transfer-journey.UT18` | AC15 | Status transition occurs | Notification generated for employee and target stakeholder |
| `internal-transfer-journey.UT19` | AC16, AC17 | Non-manager user attempts to approve request | Action denied (403) |
| `internal-transfer-journey.UT20` | AC17 | Employee attempts to view another employee's request | Action denied (403) |
| `internal-transfer-journey.UT21` | AC18 | User attempts approval with mismatched session role | Action denied (403) |

## Explicitly Out of Scope

- Real third-party integration with actual Payroll, IT, or Facilities systems (using mocked adapters).
- Any approval step beyond a single Manager gate and a single HR gate.
- A dedicated manager-facing app or full manager dashboard.
- Email or SMS notifications.
- Holiday-awareness in SLA calculations.

## Non-Functional Constraints (from constitution.md)

- p95 API Latency Targets: Tier 2 (Standard CRUD) < 500 ms
- Role-based Access Control (RBAC) must strictly enforce visibility and actions across Employee, Manager, HR, Payroll, IT, and Facilities roles.
