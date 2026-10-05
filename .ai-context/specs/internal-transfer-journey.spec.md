# Spec: Employee Internal Transfer Digital Journey

## Spec ID
internal-transfer-journey

## Status
In Peer Review

## Roles & Assignments
- **Developer:** Pritam Majumder (pritam.majumder@intglobal.com)
- **Gate 1 Reviewer(s):** Shamik Bhattacharya (shamik.bhattacharya@intglobal.com)
- **Gate 2 Reviewer(s):** Subhajit Mukherjee (subhajit.mukherjee@intglobal.com)

## Linked BRD
.ai-context/BRD.md#BRD-001

## Gate Approvals & History
| Gate | Approver Name | Approver Email/ID | Date/Time | Outcome | Approval Comment / Summary |
|---|---|---|---|---|---|
| Gate 1 (Spec Review) | Pending | Pending | Pending | Pending | Pending |
| Gate 2 (Code Review) | Pending | Pending | Pending | Pending | Pending |

## Intent
Enable an employee to initiate, track, and complete an internal transfer request entirely through the One-Point Employee Portal. This orchestrates a single digital journey spanning Manager approval, HR eligibility validation (based on 3 seeded rules), and downstream fulfilment coordination via mock API adapters (Payroll, IT, Facilities). The system enforces strict access matrices, robust idempotency for adapter operations, rollback/cancellation mechanisms (`CancellationPending`), SLA-driven escalations, and an atomic organisational application on a scheduled effective date.

## Context
- Builds on: `.ai-context/architecture.md` (Standard NestJS/PostgreSQL/Redis stack)
- Related: None
- API contract: Defines all internal system API endpoints and authenticated webhook callbacks for mock adapters.

## API Contract (Exhaustive)

### internal-transfer-journey.API01 — POST /api/transfers
**Request payload:**
```json
{
  "proposedDepartmentId": "string",
  "proposedLocationId": "string",
  "proposedRoleId": "string",
  "effectiveDate": "YYYY-MM-DD",
  "reason": "string (optional)"
}
```

**Success response (`201`):**
```json
{
  "id": "uuid",
  "status": "PendingManagerApproval",
  "proposedEffectiveDate": "YYYY-MM-DD"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 400  | Invalid Master Data (D03) | `{"error": "Invalid master data combination"}` |
| 400  | Identical to current (D04)| `{"error": "Proposed details are the same as your current assignment."}` |
| 400  | Date < 14 days (D05)    | `{"error": "Effective date must be at least 14 days in future."}` |
| 409  | Has active request (D07)  | `{"error": "You already have an active transfer request"}` |

### internal-transfer-journey.API02 — GET /api/transfers
**Request payload:**
```json
{}
```

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
  "total": "number"
}
```

**Exceptions:**
| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
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
| 400  | Blocked by prior cancellation (D68) | `{"error": "Approval blocked until the earlier transfer's cancellation is complete."}` |

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

## Explicitly Out of Scope
- Real integrations with external systems.
- OS-level push notifications.
- Holiday calendars for SLA counting.

## Non-Functional Constraints (from constitution.md)
- **Database Models & Technical Constraints**
- **Table:** `TransferRequest` (Unique constraint on `employeeId` where status is in Active Set).
- **Table:** `FulfilmentItem` (Tracks referenceId, status).
- **Table:** `AdapterOperation` (Tracks idempotency keys, payloads, unknown outcomes).
- **Table:** `AuditTrail` (Append-only, self-hashing chain).
- **Transactions:** `ApplyTransfer` must be wrapped in a strict ACID database transaction.
- **Timezone:** All timestamps stored in UTC. All crons (`0 0 * * *`) scheduled against `Asia/Kolkata`.
