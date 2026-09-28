# BRD Change Log

Traceability and history only. The authoritative requirement baseline is always `.ai-context/BRD.md`. Archived versions are in `.ai-context/archive/brd/`.

| Version | Date | Status | Summary | Location |
|---|---|---|---|---|
| 1.0 | Not recorded (on or before 2026-09-25) | Superseded (Gate 1: Changes Requested, 2026-09-28) | Initial BRD-001 baseline | `archive/brd/BRD-v1.0.md` |
| 1.1 | 2026-09-28 | Pending Gate 1 | Revision against Gate 1 feedback G1-01 to G1-28 | `BRD.md` |

---

### Version 1.0

Status: Superseded

Summary:
Initial Employee Internal Transfer Digital Journey requirements (BRD-001). This entry was recorded afterwards. v1.0 carried no version header, and its creation date and author were not recorded.

Changes:
- Initial BRD

Gate 1:
Changes Requested. Shamik Bhattacharya, 2026-09-28. See `decisions/gate-1-feedback-brd-v1.0.md`.

---

### Version 1.1

Status: Pending Gate 1

Change Date:
2026-09-28

Change Summary:
Revision of BRD-001 in response to Gate 1 feedback (28 items and mandatory acceptance scenarios) from Shamik Bhattacharya (PM, Gate 1 Reviewer). There is no new client source document in `docs/`. The Gate 1 review record (`decisions/gate-1-feedback-brd-v1.0.md`) drives this revision. BRD-001 decisions now have clause-level IDs (`BRD-001.D01` to `D52`) and acceptance scenarios (`AS-P01` to `P10`, `AS-N01` to `N22`) for traceability. Clauses marked **(Assumption)** need reviewer confirmation.

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
- The existing `test_cases/internal-transfer-journey.test_cases.md` was written against v1.0 and must be revised.
- Add AS-P01 to P10 and AS-N01 to N22; business-day examples E1 to E7; adapter outcome matrix; concurrency and duplicate tests; access-matrix tests; performance tests against D51.

Existing Implementation Impact:
- None. No application implementation exists for this BRD yet.
- The spec `specs/internal-transfer-journey.spec.md` (In Peer Review) was written against v1.0 and is now **stale**. It must be revised to v1.1 before Gate 1 re-review.

Architecture Impact:
- Needs a scheduler/job capability (effective date, SLAs) and a retry mechanism for adapter calls. Check whether these fit the approved stack (NestJS, PostgreSQL, Redis) or need an ADR.
- Idempotency and optimistic concurrency match the existing constitution rule (`Idempotency-Key` on state-changing mutations).
- The audit trail falls under the Critical coverage tier (`audit`).
- TL (Subhajit Mukherjee) technical concurrence is needed at Gate 1, because the security posture (access matrix) and architectural constraints (jobs, retries) are affected.

Gate 1 Status:
Pending

Approval Date:
Pending

Approved By:
Pending

Approval Notes:
Pending. The reviewer should confirm or overturn each **(Assumption)** clause listed under "Open at BRD stage" in BRD v1.1.
