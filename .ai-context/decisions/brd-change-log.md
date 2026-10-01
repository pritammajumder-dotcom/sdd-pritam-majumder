# BRD Change Log

Traceability and history only. The authoritative requirement baseline is always `.ai-context/BRD.md`. Archived versions are in `.ai-context/archive/brd/`.

| Version | Date | Status | Summary | Location |
|---|---|---|---|---|
| 1.0 | Not recorded (on or before 2026-09-25) | Superseded (Gate 0: Changes Requested, 2026-09-28) | Initial BRD-001 baseline | `archive/brd/BRD-v1.0.md` |
| 1.1 | 2026-09-28 | Superseded (Gate 0: Changes Requested, 2026-09-29) | Revision against Gate 0 feedback G0-01 to G0-28 | `archive/brd/BRD-v1.1.md` |
| 1.2 | 2026-09-29 | Approved (Gate 0, 2026-10-01), subject to D71 | Revision against Gate 0 re-review feedback G0R-01 to G0R-26 | `BRD.md` |

---

### Version 1.0

Status: Superseded

Summary:
Initial Employee Internal Transfer Digital Journey requirements (BRD-001). This entry was recorded afterwards. v1.0 carried no version header, and its creation date and author were not recorded.

Changes:
- Initial BRD

Gate 0:
Changes Requested. Shamik Bhattacharya, 2026-09-28. See `pr_reviews/BRD-20260928.md`.

---

### Version 1.1

Status: Superseded by v1.2 (2026-09-29)

Change Date:
2026-09-28

Change Summary:
Revision of BRD-001 in response to Gate 0 feedback (28 items and mandatory acceptance scenarios) from Shamik Bhattacharya (PM, Gate 0 Reviewer). There is no new client source document in `docs/`. The Gate 0 review record (`pr_reviews/BRD-20260928.md`) drives this revision. BRD-001 decisions now have clause-level IDs (`BRD-001.D01` to `D52`) and acceptance scenarios (`AS-P01` to `P10`, `AS-N01` to `N22`) for traceability. Clauses marked **(Assumption)** need reviewer confirmation.

Headline change:
The effective date, not HR approval, is now the point the transfer takes effect. Organisational data changes only on the effective date, and only after all three fulfilment items are complete (D16).

Added Requirements:
None at BRD-ID level (BRD-001 stays the only requirement). New clauses within BRD-001:
- D03 valid master-data combinations; D04 no-change request not allowed; D07 backend and database enforcement of single active request plus submission idempotency; D08 submission snapshot
- D10 HR cancellation; D11 system cancellation
- D14 manager change while pending
- D17 fulfilment not finished by the effective date, and HR reschedule; D18 effective date passes before HR decision; D19 system of record
- D21 HR action model; D22 HR rejection reason; D23 segregation of duties
- D24 fulfilment reference ID and idempotency; D25 adapter outcome table; D26 failed-item handling and reversal; D27 permanent failure and `FulfilmentFailed`; D28 partial-completion visibility
- D29 HR SLA and escalation ladder for all stages; D30 SLA restart; D31 business-day rules and examples
- D32 to D36 status model, exhaustive transition table, terminal-state rules, item statuses
- D37 role access matrix
- D39 profile changes; D40 master-data changes
- D41 employee inactive; D42 manager or functional user inactive
- D43 concurrency; D44 audit trail; D45 to D47 notification definition, recipients, failure handling
- D51 performance; D52 seeded test data
- Mandatory acceptance scenarios section

Modified Requirements:
- BRD-001, request withdrawal: v1.0 allowed withdrawal at any point before Completed. v1.1 allows it only before HR approval (D09), with HR cancellation afterwards (D10).
- BRD-001, organisational update timing: v1.0 updated it on HR approval. v1.1 updates it on the effective date, after all fulfilment is complete (D16).
- BRD-001, HR eligibility: v1.0 left it unclear whether HR acts manually. v1.1 has the system evaluate the rules and HR decide, with no auto-approval or auto-rejection and no override (D21).
- BRD-001, manager SLA reminder: v1.0 sent it to the skip-level only. v1.1 sends it to the manager and skip-level, plus HR escalation and reassignment at 10 business days (D29).
- BRD-001, status taxonomy: added `FulfilmentFailed`, `Scheduled`, `Cancelled`. Item statuses extended. `Delayed` is now a flag, not a status (D32, D36).
- BRD-001, completion: `Completed` now means the organisational change has been applied on the effective date (D16, T9, T10, T13).
- BRD-001, notifications: "push notification" defined as in-app only. OS push added to out of scope explicitly (D45).
- BRD-001, access: the general statement is replaced by a full matrix (D37, D50).
- BRD-001, mock adapters: must simulate every D25 outcome and support idempotency and reversal (D49).
- Scope and Out of Scope lists updated to match.

Removed Requirements:
- None. The v1.0 clause "withdraw at any point before Completed" is superseded by D09 and D10. It is kept for history in `archive/brd/BRD-v1.0.md`.

Unchanged Requirements:
- BRD-001 objective, sponsor, and priority
- D01, D02 master-data selection and self-seeding; D05 14-calendar-day notice; D06 optional reason; D13 manager approve/reject; D15 self-seeded profile data; D20 three eligibility rules; parallel fulfilment; fulfilment SLA of 3 business days; zero external dependencies; single Manager and single HR gate

Affected Business Domains:
- Transfers (request lifecycle), Eligibility, Fulfilment orchestration, Master data, Employee profile/organisation, Notifications, Access control, Audit

Affected Modules:
- transfers, eligibility, fulfilment orchestration and adapters (payroll, it, facilities), master-data, employees/org, notifications, rbac/auth, audit, scheduler (effective-date application, SLA reminders and escalations)

API Impact:
- New actions: HR cancel, HR reschedule, HR resume, HR reassign approver, fulfilment retry / manual complete / Unable to Fulfil, adapter completion callback.
- Withdraw restricted by status. Every state-changing endpoint needs version/state checks, idempotency keys, and consistent 403/404 handling.
- The master-data endpoint must return valid combinations.
- New audit and timeline read endpoints.

Database Impact:
- New statuses and item statuses.
- Combination table for master data.
- Request snapshot fields; effective date and revised effective date; flags (Delayed, Effective date missed, Eligibility changed, Assignment changed, Position invalid).
- Fulfilment reference ID (unique) and attempt history; reversal records.
- Concurrency-safe constraint for one non-terminal request per employee; optimistic version column.
- Append-only audit table; notification table.
- Employment status and HR Lead designation on users.
- Seed data expanded to D52.

Frontend Impact:
- Cascading master-data pickers; per-item fulfilment status and "n of 3" summary; Delayed and Effective date missed indicators.
- Withdraw hidden after HR approval.
- HR queue shows rule results and has reject-reason rules, cancel, reschedule, resume, and reassign.
- Functional queue failure actions; Notification Centre and in-app alerts; stale-state refresh handling; employee timeline.

Backend Impact:
- State machine enforcing T1 to T15 only; segregation-of-duties checks; live re-evaluation at HR decision.
- Adapter orchestration with retry, idempotency, callbacks, and reversal.
- Scheduled jobs for effective-date application, SLA reminders and escalations, and effective-date-missed detection.
- Inactive-user handling; audit service; notification persistence.

Test Impact:
- Test case generation will occur during the TDD phase, following Gate 1 Spec approval.
- Add AS-P01 to P10 and AS-N01 to N22; business-day examples E1 to E7; adapter outcome matrix; concurrency and duplicate tests; access-matrix tests; performance tests against D51.

Existing Implementation Impact:
- None. No application implementation exists for this BRD yet.
- Spec generation is deferred until v1.1 receives Gate 0 approval.

Architecture Impact:
- Needs a scheduler/job capability (effective date, SLAs) and a retry mechanism for adapter calls. Check whether these fit the approved stack (NestJS, PostgreSQL, Redis) or need an ADR.
- Idempotency and optimistic concurrency match the existing constitution rule (`Idempotency-Key` on state-changing mutations).
- The audit trail falls under the Critical coverage tier (`audit`).
- TL (Subhajit Mukherjee) technical concurrence is needed at Gate 1, because the security posture (access matrix) and architectural constraints (jobs, retries) are affected.

Gate 0 Status:
Changes Requested

Approval Date:
Not approved (re-review 2026-09-29)

Approved By:
Not approved

Approval Notes:
Shamik Bhattacharya (Gate 0 Reviewer), 2026-09-29: Changes Requested, "almost development-ready". The feedback had 20 numbered P0/P1 items, 4 development-readiness items, 1 terminology item, and additional acceptance scenarios (`pr_reviews/BRD-20260929.md`). The reviewer confirmed the listed assumptions as written during the v1.2 revision. All items are addressed in v1.2.

---

### Version 1.2

Status: Approved (Gate 0, 2026-10-01)

Change Date:
2026-09-29

Change Summary:
Revision of BRD-001 in response to the Gate 0 re-review of v1.1 by Shamik Bhattacharya (PM, Gate 0 Reviewer). The feedback is recorded as G0R-01 to G0R-26 in `pr_reviews/BRD-20260929.md`. There is no new client source document in `docs/`, so the review record drives this revision. Clause IDs D01 to D52 keep their meaning, and D53 to D71 are new. All v1.1 **(Assumption)** clauses were confirmed as written by the reviewer on 2026-09-29, and v1.2 has no open assumptions. The reviewer also made three decisions during the revision: cancellation becomes terminal only after unwind (`CancellationPending`); a new submission is allowed while an earlier cancellation unwinds, but HR approval is blocked; and the new manager comes from master data, with HR selecting one where there is a gap. v1.1 is archived unchanged at `archive/brd/BRD-v1.1.md`.

Headline changes:
- HR or System cancellation after HR approval is no longer immediately terminal. The new non-terminal status `CancellationPending` lasts until every item is `Cancelled`, `Reversed` or `ReversalWaived` (D10, D55).
- The fulfilment reference ID identifies an item. Each Dispatch, Amend, Cancel or Reverse operation has its own idempotency key (D24, D53).

Added Requirements:
None at BRD-ID level (BRD-001 stays the only requirement). New clauses within BRD-001:
- D53 adapter operations and per-operation idempotency keys
- D54 Cancel operation for dispatched instructions
- D55 unwinding on cancellation and resolving reversal failures (owner, retry, manual reversal, HR Lead waiver, escalation, final resolution)
- D56 late, duplicate and contradictory callbacks
- D57 callback authentication and validation
- D58 manual completion controls
- D59 approver assignment when there is no active manager
- D60 effective-date cutoff
- D61 atomic application of the organisational change
- D62 effective-date run failure and recovery
- D63 notification idempotency
- D64 testable definition of tamper-evident
- D65 server-side protection of sensitive data
- D66 reschedule limits
- D67 new reporting manager
- D68 new request while an earlier cancellation is unwinding
- D69 minimum adapter contract
- D70 separation of request status, item status and flags
- D71 development entry conditions
- Request status `CancellationPending`; item status `ReversalWaived`; transitions T16 to T18
- Flags *AwaitingApproverAssignment*, *BlockedByPriorCancellation*, *NewManagerRequired*, *ApplicationOverdue*, *AdapterDiscrepancy*
- Acceptance scenarios AS-P23 to AS-P33 and AS-N23 to AS-N38 (AS-P11 to AS-P22 intentionally unused, so the reviewer's IDs are kept); business-day example E8; test employees TE-13 and TE-14
- Decision Register (replaces "Open at BRD stage"); Appendix B (re-review traceability)

Modified Requirements:
- D03: combinations may name a designated reporting manager. The no-headcount assumption is confirmed.
- D07: the single-active rule now applies to the "active" set, which excludes `CancellationPending`. The DB mechanism is deferred to `plan.md` (D71).
- D10, D11: cancellation after HR approval goes to `CancellationPending`, not directly to `Cancelled`.
- D12, D14: approver can be HR-assigned. A replaced manager who had not acted loses all access. The approval-stands assumption is confirmed.
- D16, D17, D18: new-manager application, cutoff (D60), atomicity (D61) and reschedule limits (D66) added. Assumptions confirmed.
- D21: HR Approve additionally requires an approved new manager and no earlier request of the employee in `CancellationPending`.
- D22: the employee sees failed rule names only, never disciplinary details. The non-rule rejection assumption is confirmed. Enforcement is at API level (D65).
- D23: extended to fulfilment, unwind, assignment and manual-completion actions, and to HR self-assignment.
- D24: the reference ID is no longer the idempotency key. *(Changed from v1.1.)*
- D25: retries reuse the operation key and an identical payload. An exhausted-retries outcome is recorded as unknown.
- D26: manual retry key rule; manual retries do not restart the SLA. Reversal text moved to D55.
- D27: Resume uses D53. Cancel now goes to `CancellationPending`.
- D29: new SLA rows for approver assignment, unwind, `ReversalFailed` and overdue application. v1.1 values confirmed.
- D30: approver assignment and the D68 block clearance restart SLAs. Manual retries do not.
- D31: Asia/Kolkata confirmed. UTC storage and Asia/Kolkata display. Example E8.
- D32 to D36: `CancellationPending`, T9/T10/T13 conditions, T14 target changed, T15 narrowed, T16 to T18 added. D34 exception removed. D35 splits non-terminal and active sets. D36 item-status table with resolution columns and completion source.
- D37: manager view rewritten (current approver; read-only for own recorded decision; none if replaced before acting). New rows for unwind, waiver, approver assignment, new-manager selection, Apply now, audit verification.
- D39, D40: flag names aligned to D70. The D40 committed-position assumption is confirmed.
- D41, D42: follow D11 and D59.
- D43: System actions and completion-vs-effective-date-run races included.
- D44: operations, keys, callbacks, application attempts and verification runs audited. Tamper-evidence defined in D64.
- D46, D47, D48: new notification events and employee-view items. The notification retry uses D63.
- D49: mock adapters also simulate Amend, Cancel and Reverse outcomes and late, duplicate and unauthenticated callbacks.
- D50: adapters authenticate separately (D57).
- D51: load baseline confirmed. Targets added for unwind start and callback processing.
- D52: extra master data, users and TE-13, TE-14.
- AS-P03, P06, P08, P10, AS-N06, N07, N09, N12, N14, N20, N21: expected results and clauses aligned to v1.2.

Removed Requirements:
- None. The v1.1 statement "reference ID is the idempotency key" (D24) and the D34 post-terminal reversal exception are superseded. They are kept for history in `archive/brd/BRD-v1.1.md`.

Unchanged Requirements:
- BRD-001 objective, sponsor, and priority
- D01, D02, D04, D05, D06, D08, D09, D13, D15, D19, D20 (a clarifying note on `Cancelled` and R3 was added), D28 (text added for `CancellationPending` only), D38, D45

Affected Business Domains:
- Transfers (request lifecycle, cancellation), Fulfilment orchestration and adapters, Master data (designated manager), Employee organisation (atomic application), Scheduling (effective date, recovery), Notifications, Access control and data protection, Audit

Affected Modules:
- transfers, eligibility, fulfilment orchestration and adapters (payroll, it, facilities), adapter callback interface, master-data, employees/org, notifications, rbac/auth, audit, scheduler

API Impact:
- New or changed actions: HR cancel (to `CancellationPending`), unwind retry, mark reversed manually, HR Lead waive, assign approver, select new manager, HR Lead Apply now, HR Lead cancel with no eligible approver, audit verification.
- Adapter contract: operation type and per-operation idempotency key on every call. New Cancel and Reverse operations. An authenticated callback endpoint.
- Server-side field filtering by role on all endpoints, exports and real-time events.

Database Impact:
- New status `CancellationPending`, item status `ReversalWaived`, completion source, and new flags. Status, item status and flags stored separately (D70).
- Operation table (type, idempotency key, sequence, payload, outcome, including unknown).
- Designated manager on combinations. Approved new manager on requests. Reschedule history with a count.
- Active-request uniqueness over the active set (not a plain unique constraint).
- Audit hash chain and an insert-only DB grant for the application account.
- Notification de-duplication key.

Frontend Impact:
- `CancellationPending` view with "n of 3 resolved". Messages for waiting for approver assignment, blocked by an earlier cancellation, and new manager.
- HR screens: approver assignment, new-manager selection, reschedule reason and limit, block reason.
- Functional queue unwind actions. HR Lead waiver and Apply now.
- Manual-completion state rules and immutable evidence notes.

Backend Impact:
- State machine T1 to T18. Operation and idempotency model. Cancel/Reverse orchestration.
- Callback authentication and matching rules.
- Serialised completion vs effective-date run. Atomic application. Recovery check every 15 minutes and on startup.
- Notification de-duplication. Audit hash chain and verification job. Role-based response filtering.

Test Impact:
- Test case generation is deferred until the TDD phase, following Gate 1 Spec approval.
- Add AS-P23 to AS-P33 and AS-N23 to AS-N38.
- Add adapter operation, cancel and callback matrices, the cutoff race tests, tamper detection, per-role API field-absence tests, E8, TE-13 and TE-14.

Existing Implementation Impact:
- None. No application implementation exists for this BRD yet.
- Spec generation is deferred until v1.2 receives Gate 0 approval.

Architecture Impact:
- Scheduler with recovery and per-request serialisation. Authenticated inbound callback interface. Hash-chained audit with DB-level grants. All must fit the approved stack (NestJS, PostgreSQL + Prisma, Redis) or need an ADR.
- D71 makes the plan items (DB uniqueness mechanism, adapter contract, callback auth, audit chain, scheduler, timezone, field filtering) entry conditions for development.
- TL (Subhajit Mukherjee) technical concurrence is needed at Gate 1.

Gate 0 Status:
Approved

Approval Date:
2026-10-01

Approved By:
Shamik Bhattacharya (PM, Gate 0 Reviewer), shamik.bhattacharya@intglobal.com

Approval Notes:
BRD v1.2 is functionally development-ready, with no remaining business-requirement blocker. The new v1.2 values in the Decision Register are approved as written. Development proceeds subject to the D71 technical entry conditions being defined in the feature `plan.md` and approved with TL concurrence at Gate 1. Review record: `pr_reviews/BRD-20261001-190918.md`.
