# Business Requirements Document (BRD)

| Field | Value |
|---|---|
| Document | Employee Internal Transfer Digital Journey |
| Version | **v1.2** |
| Status | **Approved (Gate 0, 2026-10-01)**. Development subject to the D71 entry conditions |
| Date | 2026-09-29 |
| Owner | Shamik Bhattacharya, Project Manager (Gate 0 Reviewer) |
| Supersedes | v1.1, archived at `.ai-context/archive/brd/BRD-v1.1.md` (v1.0 at `.ai-context/archive/brd/BRD-v1.0.md`) |
| Revision driver | Gate 0 re-review feedback on v1.1, 2026-09-29: 25 numbered items, a terminology item, and additional mandatory acceptance scenarios (`.ai-context/pr_reviews/BRD-20260929.md`) |
| Change record | `.ai-context/decisions/brd-change-log.md` → Version 1.2 |
| Gate 0 approval | Shamik Bhattacharya (PM, Gate 0 Reviewer), 2026-10-01. Record: `.ai-context/pr_reviews/BRD-20261001-190918.md` |

### Version History

| Version | Date | Summary | Author | Gate 0 |
|---|---|---|---|---|
| v1.0 | Not recorded (on or before 2026-09-25) | Initial baseline for BRD-001 | Not recorded | Changes Requested (2026-09-28, Shamik Bhattacharya) |
| v1.1 | 2026-09-28 | Revised against Gate 0 feedback G0-01 to G0-28. Effective date became the point the transfer takes effect. Added withdrawal cutoff, HR action model, fulfilment failure and idempotency rules, access matrix, SLAs, transition table, audit, notifications, concurrency, performance, test data and acceptance scenarios. | Agent (on behalf of PM) | Changes Requested (2026-09-29, Shamik Bhattacharya) |
| v1.2 | 2026-09-29 | Revised against Gate 0 re-review feedback G0R-01 to G0R-26. All v1.1 assumptions confirmed by the reviewer. Adds per-operation idempotency keys, an adapter cancel operation, the `CancellationPending` status and reversal resolution, late-callback and callback-authentication rules, manual-completion controls, approver-assignment rules, the new-manager rule, an effective-date cutoff with atomic application and job recovery, notification idempotency, a testable tamper-evidence rule, server-side protection of sensitive data, reschedule limits, a minimum adapter contract, status/flag separation, development entry conditions, and 22 more acceptance scenarios. | Agent (on behalf of PM) | Approved (2026-10-01, Shamik Bhattacharya), subject to D71 |

### How to read v1.2

- Every decision has a stable clause ID (`BRD-001.Dxx`). Specs, plans, tasks and test cases trace to clause IDs, not just to `BRD-001`. IDs D01 to D52 keep their v1.1 meaning; D53 to D71 are new.
- `[G0-nn]` tags show the v1.0 Gate 0 feedback item a clause answers (Appendix A). `[G0R-nn]` tags show the v1.1 re-review item (Appendix B).
- **There are no open assumptions in v1.2.** Every clause marked **(Assumption)** in v1.1 was confirmed by the Gate 0 reviewer on 2026-09-29 and is now marked *(Confirmed 2026-09-29)*. The Decision Register at the end lists who decided each point that was open at v1.1.
- Status words follow D70: request status, fulfilment item status and flags are three separate things. Flags are written in *italic PascalCase* (for example *Delayed*).

---

## Objective

Enable an employee to initiate, track, and complete an Internal Transfer Request entirely through the One-Point Employee Portal. This replaces the current manual, multi-team process (Employee → Manager → HR → Payroll → IT → Facilities) with a single digital journey. The portal runs that journey end to end and shows the employee one unified view of progress.

## Scope

**In scope:**
- Employee-initiated Internal Transfer Request capture: proposed department/business unit, proposed location, proposed role/job position, effective date, and optional reason. All values are validated against organisational master data, not free text, and only valid combinations can be chosen.
- Request submission with at least 14 calendar days between submission and effective date.
- One active transfer request per employee at a time, enforced by the backend and database.
- Employee withdrawal of their own request up to (but not including) HR approval. After HR approval, only HR can cancel, and the cancellation completes only once downstream changes are undone.
- An employee view, available at all times, showing the request's overall status, the status of each fulfilment activity, and which actions are pending with whom.
- A manager approval step, actioned by the employee's current reporting manager (or an HR-assigned approver) through a minimal "My Approvals" view in the portal.
- HR eligibility validation: the system evaluates three business rules and HR makes the approve/reject decision.
- Portal-side orchestration of Payroll, IT, and Facilities fulfilment: dispatch, retry, amendment, cancellation and reversal, each with defined idempotency, failure and escalation behaviour.
- Applying the organisational change, including the new reporting manager, atomically on the effective date once all fulfilment is complete, with recovery if the application job fails.
- Payroll, IT, and Facilities represented by internally defined, mocked/stubbed API adapters with realistic contracts, latency, failure modes and authenticated callbacks, since no real target systems exist for this assessment.
- Self-seeded organisational master data and employee profile data in the project's own database. The project has **zero external third-party dependencies** by design.
- A tamper-evident audit trail, idempotent in-app notifications, SLA reminders and escalation, server-side protection of sensitive data, and defined behaviour for concurrency, data changes and inactive users.

**Out of scope (decided, not open):**
- Real integration with actual Payroll, IT, or Facilities systems. The mocked adapters replace this.
- Any approval step beyond one Manager gate and one HR gate: no secondary approvers, budget sign-off, or multi-level chains. Assigning or reassigning an approver (D29, D59) is not an extra approval step.
- An HR override that approves a request failing an eligibility rule.
- Headcount, vacancy or budget checks on the proposed position *(Confirmed 2026-09-29, D03)*.
- A dedicated manager app or full manager dashboard.
- Email, SMS, and operating-system push notifications (APNs/FCM). These need an external provider, which conflicts with the zero-external-dependency decision.
- A public-holiday calendar. It is deferred as a future enhancement.
- Changing the effective date after submission by any party except HR (D17, D66).
- Preventing a database administrator from altering data. v1.2 requires that such alteration of the audit trail is **detected** (D64), not that it is impossible.
- Any other One-Point Employee Portal module.
- Delivery platform and technology stack. These are Technical decisions recorded in `constitution.md`.

---

## Governance

This BRD is the source that spec authoring draws from. A spec should never be the first place a requirement is written down. Every ambiguity found during Discovery, at Gate 0 on v1.0 and at the Gate 0 re-review of v1.1 has been turned into an explicit decision. v1.2 contains no unconfirmed assumptions. Development must not make independent business decisions on any point covered here; where this BRD leaves a mechanism to `plan.md`, D71 lists it and development of the affected area waits for that plan.

Actors: **Employee**, **Manager** (the employee's current direct reporting manager, or the approver HR assigned under D59), **HR**, **Payroll**, **IT**, **Facilities**, and **System** (scheduled or automatic actions by the portal). **HR Lead** is a seeded designation on selected HR users that receives escalations and holds a few named extra rights (D37). It is not a seventh role. The Payroll, IT and Facilities **adapters** are system integrations, not users; they authenticate under D57.

---

### BRD-001: Employee Internal Transfer Digital Journey

**Raised by:** Business Requirement. A single digital journey for internal transfers, replacing manual cross-team coordination.
**Business need:** Today an employee requesting an internal transfer must work through several teams and systems in turn. They discuss it with their manager, the manager confirms, HR validates eligibility, organisational information is updated, and Payroll, IT, and Facilities may each need to act. Only then does the employee get confirmation. The process is slow, fragmented, and shows the employee nothing until the end. The organisation wants one digital journey in the One-Point Employee Portal: the employee starts the request, tracks it in one place, and the portal coordinates the downstream work.
**Sponsor:** HR Business Owner, One-Point Employee Portal
**Priority:** High. This is the only business requirement driving this workstream.

**Decided (Business):**

#### 1. Request capture

- **BRD-001.D01 (Master data selection).** The employee picks proposed department/business unit, location, and role/job position from organisational master-data lists, not free text. *(Unchanged from v1.0.)*
- **BRD-001.D02 (Self-seeded master data).** Department, location, and role lists are a fixed, developer-defined reference dataset seeded in the project's own database. They are not fetched from any external HR system, directory, or third-party source. *(Unchanged from v1.0.)*
- **BRD-001.D03 (Valid combinations only)** `[G0-15]`. The master dataset defines which **(department, location, role)** combinations are valid. Each valid combination may also name a **designated reporting manager** (D67). The employee can only pick valid combinations: choosing a department limits the locations offered, and choosing a location limits the roles offered. The backend rejects any combination not in the dataset, whatever the UI sent. Inactive master-data values are never offered for new requests. A seeded combination table is the only position check; headcount and vacancy checks are out of scope. *(Confirmed 2026-09-29.)*
- **BRD-001.D04 (No-change request not allowed)** `[G0-28]`. The proposed (department, location, role) must differ from the employee's current values in at least one field. A request identical to the current assignment is rejected at submission with the message "Proposed details are the same as your current assignment." A change to only one field (for example location only) is a valid transfer.
- **BRD-001.D05 (Effective date notice).** The effective date must be at least **14 calendar days** after the submission date (submission date = day 0). Weekends count. The effective date can be any calendar date. For example, if submitted on Thu 2026-10-01, the earliest effective date is Thu 2026-10-15. Picking 2026-10-14 is rejected.
- **BRD-001.D06 (Optional reason).** The employee may enter an optional free-text reason (maximum 500 characters). The reason is visible to the employee, their manager, and HR. It is not visible to Payroll, IT, or Facilities (D65).
- **BRD-001.D07 (Single active request, enforced by backend and database)** `[G0-17, G0R-18, G0R-22]`. An employee can hold only one **active** transfer request at a time. The active set is defined in D35; it contains every non-terminal status **except** `CancellationPending`. The rule is enforced atomically at the backend/database level, not only in the UI. If two submissions arrive at the same time (two browser tabs, or two API calls), exactly one succeeds and the other gets "You already have an active transfer request" and creates nothing. Resubmitting the same submission (same client idempotency key) returns the original request instead of creating a second one. A plain unique constraint on employee and status cannot express this rule; the exact database mechanism is defined in `plan.md` before development (D71). A request in `CancellationPending` does not block a new submission, but it does block HR approval of the new one (D68).
- **BRD-001.D08 (Snapshot at submission)** `[G0-14]`. At submission the request records a snapshot of the employee's current department, location, role, and reporting manager (the "from" details) alongside the proposed "to" details. The snapshot supports display and audit. Eligibility decisions use live data as described in D39.

#### 2. Withdrawal and cancellation

- **BRD-001.D09 (Withdrawal cutoff)** `[G0-02]`. The employee can **withdraw** their own request only while it is in `PendingManagerApproval` or `PendingHRValidation`. Withdrawal is terminal (`Withdrawn`), has an optional reason, and takes effect immediately. Once HR has approved (`PendingFulfilment` onward) the employee cannot withdraw, because downstream fulfilment may already be running. The Withdraw action is hidden in the UI and rejected by the API from then on, with the message "This request can no longer be withdrawn. Please contact HR."
- **BRD-001.D10 (HR cancellation after HR approval)** `[G0-02, G0-05, G0R-10]`. HR can **cancel** a request in `PendingFulfilment`, `FulfilmentFailed`, or `Scheduled`, before the organisational change has been applied. A cancellation reason is mandatory. **Cancellation is not terminal straight away** *(Gate 0 reviewer decision, 2026-09-29)*:
  - the request moves to the non-terminal status `CancellationPending` (source = HR, reason recorded),
  - every fulfilment item is unwound under D55: items never executed are cancelled, in-flight instructions are withdrawn (D54), and completed items are reversed,
  - the request becomes terminal `Cancelled` only when **every** item has reached a resolved unwind state (D55),
  - no organisational data is changed at any point, because it is only changed at `Completed` (D16), and the effective-date run never applies a request in `CancellationPending`,
  - the cancellation cannot be undone. From `CancellationPending` the only actions are the unwind actions in D55.
- **BRD-001.D11 (System cancellation)** `[G0R-10]`. When the employee becomes inactive (D41), the System cancels any non-terminal request (source = System, reason "Employee inactive"). A request that has not reached HR approval becomes `Cancelled` at once (T15). A request in `PendingFulfilment`, `FulfilmentFailed` or `Scheduled` moves to `CancellationPending` and follows D55 (T16).

#### 3. Manager confirmation

- **BRD-001.D12 (Who the manager is)** `[G0-10]`. "Manager" means the employee's **current** direct reporting manager at the moment of action, not the proposed new manager and not necessarily the manager at submission. The Manager's standing comes from the reporting relationship in the seeded employee profile data. Where the employee has no active manager, the approver is the user HR assigns under D59.
- **BRD-001.D13 (Manager action).** The manager uses the "My Approvals" view to **Approve** (optional comment) or **Reject** (optional reason). Rejection is terminal (`RejectedByManager`). The employee may submit a new request afterwards. A rejected request is never reopened or edited. *(Unchanged from v1.0.)*
- **BRD-001.D14 (Manager changes while pending)** `[G0-10, G0R-09]`. If the employee's reporting manager changes while the request is in `PendingManagerApproval`:
  - the request moves automatically to the new manager's "My Approvals" queue,
  - the replaced manager, who had not acted, immediately loses all visibility of the request and the ability to act (D37),
  - the manager SLA (D29) restarts (D30) from the reassignment time,
  - the new manager and the employee are notified.

  If the manager had already approved before the change, the approval stands and the request does not return to manager approval. The manager who approved keeps read-only access to their own decision record (D37). *(Confirmed 2026-09-29.)*
- **BRD-001.D15 (Self-seeded employee profile data).** The profile data needed for this journey is seeded in the project's own database: reporting manager, date started in current role, disciplinary flag, last transfer completion date, employment status, and current department, location, and role.

#### 4. Effective date and when the transfer takes effect

- **BRD-001.D16 (The transfer takes effect on the effective date, not on HR approval)** `[G0-01]`.
  - HR approval authorises the transfer, fixes the approved new reporting manager (D67), and starts fulfilment. **It does not change the employee's organisational information.**
  - When all three fulfilment items are `Completed` before the cutoff of the effective date (D60), the request moves to `Scheduled`.
  - On the effective date, at 00:00 in the portal business timezone (Asia/Kolkata, D31), the System applies the proposed department, location, role and approved new reporting manager to the employee's organisational record and updates the employee's last transfer completion date, **as one atomic change** (D61), and moves the request to `Completed`. If the run fails, D62 applies.
  - If the last fulfilment item completes **at or after** the cutoff of the effective date, the request is flagged *EffectiveDateMissed* and the System applies the change immediately on the day that item completes, unless HR has rescheduled to a later date (D17). *(Confirmed 2026-09-29.)*
- **BRD-001.D17 (Fulfilment not finished by the effective date)** `[G0-11]`. If any fulfilment item is not `Completed` at the cutoff of the effective date (D60):
  - the transfer **does not** take effect, and organisational data is not changed,
  - the request stays in `PendingFulfilment` (or `FulfilmentFailed`) and is flagged *EffectiveDateMissed*,
  - the employee, the HR queue, and the relevant fulfilment queue(s) are notified.

  HR may then either:
  - **reschedule** by setting a revised effective date at least **3 business days** in the future, within the limits and with the mandatory reason in D66. Each reschedule is sent to the adapters as an **Amend** operation under D53. Completed items are not redone. Or,
  - leave the date as it is. Once the remaining items complete, the change is applied at once (D16).

  HR may also cancel (D10). The employee cannot change the effective date. For example: effective date Tue 2026-10-20; at 00:00 on 20 October, IT is still `InProgress`. The request stays `PendingFulfilment` with *EffectiveDateMissed*. If IT completes on Wed 21 October with no HR reschedule, the change is applied on 21 October and the request becomes `Completed`.
- **BRD-001.D18 (Effective date passes before HR decision).** If the effective date arrives while the request is still in `PendingManagerApproval` or `PendingHRValidation`, the request stays in its current state, is flagged *EffectiveDateMissed*, and the employee and current approver are notified. If HR later approves, HR must set a revised effective date at least 3 business days in the future as part of the approval. Whenever HR approves with fewer than 3 business days (the fulfilment SLA) left before the effective date, the portal warns HR and offers to revise the date. A revision made at approval counts toward the reschedule limit in D66. *(Confirmed 2026-09-29.)*
- **BRD-001.D19 (System of record)** `[G0-22]`. The One-Point Employee Portal database is the **system of record** for employee organisational information (department, location, role, reporting manager) and for master data in this project. From `Completed` onward, the portal's record is authoritative. Payroll, IT, and Facilities adapters are informed of the change but are not sources of truth for it.

#### 5. HR eligibility validation

- **BRD-001.D20 (Eligibility rules).** Eligibility is defined by three checkable rules evaluated against the employee's profile data. *(Unchanged from v1.0.)*
  1. **R1 Tenure:** at least 6 months of continuous service in the current role.
  2. **R2 Disciplinary:** no active or open disciplinary case.
  3. **R3 Cooldown:** no internal transfer completed in the last 6 months.

  Six months means 6 calendar months, date to date. For example, someone who started a role on 2026-04-10 meets R1 on or after 2026-10-10. A `Cancelled` request is not a completed transfer and does not count for R3.
- **BRD-001.D21 (HR action model: system evaluates, HR decides)** `[G0-03]`.
  - When a request enters `PendingHRValidation`, the System evaluates R1 to R3 automatically. The HR queue shows the result for each rule (Pass/Fail with the data it used).
  - **The system never approves or rejects on its own.** An HR user must act. HR is modelled as a shared queue, so any active HR user may act.
  - The System re-evaluates R1 to R3 and the master-data validity check (D40) at the moment HR submits a decision, using the latest data. If the result has changed since the queue view loaded, HR is shown the new result and must confirm again.
  - **Approve** is allowed only when all of these hold: R1 to R3 pass; the proposed master data is still valid; an active approved new manager is determined (D67); no other request of the same employee is in `CancellationPending` (D68); and the effective date is at least 3 business days away or is revised as part of the approval (D18). There is no HR override. Approving moves the request to `PendingFulfilment` and starts fulfilment (Section 6).
  - **Reject** is always allowed and results in terminal `RejectedByHR`.
- **BRD-001.D22 (HR rejection reason)** `[G0-13]`.
  - When one or more rules fail, the failed rule(s) are pre-filled as the rejection reason and cannot be removed. HR may add an optional comment (maximum 500 characters).
  - When all rules pass but HR still rejects (for example, the proposed position is no longer valid, or another documented HR reason), HR must choose a reason category ("Proposed position invalid" or "Other HR reason") and enter a mandatory comment. An HR rejection on grounds other than R1 to R3 is allowed, but must be justified. *(Confirmed 2026-09-29.)*
  - The HR rejection comment is addressed to the employee. The employee sees the failed rule name(s) (for example "R2 Disciplinary: not met") and the HR comment, but never the disciplinary case details or the data values used. The manager sees only that HR rejected the request, not the rule or comment. These limits are enforced in API responses, not only in the UI (D65).
- **BRD-001.D23 (Segregation of duties).** The same user can never act as both Manager approver and HR approver on one request, and no user can act at any stage of their own request, even if they hold several roles. This includes fulfilment actions, unwind actions, approver assignment and manual completion on their own request. For example, an HR user who submits their own transfer cannot see it in the HR queue. An HR user cannot assign themselves as approver (D59). The rule is enforced by the backend.

#### 6. Fulfilment orchestration (Payroll, IT, Facilities)

- **BRD-001.D24 (Parallel dispatch and fulfilment reference IDs)** `[G0-07, G0R-02]`. On HR approval, the System creates three independent fulfilment items (Payroll, IT, Facilities) and dispatches each to its adapter at the same time. Each item gets a unique **fulfilment reference ID**, for example `REQ-1001-PAYROLL`. The reference ID identifies the **item** and stays the same for its whole life. It is **not** the idempotency key. Every instruction sent for the item is a separate **operation** with its own idempotency key, as defined in D53. *(Changed from v1.1, which used the reference ID as the idempotency key for all operations.)*
- **BRD-001.D25 (Adapter outcomes and system behaviour)** `[G0-04, G0-21]`. For a Dispatch operation:

  | Adapter outcome | Meaning | Item status | System behaviour |
  |---|---|---|---|
  | Success, complete (2xx, valid body, status = completed) | Downstream action done | `Completed` | Record the completion time, notify the employee, check whether all items are complete |
  | Success, accepted (2xx, valid body, status = accepted) | Downstream accepted the work and will confirm later by callback | `InProgress` | Wait for the completion callback (D56). The SLA clock keeps running |
  | Timeout (no response within the adapter timeout) | Outcome unknown | `Retrying` | Automatic retry of the **same operation with the same idempotency key and identical payload** (D53), up to **3 automatic retries** with increasing delay |
  | 5xx server error | Temporary downstream failure | `Retrying` | Same as timeout |
  | Invalid response (malformed or unexpected body, unknown status) | Outcome unknown | `Retrying` | Same as timeout. The invalid payload is recorded in the audit trail |
  | 4xx client/business error | Downstream refused the instruction; it was **not executed** (non-retryable) | `Failed` | No automatic retry. Notify the owning functional queue with the error code and message |
  | Duplicate acknowledgement (adapter reports this idempotency key was already processed) | Action was done earlier | Status of the original result (normally `Completed`) | Treated as the original result. Never executed twice |
  | Automatic retries exhausted | Could not reach a result; outcome still unknown | `Failed` | Notify the owning functional queue. The outcome is recorded as *unknown* (matters for D53 and D55) |

  The same outcome classes apply to Amend, Cancel and Reverse operations, with the item-status effects defined in D17, D54 and D55. The adapter timeout value and retry delays are Technical decisions (`plan.md`). The number of automatic retries (3) is a business decision.
- **BRD-001.D26 (Handling a failed item)** `[G0-04, G0-05]`. An item in `Failed` stays with its owning functional queue (Payroll, IT, or Facilities), which can:
  - **Retry**: re-dispatch under D53 (same key if the last outcome was unknown, next key if the adapter definitely did not execute). Manual retries have no limit and every one is audited. Manual retries do not restart the item SLA (D30).
  - **Mark completed manually**: for work finished outside the adapter, under the controls in D58.
  - **Mark Unable to Fulfil**: a permanent failure. A reason is mandatory.

  **Escalation:** if an item stays `Failed` for 1 business day with no action, HR and the HR Lead are notified.

  Cancellation and reversal of items are defined in D54 and D55. *(v1.1 text on reversal moved to D55 and extended.)*
- **BRD-001.D27 (Permanent failure and final status)** `[G0-05]`.
  - When any item is marked **Unable to Fulfil**, the overall request moves to **`FulfilmentFailed`**. This is a non-terminal state that waits for an HR decision. The other items carry on independently and are not rolled back automatically.
  - From `FulfilmentFailed`, HR can:
    - **Resume**: send the item back to its queue for another attempt (for example, after an offline fix). The item returns to `InProgress` with a Dispatch operation under D53, the item SLA restarts, and the request returns to `PendingFulfilment`.
    - **Cancel**: `CancellationPending`, then `Cancelled` under D10 and D55.
  - A request is **never** `Completed` unless all three items are `Completed`, and it is never shown as `Completed` or terminally failed while an item is still open.
- **BRD-001.D28 (Partial completion visibility)** `[G0-06]`. While fulfilment is under way, the overall status shows `PendingFulfilment` with a count such as "In progress: 2 of 3 complete". The status of each item is shown separately (D36), with the *Delayed* flag where it applies. For example, Payroll `Completed`, IT `Completed`, Facilities `Failed`:
  - the employee sees "In progress: 2 of 3 complete. Facilities: issue being resolved by the Facilities team",
  - the overall status is **not** `Completed` and **not** `FulfilmentFailed`,
  - if Facilities is later marked Unable to Fulfil, the overall status becomes `FulfilmentFailed` ("Awaiting HR decision").

  During `CancellationPending` the employee sees "Cancellation in progress: downstream changes are being undone (n of 3 resolved)".

#### 7. SLAs, reminders and escalation

- **BRD-001.D29 (Stage SLAs)** `[G0-09, G0-24, G0R-04, G0R-08]`. Business day = Monday to Friday in Asia/Kolkata, with no public-holiday calendar (D31). All values below are *(Confirmed 2026-09-29)* except the rows marked **(new in v1.2)**, which are v1.2 decisions for Gate 0 approval.

  | Stage | SLA (starts when stage is entered) | At SLA breach | Escalation |
  |---|---|---|---|
  | Approver assignment (`PendingManagerApproval` with *AwaitingApproverAssignment*, D59) **(new in v1.2)** | **1 business day** | Flag *Delayed*. Reminder to all active HR users | At 2 business days, escalate to the HR Lead, then a daily reminder until assigned |
  | Manager (`PendingManagerApproval`, approver assigned) | 5 business days from assignment of the current approver | Flag *Delayed*. Reminder to the manager and the skip-level manager | At 10 business days, escalate to the HR queue. HR may **reassign the approver** under D59. HR does not approve on the manager's behalf. No auto-approval |
  | HR (`PendingHRValidation`) | **3 business days** | Flag *Delayed*. Reminder to all active HR users | At 5 business days, escalate to the HR Lead, then a daily reminder until actioned. No auto-approval |
  | Payroll / IT / Facilities (each item) | 3 business days from dispatch | Flag the item *Delayed*. Reminder to that functional queue | At 5 business days, escalate to the HR queue and HR Lead |
  | Unwind of each item (`ReversalPending`, D55) **(new in v1.2)** | 3 business days from entering `CancellationPending` | Flag the item *Delayed*. Reminder to that functional queue | At 5 business days, escalate to the HR queue and HR Lead |
  | `ReversalFailed` item with no action (D55) **(new in v1.2)** | 1 business day | Notify HR and HR Lead | Daily reminder to the functional queue and HR Lead until resolved |
  | Effective-date application overdue (D62) **(new in v1.2)** | Not applied by 01:00 on the effective date | Flag *ApplicationOverdue*. Alert HR and HR Lead | Daily reminder to HR Lead until applied or cancelled |

  *Delayed* is a flag, not a status. It never blocks or fails the request by itself. The employee sees the *Delayed* flag on the relevant stage.
- **BRD-001.D30 (SLA restart).** The manager SLA restarts on approver assignment or reassignment (D14, D29, D59). The HR SLA restarts when a *BlockedByPriorCancellation* block clears (D68). A fulfilment item's SLA restarts on HR Resume (D27) and on HR reschedule (D17). Automatic and manual retries do not restart any SLA.
- **BRD-001.D31 (Business-day calculation and timezone)** `[G0-27, G0R-23]`. Rules:
  - The portal business timezone is **Asia/Kolkata (IST, UTC+05:30)**. *(Confirmed 2026-09-29.)* All business-day counting, the effective-date cutoff (D60) and scheduled runs use it. Timestamps are stored in UTC and displayed in Asia/Kolkata everywhere in the portal.
  - An SLA of N business days that starts at time T on a business day ends at the same clock time on the Nth following business day.
  - If a stage starts on a Saturday or Sunday, the clock starts at 00:00 the next Monday.
  - Saturdays and Sundays are skipped. There is no holiday calendar.

  | # | Case | Stage entered | SLA | Business days counted | SLA ends / breach at |
  |---|---|---|---|---|---|
  | E1 | Manager, weekday start | Thu 2026-10-01 10:00 | 5 | Fri 2, Mon 5, Tue 6, Wed 7, Thu 8 | Thu 2026-10-08 10:00 |
  | E2 | Manager, Friday submission crossing a weekend | Fri 2026-10-02 16:00 | 5 | Mon 5, Tue 6, Wed 7, Thu 8, Fri 9 | Fri 2026-10-09 16:00 |
  | E3 | Manager, weekend submission | Sat 2026-10-03 11:00 | 5 | Clock starts Mon 2026-10-05 00:00. Then Tue 6, Wed 7, Thu 8, Fri 9, Mon 12 | Mon 2026-10-12 00:00 (end of Fri 9 Oct) |
  | E4 | HR | Thu 2026-10-08 09:00 | 3 | Fri 9, Mon 12, Tue 13 | Tue 2026-10-13 09:00 |
  | E5 | Fulfilment, crossing a weekend | Wed 2026-10-07 15:00 | 3 | Thu 8, Fri 9, Mon 12 | Mon 2026-10-12 15:00 |
  | E6 | Manager escalation | Thu 2026-10-01 10:00 | 10 | Continues from E1 | Thu 2026-10-15 10:00 |
  | E7 | Effective-date notice (calendar days, not business days) | Submitted Thu 2026-10-01 | 14 calendar | Weekends included | Earliest effective date Thu 2026-10-15 |
  | E8 | Approver assignment, Friday afternoon | Fri 2026-10-02 17:00 | 1 | Mon 5 | Mon 2026-10-05 17:00 (escalation to HR Lead at Tue 2026-10-06 17:00) |

#### 8. Status model and transitions

- **BRD-001.D32 (Overall request statuses)** `[G0-12, G0R-10]`.

  | Status | Terminal? | Active (D07)? | Meaning |
  |---|---|---|---|
  | `Submitted` | No (momentary) | Yes | Accepted and being routed. Moves to `PendingManagerApproval` automatically |
  | `PendingManagerApproval` | No | Yes | Waiting for the current manager, or for HR to assign an approver (*AwaitingApproverAssignment*, D59) |
  | `PendingHRValidation` | No | Yes | Waiting for an HR decision |
  | `PendingFulfilment` | No | Yes | HR approved. Payroll, IT, and Facilities are in progress |
  | `FulfilmentFailed` | No | Yes | At least one item is Unable to Fulfil. Waiting for an HR decision |
  | `Scheduled` | No | Yes | All fulfilment complete. Waiting for the effective date |
  | `CancellationPending` **(new in v1.2)** | No | **No** | Cancelled by HR or System after HR approval; downstream items are being unwound (D55). Never applied |
  | `Completed` | Yes | No | Organisational change applied on the effective date |
  | `RejectedByManager` | Yes | No | Manager rejected |
  | `RejectedByHR` | Yes | No | HR rejected |
  | `Withdrawn` | Yes | No | Employee withdrew (before HR approval only) |
  | `Cancelled` | Yes | No | Cancelled by HR, HR Lead or System, with reason and source recorded; every item resolved |

- **BRD-001.D33 (Allowed transitions: this list is exhaustive)** `[G0-12]`. The backend must reject any transition not listed here, whatever the client sends.

  | # | From | To | Triggered by | Condition |
  |---|---|---|---|---|
  | T1 | (none) | `Submitted` | Employee | All capture validations pass (D03 to D07) |
  | T2 | `Submitted` | `PendingManagerApproval` | System | Always. Routed to the current active manager, or flagged *AwaitingApproverAssignment* for HR if there is none (D59) |
  | T3 | `PendingManagerApproval` | `PendingHRValidation` | Manager | Approve, by the current approver |
  | T4 | `PendingManagerApproval` | `RejectedByManager` | Manager | Reject, by the current approver |
  | T5 | `PendingManagerApproval` | `Withdrawn` | Employee | Withdraw |
  | T6 | `PendingHRValidation` | `PendingFulfilment` | HR | Approve, with every condition in D21 met |
  | T7 | `PendingHRValidation` | `RejectedByHR` | HR | Reject |
  | T8 | `PendingHRValidation` | `Withdrawn` | Employee | Withdraw |
  | T9 | `PendingFulfilment` | `Scheduled` | System | Last item `Completed` **before** the cutoff of the current effective date (D60) |
  | T10 | `PendingFulfilment` | `Completed` | System | Last item `Completed` **at or after** the cutoff of the current effective date, the approved new manager is active (D67), and the atomic application succeeds (D61) |
  | T11 | `PendingFulfilment` | `FulfilmentFailed` | System | Any item marked Unable to Fulfil |
  | T12 | `FulfilmentFailed` | `PendingFulfilment` | HR | Resume |
  | T13 | `Scheduled` | `Completed` | System | Effective-date cutoff reached, the approved new manager is active (D67), and the atomic application succeeds (D61, D62) |
  | T14 | `PendingFulfilment` / `FulfilmentFailed` / `Scheduled` | `CancellationPending` | HR | Cancel with mandatory reason (D10) |
  | T15 | `Submitted` / `PendingManagerApproval` / `PendingHRValidation` | `Cancelled` | System | Employee becomes inactive (D41) |
  | T16 | `PendingFulfilment` / `FulfilmentFailed` / `Scheduled` | `CancellationPending` | System | Employee becomes inactive (D41) |
  | T17 | `CancellationPending` | `Cancelled` | System | Every item is in a resolved unwind state (D55). May follow T14 or T16 in the same action when nothing needs unwinding |
  | T18 | `PendingManagerApproval` | `Cancelled` | HR Lead | No eligible approver exists (D59), mandatory reason |

  Rescheduling (D17, D66), approver assignment and reassignment (D14, D29, D59) and new-manager selection (D67) change data **within** a status and are not status transitions. Every other transition is invalid, including `Completed → PendingManagerApproval`, `Withdrawn → PendingFulfilment`, `RejectedByHR → PendingHRValidation`, `PendingFulfilment → Withdrawn`, `CancellationPending → PendingFulfilment` and `CancellationPending → Completed`. The API rejects it with a clear error ("Action not allowed in current status: <status>"), changes nothing, and records the attempt in the audit log.
- **BRD-001.D34 (Actions on terminal requests)** `[G0-12]`. No action of any kind (approve, reject, withdraw, cancel, retry, reschedule, fulfilment update, unwind action) is accepted on a request in a terminal state. Because `Cancelled` is reached only when every item is resolved, no reversal work continues after it. A late or contradictory adapter callback on a terminal request is handled under D56 and never changes the request status.
- **BRD-001.D35 (Non-terminal and active sets)** `[G0R-18]`.
  - **Non-terminal:** `Submitted`, `PendingManagerApproval`, `PendingHRValidation`, `PendingFulfilment`, `FulfilmentFailed`, `Scheduled`, `CancellationPending`.
  - **Active** (used by the single-active-request rule, D07): every non-terminal status except `CancellationPending`.
- **BRD-001.D36 (Fulfilment item statuses)** `[G0R-03, G0R-04]`.

  | Item status | Resolved for completion? | Resolved for unwind? | Meaning |
  |---|---|---|---|
  | `Pending` | No | No | Created, not yet dispatched |
  | `InProgress` | No | No | Dispatch (or Amend) sent and accepted, awaiting outcome |
  | `Retrying` | No | No | Outcome unknown, automatic retry under way |
  | `Failed` | No | No | Not completed; with the owning queue (D26) |
  | `UnableToFulfil` | No | No | Marked permanent failure; request is `FulfilmentFailed` |
  | `Completed` | **Yes** | No | Downstream action done (by adapter or manually, D58) |
  | `ReversalPending` **(extended)** | — | No | Being unwound: a Cancel or Reverse operation, or a manual reversal, is outstanding (D55) |
  | `ReversalFailed` | — | No | Unwind could not be completed; with the owning queue (D55) |
  | `Cancelled` | — | **Yes** | Never executed downstream, or withdrawn before execution (D54) |
  | `Reversed` | — | **Yes** | Downstream action undone (by adapter or manually) |
  | `ReversalWaived` **(new in v1.2)** | — | **Yes** | HR Lead accepted that the downstream action will not be undone, with justification (D55) |

  - Main path: `Pending` → `InProgress` → `Completed`.
  - Retry and failure: `InProgress` ↔ `Retrying` → `Failed` → (`InProgress` via Retry | `Completed` via manual completion | `UnableToFulfil`). From `UnableToFulfil`, HR Resume returns the item to `InProgress`. A *Delayed* `InProgress` item may also be completed manually (D58).
  - Unwind (only after the request enters `CancellationPending`): see D55.
  - Whether an item was completed or reversed by the adapter or manually is recorded as its **completion source** (`Adapter` / `Manual`), not as a separate status.
  - Each item's transitions are independent of the other two items.

#### 9. Access control

- **BRD-001.D37 (Role access matrix)** `[G0-08, G0R-09]`. The backend enforces this matrix on every API call. Hiding things in the UI is not enough. Every request outside a role's rights is refused and nothing is changed or leaked (D65). The response does not reveal whether another user's request exists: "not found" and "forbidden" look the same to the caller. Each refusal is audited. Users may hold more than one role. Segregation of duties (D23) always applies on top.

  | Capability | Employee | Manager | HR | Payroll | IT | Facilities |
  |---|---|---|---|---|---|---|
  | **View** | Own requests only (all employee-visible fields, all item statuses, own timeline) | (a) Requests where they are the **current approver** (current manager or HR-assigned approver), while they remain so. (b) **Read-only** access to a request on which **they recorded a decision** (approve or reject): status, from/to details, effective date, their own decision and comment. No HR rule or comment detail (D22, D65). A manager who is replaced **before acting** loses all access at reassignment (D14). No other historical access | All transfer requests (full detail, including eligibility results and audit trail) | Only their own item on requests in `PendingFulfilment` or later (including `CancellationPending`): employee name and ID, from/to department, location and role, approved new manager, effective date, reference ID, operation history. No reason, eligibility, or disciplinary data | Same, IT item only | Same, Facilities item only |
  | **Create** | Own request only | No (except their own request, as an Employee) | No (except their own) | No (except their own) | No (except their own) | No (except their own) |
  | **Approve / Reject** | Never (including their own) | Only at `PendingManagerApproval`, only as the current approver, never their own request | Only at `PendingHRValidation`, never their own request, never one they approved as Manager | No | No | No |
  | **Withdraw** | Own request, only at `PendingManagerApproval` / `PendingHRValidation` | No | No | No | No | No |
  | **Cancel** | No | No | At `PendingFulfilment` / `FulfilmentFailed` / `Scheduled` (D10). HR Lead only: at `PendingManagerApproval` when no eligible approver exists (D59) | No | No | No |
  | **Update fulfilment item** (retry, manual complete, Unable to Fulfil) | No | No | Resume only (D27) | Payroll item only (D26, D58) | IT item only | Facilities item only |
  | **Unwind actions** (retry unwind, mark reversed manually) | No | No | No | Payroll item only (D55) | IT item only | Facilities item only |
  | **Waive a reversal** | No | No | HR Lead only (D55) | No | No | No |
  | **Reschedule effective date** | No | No | Yes (D17, D18, D66) | No | No | No |
  | **Assign / reassign approver** | No | No | Yes (D29, D59). Never themselves | No | No | No |
  | **Select new manager** (when not defined or inactive) | No | No | Yes (D67) | No | No | No |
  | **Apply now** (overdue application) | No | No | HR Lead only (D62) | No | No | No |
  | **View audit trail** | Simplified timeline of own request | No | Full, and run audit verification (D64) | Own item's entries | Own item's entries | Own item's entries |

  Adapter callbacks are not user actions. They are authorised only under D57, and portal user credentials are never accepted on the callback interface.

  Examples the backend must refuse: an Employee opening another employee's request by ID; an Employee approving their own request; a Manager approving someone for whom they are not the current approver; a replaced manager opening the request; a non-HR user calling an HR action; an HR user without the HR Lead designation waiving a reversal; a Payroll user updating an IT item.

#### 10. Data changes during a request

- **BRD-001.D38 (Manager change).** See D14 and D59.
- **BRD-001.D39 (Employee profile changes while pending)** `[G0-14]`.
  - **Eligibility data (tenure, disciplinary flag, last transfer):** always evaluated against **live** data at the moment HR decides (D21), not the snapshot. If a disciplinary case is opened **after** HR approval but before `Completed`, the request is flagged *EligibilityChangedAfterApproval* and HR is notified. It is not cancelled automatically. HR decides whether to cancel (D10).
  - **Current department, location, or role changes** (another organisational change while this request is pending): the request is flagged *CurrentAssignmentChanged* for HR. HR sees both the snapshot and the live values. If the proposed values now equal the live current values (D04), HR must reject (before HR approval) or cancel (after HR approval).
  - **Employment status becomes inactive:** see D41.
- **BRD-001.D40 (Master data changes after submission)** `[G0-16]`.
  - **Before HR approval:** if a proposed department, location, role, or combination becomes inactive or invalid, the request is flagged *ProposedPositionInvalid*. The manager may still act. HR cannot approve, and must reject with reason category "Proposed position invalid" (D22). The employee is notified and may submit a new request.
  - **After HR approval:** the approved position is treated as committed. Deactivating master data later does not affect the request, which continues to `Completed`. *(Confirmed 2026-09-29.)* A change to the combination's designated manager after HR approval does not change the approved new manager; only that manager becoming inactive does (D67).

#### 11. Inactive users

- **BRD-001.D41 (Employee becomes inactive)** `[G0-23]`. When the employee's employment status becomes inactive (left or deactivated), the System immediately cancels any non-terminal request under D11: `Cancelled` before HR approval (T15), or `CancellationPending` with unwind under D55 after HR approval (T16). HR, the current approver, and affected functional queues are notified. No request is ever left pending for an inactive employee.
- **BRD-001.D42 (Manager or functional user becomes inactive)** `[G0-24, G0R-08]`.
  - **Manager inactive, or employee has no active manager:** the request is flagged *AwaitingApproverAssignment* and handled under D59.
  - **HR, Payroll, IT, Facilities users:** these are shared role-based queues with no single-person assignment, so one user becoming inactive does not strand an item. If a functional role has **no** active users, its items escalate to the HR Lead.
  - **Approved new manager inactive before the change is applied:** see D67.
  - Inactive users cannot sign in or act. Their pending notifications go to the replacement recipient.

#### 12. Concurrency

- **BRD-001.D43 (Concurrent actions)** `[G0-20]`. Every state-changing action, including System actions (callbacks, effective-date runs, SLA jobs), is checked against the request's or item's **current** status and version at the moment it is applied. When two actors act on the same request or item at almost the same time, **exactly one** valid transition is applied. Examples: two HR users approving and rejecting at once; a manager approving while the employee withdraws; two Payroll users retrying the same item; a callback arriving while a user completes the item manually; the last item completing while the effective-date run is processing the request (D60). A losing user action gets "This request has already been updated (current status: <status>). Please refresh." and nothing changes. Side effects (adapter operations, notifications, audit entries) are produced once, for the winning action only. Resubmitting the same action with the same client idempotency key returns the original result.

#### 13. Audit trail

- **BRD-001.D44 (Audit trail)** `[G0-18]`. The system keeps an **append-only, tamper-evident** audit record (D64) of every significant event:
  - submission, approval, rejection, withdrawal, cancellation (including `CancellationPending` and final `Cancelled`),
  - automatic status changes, approver assignment and reassignment, new-manager selection, reschedule (old date, new date, reason),
  - eligibility evaluation results,
  - every adapter operation (Dispatch, Amend, Cancel, Reverse) with its idempotency key, each retry (automatic or manual), adapter response or failure, manual completion or reversal (with evidence note), Unable to Fulfil, resume, waiver,
  - every callback received: accepted, duplicate, late, contradictory (*AdapterDiscrepancy*) or rejected (D56, D57),
  - effective-date application attempts, successes and failures (D61, D62),
  - SLA reminders and escalations,
  - notification generation,
  - audit verification runs and their result (D64),
  - refused unauthorised actions and invalid transitions.

  Each entry records: request ID; fulfilment item and reference ID (if any); operation type and idempotency key (if any); event type; acting user ID and acting role (or `System` or the adapter identity); timestamp (UTC, displayed in Asia/Kolkata); previous status; new status; reason or comment; attempt number and adapter outcome (for fulfilment); correlation ID.

  Visibility follows D37 and D65. Personal data in operational logs is masked under `constitution.md`. The audit trail is the business record, not a log file.

#### 14. Notifications

- **BRD-001.D45 (What "push notification" means)** `[G0-19]`. In this project a "push notification" is an **in-app notification only**:
  1. a persistent notification record in the user's in-app Notification Centre, with an unread badge, and
  2. a real-time in-app alert (banner or toast) when the user has the portal open.

  It does **not** include operating-system or mobile push (APNs/FCM), email, or SMS, which all need an external provider (out of scope).
- **BRD-001.D46 (Notification events and recipients).**

  | Event | Recipients |
  |---|---|
  | Submitted | Employee (confirmation), Manager (or the HR queue if *AwaitingApproverAssignment*) |
  | Approver needed (no active manager) | HR queue; the employee is told "Waiting for HR to assign an approver" |
  | Manager approved / rejected | Employee. On approval, also the HR queue |
  | Approver assigned / reassigned | Employee, new approver |
  | HR approval blocked by an earlier cancellation (D68) | HR queue |
  | HR approved / rejected | Employee, Manager. On approval, also the Payroll, IT, and Facilities queues |
  | Fulfilment item completed | Employee |
  | Fulfilment item failed / Unable to Fulfil | Owning functional queue, Employee (non-technical wording), HR on escalation |
  | All fulfilment complete (`Scheduled`) | Employee, Manager, HR |
  | Effective date missed / rescheduled | Employee, HR, affected functional queues |
  | New manager required (not defined or inactive, D67) | HR queue |
  | Effective-date application overdue (D62) | HR, HR Lead |
  | Completed | Employee, previous Manager, new Manager, HR |
  | Withdrawn | Employee, current approver, HR |
  | Cancellation started (`CancellationPending`) | Employee, current approver (if any), affected functional queues, HR |
  | Unwind item failed (`ReversalFailed`) | Owning functional queue; HR and HR Lead on escalation (D29) |
  | Cancelled (final) | Employee, HR, affected functional queues |
  | *AdapterDiscrepancy* raised (D56) | Owning functional queue, HR Lead |
  | SLA reminder / escalation | As defined in D29 |

- **BRD-001.D47 (Notification delivery failure).** A notification is saved before any real-time alert is attempted. If the real-time alert cannot be delivered (the user is offline, or the connection fails), the user sees the notification the next time they open the portal. If saving the notification fails, it is retried automatically (under the same idempotency key, D63) and the failure is audited. **A notification failure never blocks, fails, or rolls back a workflow action.** The request status view is always the authoritative source of truth, whatever the notification outcome.

#### 15. Status and visibility

- **BRD-001.D48 (Employee view)**. At any time the employee can see:
  - the overall status (D32), including "Waiting for HR to assign an approver" and "Cancellation in progress",
  - each fulfilment item's status and *Delayed* flag (D28); a manually completed item shows as "Completed (confirmed by the <team> team)" without the evidence note (D58),
  - who each pending action is with (role or queue, and the approver's name for the manager stage),
  - the SLA due date for the current stage,
  - the effective date and every revision with its reason (D66),
  - the approved new reporting manager, from HR approval onward (D67),
  - rejection or cancellation reasons within D22 and D65 limits,
  - a timeline of key events.

#### 16. Downstream systems

- **BRD-001.D49 (Mocked adapters)** `[G0R-03, G0R-05, G0R-06]`. Payroll, IT, and Facilities have no real, named target systems for this assessment. They are represented as internally defined mock adapters that implement the minimum contract in D69, with simulated latency and configurable simulated outcomes. The simulated outcomes must cover, so each can be demonstrated and tested on purpose:
  - every Dispatch outcome in D25 (complete, accepted plus callback, timeout, 4xx, 5xx, invalid response, duplicate acknowledgement),
  - Amend, Cancel and Reverse outcomes, including "cancel not supported", "cancel too late (already executed)", "not executed" and reversal failure (D54, D55),
  - callbacks that arrive late, twice, out of order, or with an invalid or missing credential (D56, D57).

  Adapters must honour the idempotency rules in D53.

#### 17. Access (authentication)

- **BRD-001.D50 (Authenticated, role-differentiated access).** Only authenticated portal users can use this journey. The six roles and their rights are defined in D37. Adapters authenticate separately under D57. The authentication mechanism and how roles are enforced (JWT, RBAC) are Technical decisions in `constitution.md`.

#### 18. Performance expectations

- **BRD-001.D51 (Performance)** `[G0-25, G0R-24]`. Measured in the test environment with the seeded dataset (D52), under a load of **100 concurrent users** and **1,000 transfer requests** in the database. This is the agreed performance baseline for development and testing. *(Confirmed 2026-09-29.)*

  | Operation | Target (p95) |
  |---|---|
  | Submit request (API response) | ≤ 500 ms (constitution Tier 2) |
  | Approve / reject / withdraw / cancel / fulfilment update (API response) | ≤ 500 ms |
  | Load a queue (My Approvals, HR, Payroll, IT, Facilities), first page of 25 | ≤ 500 ms (API) and ≤ 2 s (screen fully rendered) |
  | Load request status / detail view | ≤ 300 ms (API) and ≤ 1.5 s (screen) |
  | Status change visible in the other party's view | ≤ 5 s with the portal open, or on next refresh |
  | Adapter dispatch after HR approval | Started ≤ 60 s after approval |
  | Cancel / Reverse operations after cancellation | Started ≤ 60 s after the request enters `CancellationPending` |
  | Adapter callback processing (API response to adapter) | ≤ 500 ms |
  | Effective-date application run | All requests due that day applied ≤ 15 min after 00:00 |
  | SLA reminder/escalation run | Reminders issued ≤ 15 min after the breach time |

#### 19. Test data

- **BRD-001.D52 (Minimum seeded test data)** `[G0-26]`. The seed dataset for development and UAT must include at least:
  - **Master data:** at least 4 departments, 3 locations, and 6 roles, with at least 1 inactive value of each type and at least 1 invalid combination (to test D03 and D40). At least 1 valid combination with an active designated manager, 1 with no designated manager, and 1 whose designated manager is inactive (D67).
  - **Functional users:** at least 2 active HR users (at least 1 with the HR Lead designation and at least 1 without), 2 Payroll, 2 IT, and 2 Facilities users, plus 1 inactive user of any functional role.
  - **Managers:** at least 3 managers, including a manager and their skip-level manager, 1 inactive manager, 1 active manager in a target department with no designated manager, and 1 user who is both a Manager and HR (for segregation tests, D23).
  - **Employees:**

    | ID | Profile | Used for |
    |---|---|---|
    | TE-01 | Eligible: over 6 months in role, no disciplinary case, no recent transfer, Manager A | Happy path |
    | TE-02 | Eligible, different manager (Manager B) | Manager scoping |
    | TE-03 | Under 6 months in current role | R1 fail |
    | TE-04 | Active disciplinary case | R2 fail, D65 data protection |
    | TE-05 | Transfer completed under 6 months ago | R3 fail |
    | TE-06 | Fails more than one rule (R1 and R2) | Multiple rule citation |
    | TE-07 | Already has an active request | Single-active rule |
    | TE-08 | Reports to an inactive manager / no manager | D42, D59 routing |
    | TE-09 | Eligible; will be made inactive during a test | D41 |
    | TE-10 | Eligible; manager reassigned during a test | D14 |
    | TE-11 | Tenure exactly on the 6-month boundary | R1 boundary |
    | TE-12 | Employee who also holds the HR role | D23 self-action refusal |
    | TE-13 | Eligible; has an earlier request in `CancellationPending` with one item `ReversalFailed` | D68 |
    | TE-14 | Eligible; requests a combination with no designated manager | D67 |

  - **Adapter scenarios:** each adapter can be set per test to each outcome listed in D49.

#### 20. Robustness rules added at the v1.1 re-review

- **BRD-001.D53 (Adapter operations and idempotency keys)** `[G0R-02]`.
  - The portal sends four kinds of **operation** to an adapter, each for one item: **Dispatch** (perform the change), **Amend** (change the effective date or other approved details of a dispatched item), **Cancel** (withdraw an instruction that is not yet executed) and **Reverse** (undo an executed change). Callbacks go the other way (D56).
  - Every operation has its own **idempotency key**: `<fulfilment reference ID>:<operation type>:<sequence>`, for example `REQ-1001-PAYROLL:DISPATCH:1`, `REQ-1001-PAYROLL:AMEND:1`, `REQ-1001-PAYROLL:REVERSE:1`. The reference ID links all operations of the item; the key identifies one operation.
  - **Same key:** every automatic retry, and every manual retry or Resume after an *unknown* outcome (timeout, 5xx, invalid response, retries exhausted), reuses the key of the operation being retried and sends an **identical payload**. The adapter returns the original result if it already executed.
  - **Next key** (sequence + 1): only when the adapter **definitely did not execute** the previous attempt of that operation type (a 4xx, or a "not executed" response), and for each new Amend (every reschedule is a new Amend).
  - The adapter must de-duplicate by **idempotency key**, never by reference ID alone. Different operation types on the same reference ID are different operations: a Reverse is never answered with the result of the Dispatch. A reused key with a different payload is refused by the adapter as a conflict (treated as a 4xx and audited).
  - At most one operation is outstanding per item at a time, with one exception: a Cancel may be sent while a Dispatch or Amend is outstanding. An Amend needed while a Dispatch is outstanding is sent once the Dispatch outcome is known. An item not yet successfully dispatched takes the current effective date in its next Dispatch instead of an Amend.
- **BRD-001.D54 (Cancel operation for dispatched instructions)** `[G0R-03]`. When a request enters `CancellationPending`, each item whose Dispatch was sent but whose outcome is not a confirmed "completed" (`InProgress`, `Retrying`, or `Failed` or `UnableToFulfil` with an *unknown* outcome) moves to `ReversalPending`. Automatic retries of its Dispatch stop and a **Cancel** operation is sent. The Cancel is handled as follows:

  | Cancel outcome from adapter | Item result |
  |---|---|
  | Cancelled: instruction withdrawn, never executed | `Cancelled` (resolved). The adapter guarantees the instruction will never be executed afterwards |
  | Too late: the instruction was already executed | Stays `ReversalPending`; a **Reverse** operation is sent (D55) |
  | Cancel not supported / cannot cancel in-flight work | Stays `ReversalPending`. The portal waits for the original Dispatch outcome: a "completed" callback triggers a Reverse; a definite failure makes the item `Cancelled`; no outcome within the unwind SLA escalates under D29 |
  | Timeout, 5xx, invalid response | Automatic retry of the same Cancel operation, up to 3 times (D25, D53) |
  | 4xx, or automatic retries exhausted | `ReversalFailed` (D55) |

  An item that was never dispatched (`Pending`), or whose Dispatch definitely did not execute (4xx or "not executed"), becomes `Cancelled` at once with no adapter call.
- **BRD-001.D55 (Unwinding on cancellation, and resolving reversal failures)** `[G0R-04, G0R-10]`.
  - **Completed by the adapter:** the item moves to `ReversalPending` and a **Reverse** operation is sent (D53). Success → `Reversed`. "Not executed" → `Cancelled`. Timeout, 5xx or invalid response → automatic retry (same key), up to 3. 4xx or retries exhausted → `ReversalFailed`.
  - **Completed manually** (D58): the adapter never executed it, so no Reverse is sent. The item moves to `ReversalPending` as a **manual reversal task** in its functional queue, which marks it reversed manually with evidence.
  - **`ReversalFailed`** stays with its owning functional queue (Payroll, IT, or Facilities), which **owns** the issue and can:
    - **Retry unwind**: resend the Cancel or Reverse under D53. No limit; every retry is audited.
    - **Mark reversed manually**: when undone outside the adapter. Evidence note mandatory, same controls as D58. → `Reversed` (source `Manual`).
  - **Waive** (HR Lead only): when the downstream change will not be undone (for example, it is harmless, or was corrected another way), the HR Lead may waive the item with a mandatory justification (minimum 20 characters). → `ReversalWaived`. The waiver is audited and visible to HR and the owning queue.
  - **Notification and escalation:** the owning queue is notified at once; HR and the HR Lead after 1 business day without action; then daily until resolved (D29).
  - **Final resolution:** an item is resolved when it is `Cancelled`, `Reversed` or `ReversalWaived`. When all three items are resolved the request moves to terminal `Cancelled` (T17) and the employee, HR and affected queues are notified. Until then the request stays `CancellationPending` and shows exactly which items are unresolved; it is never shown as `Cancelled` while an item is unresolved.

  Example: Payroll `Completed`, IT `Completed`, Facilities `Completed`; HR cancels. Payroll → `Reversed`, IT → `ReversalFailed`, Facilities → `Reversed`. The request is `CancellationPending` ("2 of 3 resolved"). The IT queue is notified; with no action after 1 business day HR and the HR Lead are notified. IT retries and the Reverse succeeds → `Reversed` → the request becomes `Cancelled`.
- **BRD-001.D56 (Late, duplicate and contradictory callbacks)** `[G0R-05]`. An adapter callback carries the reference ID, the idempotency key of the operation it reports on, and the outcome. After authentication (D57):
  1. It is matched to that operation. A callback for an unknown key, or a key belonging to another adapter's item, is rejected under D57.
  2. If the operation already has a recorded final outcome: a **matching** outcome is a duplicate, ignored and audited, with no notifications. A **different** outcome changes nothing, sets the *AdapterDiscrepancy* flag on the item, and alerts the owning queue and the HR Lead for manual follow-up.
  3. If the operation is still outstanding, the callback is applied **only** when the resulting item transition is allowed from the item's current status (D36). Otherwise it is recorded as a late callback and nothing changes.
  4. A callback never moves an item or request backwards, never changes a terminal request's status, and never triggers a second adapter operation, notification or completion check, except where the table below says so.

  | Item status when the callback arrives | Callback reports | Result |
  |---|---|---|
  | `InProgress` / `Retrying` (Dispatch outstanding) | Completed | `Completed` |
  | `InProgress` / `Retrying` (Dispatch outstanding) | Failed (not executed) | `Failed` |
  | `Completed` (manual, D58), Dispatch still outstanding | Completed | Outcome recorded; item stays `Completed` (source `Manual`); no notification |
  | `Completed` (manual), Dispatch still outstanding | Failed | Item stays `Completed`; *AdapterDiscrepancy*; alert to owning queue and HR Lead |
  | `ReversalPending` awaiting Dispatch outcome (D54) | Dispatch completed | Reverse operation sent (D55) |
  | `ReversalPending` awaiting Dispatch outcome (D54) | Dispatch failed (not executed) | `Cancelled` |
  | `Cancelled` after a confirmed Cancel | Dispatch completed | No change (contradicts the adapter's own confirmation); *AdapterDiscrepancy*; alert |
  | `Reversed` / `ReversalWaived` / any status where the operation is closed | Anything | Duplicate or late: no change; *AdapterDiscrepancy* only if the outcome contradicts the record |

- **BRD-001.D57 (Callback authentication and validation)** `[G0R-06]`.
  - Each adapter (Payroll, IT, Facilities) has its **own credential** issued by the portal. Every callback must prove it comes from that adapter. For this assessment a per-adapter shared secret used to sign the callback payload, with a timestamp, is sufficient; the exact scheme is defined in `plan.md` (D71).
  - A callback is accepted only if **all** hold: the credential or signature is valid; the adapter identity matches the adapter of the item named; the reference ID and idempotency key exist and belong to that item; the timestamp is within the allowed window (to stop replay); and the payload is well formed.
  - A valid reference ID alone is never enough. Portal user credentials are never accepted on the callback interface.
  - A callback failing any check is rejected, **changes nothing**, and is audited as a security event with the source, the reason and the claimed IDs (never the secret). 5 or more rejected callbacks from the same source within 10 minutes raise a security alert in the operational log.
- **BRD-001.D58 (Manual completion controls)** `[G0R-07]`.
  - **Who:** an active user of the owning functional role only (Payroll for the Payroll item, and so on), never the request's employee (D23). The same user who retried the item may complete it; retrying and completing are both functional-queue actions and need no second person.
  - **When:** only while the request is `PendingFulfilment` or `FulfilmentFailed`, and only when the item is `Failed`, or `InProgress` with the *Delayed* flag (the adapter accepted the work but no callback arrived within the item SLA). Manual completion is **refused** for `Pending` (no adapter attempt yet), `Retrying` (an automatic retry is still under way), `InProgress` without *Delayed*, `UnableToFulfil` (HR must Resume first), `Completed`, any unwind status, and any request in `CancellationPending` or a terminal status. It is allowed after the effective date has passed; D16 and D60 then decide when the change is applied.
  - **Evidence:** a note of 20 to 1,000 characters is mandatory, with an optional external reference (for example a ticket number). The completion is recorded with completion source `Manual`, the user, their role and the time.
  - **Visibility:** the evidence note is visible to HR and the owning functional queue. The employee sees "Completed (confirmed by the <team> team)" only. The manager and the other functional queues do not see it.
  - **Immutability:** the note cannot be edited or deleted. A correction is added as a new, audited note linked to the original.
  - A late callback after manual completion is handled under D56.
  - **Mark reversed manually** (D55) has the same controls, applied to `ReversalPending` (manual task, or awaiting outcome and *Delayed*) and `ReversalFailed` items during `CancellationPending`.
- **BRD-001.D59 (Approver assignment when there is no active manager)** `[G0R-08]`.
  - When the employee has no active manager at routing (T2) or their manager becomes inactive during `PendingManagerApproval`, the request stays `PendingManagerApproval`, is flagged *AwaitingApproverAssignment* and appears in the HR queue. The employee sees "Waiting for HR to assign an approver".
  - **Who HR may assign**, in this order: (1) the nearest active manager above the employee in the current reporting hierarchy (the skip-level manager, then upward); (2) only if there is none, any active manager in the employee's current department, with a mandatory reason. HR may never assign the employee, themselves, or any user who would break D23.
  - **SLA:** the approver-assignment SLA (1 business day, D29) starts when the request enters the HR queue. The 5-business-day manager SLA starts when HR assigns the approver, not before.
  - **No eligible approver:** if neither (1) nor (2) gives an active manager, the HR Lead may cancel the request (T18) with a mandatory reason (for example "No eligible approver"). The employee is notified and may submit a new request later. The request is never left waiting without an owner: until assignment or cancellation, D29 escalation applies.
  - The assigned approver has exactly the manager rights in D37 for this request. Reassignment after the manager SLA escalation (D29) follows the same rules.
- **BRD-001.D60 (Effective-date cutoff)** `[G0R-11]`.
  - The cutoff is **00:00:00 Asia/Kolkata on the effective date** (the current effective date, after any reschedule).
  - An item counts as completed at the moment the portal **commits** its `Completed` status (adapter response or callback processed, or manual completion saved). The time claimed by the adapter is recorded but not used.
  - Last item committed **before** the cutoff → the request is `Scheduled` (T9) and applied by the effective-date run on that date (T13).
  - Last item committed **at or after** the cutoff → the request is late: it is flagged *EffectiveDateMissed* (if not already) and applied immediately (T10), unless HR has rescheduled to a later date.
  - The completion processing and the effective-date run are serialised per request (D43). Whichever runs first, the result is the one above. Example: IT completes at 23:59:59 on the day before → `Scheduled`, then applied at 00:00. IT completes at 00:00:01 → *EffectiveDateMissed*, applied at 00:00:01. In both cases the organisational change takes effect on the effective date; only the flag differs.
- **BRD-001.D61 (Atomic application of the organisational change)** `[G0R-19]`. Applying the change is **one all-or-nothing unit of work**: department, location, role, reporting manager, last transfer completion date, request status `Completed` and the audit entry are saved together. If any part fails, none is saved: the organisational record stays exactly as before, the request keeps its previous status (`Scheduled` or `PendingFulfilment`), and the failed attempt is audited. The request can never show `Completed` with a partial organisational update, and the organisational record can never change without the request becoming `Completed`. Notifications are generated only after the change is saved. Recovery follows D62.
- **BRD-001.D62 (Effective-date run failure and recovery)** `[G0R-12]`.
  - The effective-date run starts at 00:00 Asia/Kolkata daily. Each due request is applied independently (D61); one failure does not stop the others.
  - A **recovery check** runs every 15 minutes and also when the portal starts up. It applies any request that is due (effective date today or earlier, `Scheduled`, or late under D60) and not yet applied. A missed or crashed run is therefore caught up automatically, and running it twice never applies a request twice.
  - Every attempt, success and failure is audited.
  - A request due on a date and not applied by **01:00** Asia/Kolkata on that date is flagged *ApplicationOverdue*, and HR and the HR Lead are alerted. The recovery check keeps retrying. Once the cause is fixed the HR Lead may trigger **Apply now**, which runs the same atomic application. HR may also cancel (D10).
  - A request applied late records both the effective date and the actual time applied. The organisational change is effective from the effective date.
  - A request is never left silently in `Scheduled` after its effective date: until applied or cancelled it carries *ApplicationOverdue* and D29 reminders.
  - A request held because the approved new manager is inactive (D67) is not "failed"; it is flagged *NewManagerRequired* and applied as soon as HR selects a replacement.
- **BRD-001.D63 (Notification idempotency)** `[G0R-13]`. Each notification has a de-duplication key made of the **business event ID, the recipient and the notification type**. Processing the same business event more than once (retries, duplicate callbacks, concurrent processing, job re-runs) creates at most one notification per recipient. Each scheduled reminder or escalation occurrence is its own business event (for example "HR SLA reminder, day 2"), so intended repeats are still sent. The real-time alert is shown at most once per notification record per open session; reconnecting refreshes the unread count but creates no new records. Duplicate or late callbacks and losing concurrent actions generate no notifications (D43, D56).
- **BRD-001.D64 (What "tamper-evident" means)** `[G0R-14]`. For this project:
  1. **No application path can change audit records.** No UI, API or role (including HR and HR Lead) can edit or delete an audit entry.
  2. **The application's own database account can only add and read audit records.** It has no permission to update, delete or truncate them.
  3. **Each audit record is chained.** It stores a cryptographic hash of its own content together with the hash of the previous record, so any change, deletion or insertion breaks the chain.
  4. **The chain is verified.** A verification check runs automatically every day and on demand by HR. It reports the first broken record, if any. A break raises a security alert to the HR Lead, and every verification run and result is itself audited.

  Testable result: altering or deleting an audit row directly in the database is detected by the next verification. Preventing a database administrator from making such a change is out of scope; detecting it is in scope. Audit records are kept for the life of the system. The hash algorithm and chain scope are defined in `plan.md` (D71).
- **BRD-001.D65 (Sensitive data protected in the API, not only the UI)** `[G0R-15]`.
  - **HR-only data:** disciplinary case data (flag and details); eligibility evaluation detail (the data values used and per-rule pass/fail); the full audit trail; HR Lead waiver justifications.
  - **HR and owning functional queue only:** manual completion and manual reversal evidence notes (D58).
  - **Employee (own request only):** failed rule names and the HR rejection comment addressed to them (D22), never disciplinary details or the data values used.
  - **Manager, Payroll, IT, Facilities:** none of the above. The Payroll, IT and Facilities data sets are limited to D37.
  - These fields are **left out of the response by the server** for every caller not entitled to them. This covers detail and list endpoints, search, exports, real-time events, notification content, error messages and logs. Returning them and hiding them in the UI is a defect. Per-role API tests must show the fields are absent (AS-N30).
- **BRD-001.D66 (Rescheduling limits)** `[G0R-16]`.
  - HR may change a request's effective date **at most 3 times** after submission, counting any revision made at HR approval (D18). A 4th change is refused with "Reschedule limit reached. Cancel the request if the transfer cannot go ahead." (The employee may then submit a new request.)
  - Rescheduling is allowed only in `PendingFulfilment`, `FulfilmentFailed` or `Scheduled` (and at HR approval under D18), never in `CancellationPending` or a terminal status.
  - Each change needs a revised date at least 3 business days in the future, a mandatory reason category ("Fulfilment delay", "Employee request", "Business need" or "Other") and a mandatory comment (maximum 500 characters).
  - Every change is audited with old date, new date, reason category, comment, user and time; is shown to the employee in their timeline with the old and new dates, reason category and comment; and is notified under D46.
  - Every change is sent to each dispatched, not-unwound item as a new Amend operation (D53). It clears *EffectiveDateMissed* and *ApplicationOverdue*.
- **BRD-001.D67 (New reporting manager)** `[G0R-17]` *(Gate 0 reviewer decision, 2026-09-29)*.
  - The employee never selects a new manager.
  - Each valid (department, location, role) combination may name a **designated reporting manager** in master data (D03).
  - At HR approval: if the combination's designated manager is defined and active, it becomes the request's **approved new manager**. If none is defined, or the designated manager is inactive, HR must select an active manager in the target department before approving (Approve is blocked until then, D21). HR may not select the employee.
  - The approved new manager is fixed at HR approval, shown to the employee, included in the adapter "to" details (D69), and applied with the rest of the change (D61).
  - If the approved new manager becomes inactive before the change is applied, the request is flagged *NewManagerRequired* and HR is notified. HR must select a replacement active manager in the target department; the replacement is audited and sent to the adapters as an Amend (D53). The change is **not applied** while the flag is set. If the effective date passes meanwhile, the change is applied as soon as the replacement is saved, under D60 late rules.
- **BRD-001.D68 (A new request while an earlier cancellation is still unwinding)** `[G0R-18, G0R-20]` *(Gate 0 reviewer decision, 2026-09-29)*.
  - An employee may submit a new request while an earlier request is `CancellationPending` (D07, D35). The new request goes through manager approval normally.
  - **HR cannot approve** the new request while any earlier request of the same employee is `CancellationPending`. The new request is flagged *BlockedByPriorCancellation*, the HR queue shows which earlier request and which items are unresolved, and Approve is refused with "Approval blocked until the earlier transfer's cancellation is complete." HR may still reject. The employee sees "Waiting for an earlier cancellation to finish".
  - While blocked, the HR SLA does not run; it restarts when the block clears (D30). The earlier request's unwind escalation (D29, D55) drives resolution.
  - This prevents overlapping organisational changes: an earlier request in `CancellationPending` never changes organisational data (D10), and no new downstream instructions are dispatched for the employee until every earlier downstream change is undone, reversed manually or waived.
- **BRD-001.D69 (Minimum adapter contract)** `[G0R-25]`. The adapter contract must include at least the following. Formats, transport and error-code catalogue are Technical decisions in `plan.md` (D71).
  - **Operations:** Dispatch, Amend, Cancel, Reverse (portal → adapter); Callback (adapter → portal). A manual or automatic Retry is a resend of an existing operation under D53, not a new operation type.
  - **Request fields:** request ID; fulfilment reference ID; operation type; idempotency key; employee ID; from details (department, location, role, manager); to details (department, location, role, approved new manager); effective date; timestamp.
  - **Response and callback fields:** fulfilment reference ID; operation type; idempotency key; response status (completed, accepted, cancelled, not executed, already processed, cancel not supported, failed); error code; error message; callback reference; timestamp.
- **BRD-001.D70 (Request status, item status and flags are separate)** `[G0R-26]`. Three separate concepts, kept separate in data, APIs, UI and tests. Values of one are never stored in, or used as, another.

  | Concept | Values | Where it applies |
  |---|---|---|
  | **Request status** (exactly one per request) | `Submitted`, `PendingManagerApproval`, `PendingHRValidation`, `PendingFulfilment`, `FulfilmentFailed`, `Scheduled`, `CancellationPending`, `Completed`, `RejectedByManager`, `RejectedByHR`, `Withdrawn`, `Cancelled` (D32) | The request |
  | **Fulfilment item status** (exactly one per item) | `Pending`, `InProgress`, `Retrying`, `Failed`, `UnableToFulfil`, `Completed`, `ReversalPending`, `ReversalFailed`, `Cancelled`, `Reversed`, `ReversalWaived` (D36) | Each of the three items |
  | **Flags** (zero or more, each set and cleared independently) | *Delayed* (stage or item), *AwaitingApproverAssignment*, *EffectiveDateMissed*, *EligibilityChangedAfterApproval*, *CurrentAssignmentChanged*, *ProposedPositionInvalid*, *BlockedByPriorCancellation*, *NewManagerRequired*, *ApplicationOverdue* (request level); *Delayed*, *AdapterDiscrepancy* (item level) | Request or item |

  Attributes such as cancellation source, completion source and reason category are attributes, not statuses or flags. Where the same word appears at two levels (`Cancelled`, `Completed`), the level is always stated.
- **BRD-001.D71 (Development entry conditions)** `[G0R-22, G0R-25]`. The following are Technical decisions, but development of the affected area must not start until each is defined in the feature `plan.md` and approved with TL concurrence at Gate 1:
  1. The database mechanism for the single-active-request rule (D07), for example a partial unique index over the active set. A plain unique constraint on employee and status is not acceptable.
  2. The adapter contract (D69) with the idempotency model (D53), cancel and reverse handling (D54, D55) and callback handling (D56).
  3. The callback authentication scheme (D57).
  4. The audit hash chain and verification (D64), and the database permission model for the audit table.
  5. The scheduler: effective-date run, recovery check, SLA jobs and their serialisation with completion processing (D60, D62, D43).
  6. Timezone handling: UTC storage and Asia/Kolkata display and calculation (D31).
  7. Server-side field filtering by role (D65).

  The spec and test cases must also be revised to v1.2 before development starts.

---

### Mandatory Acceptance Scenarios

Specs and test cases must include at least these scenarios, each tracing to the clauses shown. `[Gate 0 mandatory list]`. IDs AS-P23 to AS-P29 and AS-N23 to AS-N30 are the IDs the Gate 0 reviewer gave at re-review and are kept as given. AS-P11 to AS-P22 are intentionally unused.

**Positive**

| ID | Scenario | Expected result | Clauses |
|---|---|---|---|
| AS-P01 | Eligible employee (TE-01) submits a valid request | Request created, status `PendingManagerApproval`, Manager A and employee notified, audited | D01–D08, T1–T2 |
| AS-P02 | Manager approves | `PendingHRValidation`, HR queue shows R1 to R3 results | D13, D21, T3 |
| AS-P03 | HR approves (all rules pass) | `PendingFulfilment`, three items dispatched with unique reference IDs and `DISPATCH:1` keys, approved new manager recorded, **organisational data unchanged** | D16, D21, D24, D53, D67, T6 |
| AS-P04 | Payroll, IT, and Facilities complete independently and in any order | Each item `Completed` separately. Overall stays `PendingFulfilment` until the last one | D24, D28, D36 |
| AS-P05 | Employee views individual status of all three items | Each item's status and *Delayed* flag visible, with a "2 of 3" style summary | D28, D48 |
| AS-P06 | All three complete before the effective date, then the effective date arrives | `Scheduled`, then `Completed` at 00:00 on the effective date. Organisational data updated then, not earlier | D16, D60, T9, T13 |
| AS-P07 | Manager rejects | `RejectedByManager` (terminal), employee notified, new request allowed | D13, T4 |
| AS-P08 | HR rejects on failed rule (TE-03/04/05/06) | `RejectedByHR`, failed rule name(s) shown to the employee, manager sees no rule detail | D21, D22, D65, T7 |
| AS-P09 | Employee withdraws at `PendingManagerApproval` and at `PendingHRValidation` | `Withdrawn` (terminal), approver loses the item | D09, T5, T8 |
| AS-P10 | Manager, HR, and fulfilment SLAs are exceeded | *Delayed* flag, reminders, and escalation at the defined points. No auto-approval | D29–D31 |
| AS-P23 | Manager becomes inactive, or the reporting manager changes, while the request is `PendingManagerApproval` | Request moves to the new manager or to HR approver assignment (*AwaitingApproverAssignment*); the replaced manager loses access; the manager SLA restarts from assignment | D14, D30, D37, D59 |
| AS-P24 | HR reschedules the effective date | New date recorded with reason; employee sees old and new date and is notified; audit entry created; an Amend with a new key is sent to each dispatched item | D17, D53, D66 |
| AS-P25 | Functional user manually completes a `Failed` item with mandatory evidence | Item `Completed` (source `Manual`); evidence visible to HR and the queue only; audit entry created | D26, D58 |
| AS-P26 | Functional user retries a `Failed` item | Same reference ID; same key after an unknown outcome, next key after a 4xx; item SLA not restarted | D26, D30, D53 |
| AS-P27 | HR cancels after HR approval with a mix of completed and open items | Request `CancellationPending`; completed items get Reverse operations; never-executed items `Cancelled`; request `Cancelled` once all items are resolved | D10, D54, D55, T14, T17 |
| AS-P28 | All fulfilment completes before the effective date | Organisational data unchanged until the effective date, then department, location, role, manager and last transfer date change together in one unit | D16, D60, D61 |
| AS-P29 | Real-time notification fails | Persistent notification is available when the user next opens the portal; workflow unaffected | D45, D47 |
| AS-P30 | HR approves a request for a combination with no designated manager (TE-14) | Approve blocked until HR selects an active manager in the target department; that manager is applied on the effective date | D21, D67 |
| AS-P31 | Employee with no active manager (TE-08) submits | *AwaitingApproverAssignment*; employee sees "Waiting for HR to assign an approver"; HR assigns the skip-level manager; the 5-day manager SLA starts at assignment | D29, D59 |
| AS-P32 | HR cancels while an item is `InProgress`; adapter confirms the Cancel | Item `Cancelled` with no Reverse; request `Cancelled` when all items are resolved | D54, D55 |
| AS-P33 | A `ReversalFailed` item is resolved by retry, by manual reversal, or by HR Lead waiver | Item `Reversed` or `ReversalWaived`; request moves to `Cancelled` only when the last item is resolved | D55, D58, T17 |

**Negative**

| ID | Scenario | Expected result | Clauses |
|---|---|---|---|
| AS-N01 | Effective date less than 14 calendar days away | Submission rejected with a validation message. Nothing created | D05 |
| AS-N02 | Employee (TE-07) already has an active request | Rejected: "You already have an active transfer request" | D07 |
| AS-N03 | Duplicate submission (double click, two tabs, or concurrent API calls) | Exactly one request created. Same idempotency key returns the original | D07, D43 |
| AS-N04 | Employee opens another employee's request by ID | Refused (indistinguishable from not-found), audited | D37 |
| AS-N05 | Employee tries to approve their own request (including TE-12 with the HR role) | Refused, audited | D23, D37 |
| AS-N06 | Manager approves someone for whom they are not the current approver, or after being replaced | Refused | D12, D14, D37 |
| AS-N07 | Non-HR user calls an HR action (approve, reject, cancel, reschedule, resume, assign approver) | Refused | D37 |
| AS-N08 | Payroll user updates the IT item | Refused | D37 |
| AS-N09 | Fulfilment adapter times out | `Retrying` with the same idempotency key and payload, up to 3 automatic retries, then `Failed` (outcome unknown) and the queue is notified | D25, D53 |
| AS-N10 | Adapter returns 4xx or 5xx | 4xx: `Failed` with no automatic retry. 5xx: automatic retry as for a timeout | D25 |
| AS-N11 | Adapter returns an invalid response | Treated as unknown outcome and retried. Payload audited | D25 |
| AS-N12 | Same operation received twice (retry or duplicate) | Action performed once. Second call returns the original result. Duplicate callback ignored | D53, D56 |
| AS-N13 | One item succeeds while another fails (e.g., Payroll completed, Facilities Unable to Fulfil) | Overall `PendingFulfilment` while the failure is open, then `FulfilmentFailed` after Unable to Fulfil. Never `Completed` | D26–D28 |
| AS-N14 | Invalid status transition attempted (e.g., `Completed → PendingManagerApproval`, `CancellationPending → PendingFulfilment`) | Refused with an error, nothing changed, audited | D33 |
| AS-N15 | Any action on a withdrawn, completed, rejected, or cancelled request | Refused | D34 |
| AS-N16 | Employee tries to withdraw after HR approval | Refused: "Please contact HR" | D09 |
| AS-N17 | Proposed details identical to current assignment | Submission rejected | D04 |
| AS-N18 | Invalid department/location/role combination sent directly to the API | Rejected | D03 |
| AS-N19 | Two users act on the same request at the same moment | Exactly one transition applied. The other is told to refresh | D43 |
| AS-N20 | Fulfilment still incomplete on the effective date | Transfer not applied. *EffectiveDateMissed* shown. HR can reschedule or cancel | D17, D60 |
| AS-N21 | Employee becomes inactive mid-request (TE-09) | Before HR approval: `Cancelled` (System). After HR approval: `CancellationPending`, items unwound, then `Cancelled` | D11, D41, D55, T15, T16 |
| AS-N22 | Master-data value deactivated before HR decision | HR cannot approve and must reject as "Proposed position invalid" | D40 |
| AS-N23 | HR cancels; one downstream reversal fails | Request stays `CancellationPending` (not `Cancelled`); item `ReversalFailed`; queue notified, HR and HR Lead escalated after 1 business day; employee sees which item is unresolved | D29, D55 |
| AS-N24 | Adapter sends the original callback after manual completion, or after cancellation or reversal | No invalid or backward transition; no duplicate notification; *AdapterDiscrepancy* raised only if the outcome contradicts the record | D56 |
| AS-N25 | Callback with unknown IDs, missing or invalid credential, or no authentication | Rejected, nothing changed, audited as a security event | D57 |
| AS-N26 | Effective-date run fails or does not run | Recovery check applies the request; after 01:00 *ApplicationOverdue* and HR/HR Lead alerted; never silently left `Scheduled` | D62 |
| AS-N27 | One organisational field fails to save during application | Whole change rolled back; organisational record unchanged; request not `Completed`; attempt audited; recovery under D62 | D61, D62 |
| AS-N28 | Same business event processed twice | Recipient receives one notification | D63 |
| AS-N29 | Employee (TE-13) submits a new request while an earlier request is `CancellationPending` with an unresolved reversal | Submission allowed; HR Approve refused with *BlockedByPriorCancellation*; HR may reject; approval allowed once the earlier request is `Cancelled` | D07, D35, D68 |
| AS-N30 | Manager, Employee, Payroll, IT or Facilities calls APIs (detail, list, search, export, real-time) for TE-04's request | Disciplinary data, eligibility detail and HR-only fields are absent from every response, not just hidden | D22, D65 |
| AS-N31 | Manual completion attempted on a `Pending`, `Retrying`, non-*Delayed* `InProgress`, `UnableToFulfil` or unwind item, by the request's own employee, by another team, or with an empty evidence note | Refused, nothing changed, audited | D23, D37, D58 |
| AS-N32 | Last item completes at 23:59:59 on the day before the effective date, and in a second run at 00:00:01 on the effective date | First: `Scheduled`, applied at 00:00. Second: *EffectiveDateMissed*, applied immediately. Same result whichever job runs first | D43, D60 |
| AS-N33 | An audit record is edited or deleted directly in the database; a user tries to edit or delete audit via the API | Next verification reports the break and alerts the HR Lead; no API exists to edit or delete | D64 |
| AS-N34 | HR tries a 4th reschedule, or reschedules without a reason, or to under 3 business days away | Refused | D66 |
| AS-N35 | Reverse sent for a `Completed` item | Reverse uses its own key (`REVERSE:1`) and is executed, not answered with the Dispatch result | D53, D55 |
| AS-N36 | HR cancels while an item is `InProgress` and the adapter does not support Cancel | Item stays `ReversalPending` until the Dispatch outcome arrives, then Reverse (if completed) or `Cancelled` (if failed) | D54 |
| AS-N37 | Payroll adapter sends a callback for the IT item, or replays an old valid callback outside the time window | Rejected, audited as a security event | D57 |
| AS-N38 | Approved new manager becomes inactive before the effective date | *NewManagerRequired*; change not applied until HR selects a replacement; then applied | D62, D67 |

---

### Decision Register (closes G0R-01)

**Open items: none.** No decision in this BRD is an unconfirmed assumption, and none is left for development to decide.

**v1.1 assumptions, confirmed as written by the Gate 0 reviewer (Shamik Bhattacharya) on 2026-09-29**

| Clause | Decision |
|---|---|
| D03 | Seeded combination table only; no headcount or vacancy validation |
| D14 | An approval already given stays valid after a manager change |
| D16 | A late fulfilment completion is applied on the day it completes, unless HR reschedules |
| D18 | A revised effective date is required at approval if the effective date passed before HR approval |
| D22 | HR may reject for reasons other than R1 to R3, with category and mandatory comment |
| D29 | HR SLA 3 business days; manager escalation at 10 and HR escalation at 5 business days |
| D31 | Portal business timezone Asia/Kolkata |
| D40 | Approved master data stays committed after HR approval |
| D51 | Load baseline: 100 concurrent users, 1,000 transfer requests |

**Decided by the Gate 0 reviewer on 2026-09-29 during the v1.2 revision**

| Question | Decision | Clauses |
|---|---|---|
| Is HR cancellation terminal immediately? | No. `CancellationPending` until every item is resolved, then `Cancelled` | D10, D55, T14, T17 |
| New request while an earlier cancellation is unwinding? | Submission allowed; HR approval blocked until the earlier request is `Cancelled` | D07, D35, D68 |
| How is the new reporting manager determined? | From the master-data combination; HR selects one when none is defined or it is inactive; the employee never selects | D03, D67 |

**New v1.2 business rules and values, for approval at this Gate 0 review.** These answer the re-review items directly and are decisions, not assumptions. The reviewer may change any value at Gate 0.

| Rule | Value decided | Clause |
|---|---|---|
| Idempotency key per operation, not per item | `<ref>:<operation>:<n>`; same key after unknown outcome, next key after definite non-execution | D53 |
| Handling when Cancel is unsupported | Wait for the Dispatch outcome, then Reverse or Cancel | D54 |
| Who may waive a failed reversal | HR Lead only, justification required | D55 |
| Manual completion of an `InProgress` item | Allowed only once the item is *Delayed* | D58 |
| Previous manager access | Read-only on their own decision; none if replaced before acting | D37 |
| Approver assignment SLA and pool | 1 business day; hierarchy first, then current department; HR Lead may cancel if nobody is eligible | D29, D59 |
| Effective-date cutoff | 00:00:00 Asia/Kolkata, by portal commit time | D60 |
| Recovery cadence and overdue point | Every 15 minutes; overdue at 01:00 | D62 |
| Reschedule limit | 3 changes per request, reason mandatory | D66 |
| Invalid-callback alert threshold | 5 in 10 minutes from one source | D57 |
| Tamper-evidence | Insert-only DB account plus hash chain with daily verification | D64 |

**Notes:** This is still the only Business Requirement in scope. Under SDD's "one feature, one spec" rule, one spec traces back to BRD-001, at clause level (`BRD-001.Dxx`). Decisions are Business decisions unless marked otherwise. Adapter formats, timeout values, retry delays and enforcement mechanisms are Technical decisions for `constitution.md` and the feature's `plan.md`, subject to the entry conditions in D71. Spec and test case generation will commence following Gate 0 approval of this BRD.

---

## Appendix A: Gate 0 feedback Traceability (v1.0 → v1.1)

| # | Priority | Feedback (summary) | Resolved in |
|---|---|---|---|
| G0-01 | Critical | When does the transfer become effective: HR approval or effective date? | D16 (effective date, after all fulfilment), D19 |
| G0-02 | Critical | Withdrawal cutoff | D09 (until HR approval), D10 (HR cancel afterwards) |
| G0-03 | Critical | HR workflow: automatic or manual? | D21 (system evaluates, HR decides, no override) |
| G0-04 | Critical | Behaviour when Payroll/IT/Facilities fails | D25, D26 |
| G0-05 | Critical | Final status on permanent failure | D27 (`FulfilmentFailed`, then HR resume or cancel), D10, D55 |
| G0-06 | Critical | Partial completion behaviour and visibility | D28 |
| G0-07 | Critical | Duplicate-processing protection and idempotency | D24, D53 |
| G0-08 | Critical | Full role access matrix, enforced by the API | D37, D23 |
| G0-09 | Critical | HR SLA, reminder, escalation | D29 |
| G0-10 | Critical | Manager changes while pending | D12, D14 |
| G0-11 | Critical | Fulfilment not complete by the effective date | D17, D18 |
| G0-12 | High | Allowed status transitions | D32–D36 |
| G0-13 | High | HR manual rejection reason | D22 |
| G0-14 | High | Profile changes while pending: original or latest data? | D08, D39, D21 |
| G0-15 | High | Master-data relationships and valid combinations | D03 |
| G0-16 | High | Master data changes after submission | D40 |
| G0-17 | High | Single-active rule enforced by backend and database | D07 |
| G0-18 | High | Audit trail | D44 |
| G0-19 | High | Meaning of "push notification"; delivery failure | D45–D47 |
| G0-20 | High | Concurrent-action handling | D43 |
| G0-21 | High | Adapter error scenarios | D25, D49 |
| G0-22 | Medium | System of record | D19 |
| G0-23 | Medium | Employee becomes inactive | D41 |
| G0-24 | Medium | Manager or functional user becomes inactive | D42, D29 |
| G0-25 | Medium | Performance expectations | D51 |
| G0-26 | Medium | Minimum test data | D52 |
| G0-27 | Medium | Business-day calculation with examples | D31 |
| G0-28 | Medium | Same department/location/role as current | D04 |
| Scenarios | Mandatory | Positive and negative acceptance scenarios | AS-P01 to AS-P10, AS-N01 to AS-N22 |
| Flag | Key point | Effective date vs HR approval | D16 |

## Appendix B: Gate 0 re-review Traceability (v1.1 → v1.2)

Source: `.ai-context/pr_reviews/BRD-20260929.md`.

| # | Priority | Feedback (summary) | Resolved in |
|---|---|---|---|
| G0R-01 | P0 | "None blocking" contradicted open assumptions | Decision Register (all confirmed 2026-09-29); every "(Assumption)" marker removed |
| G0R-02 | P0 | Reference ID as idempotency key conflicts with reversal and amendment | D24, D53, D69 |
| G0R-03 | P0 | Cancelling an already-dispatched adapter request | D54, D49 |
| G0R-04 | P0 | No final business handling for `ReversalFailed` | D55, D29, D36 |
| G0R-05 | P0 | Late or duplicate callbacks after state changes | D56 |
| G0R-06 | P0 | Callback authentication | D57 |
| G0R-07 | P0/P1 | Manual completion controls | D58 |
| G0R-08 | P1 | Approver assignment when there is no active manager | D59, D29, D42 |
| G0R-09 | P1 | Manager historical access wording | D37, D14 |
| G0R-10 | P0 | Is HR cancellation terminal before reversals finish? | D10, D32, D55, T14, T17 |
| G0R-11 | P1 | Effective-date race at 00:00 | D60, D43 |
| G0R-12 | P0 | Effective-date job failure recovery | D62 |
| G0R-13 | P1 | Notification duplication | D63 |
| G0R-14 | P1 | Testable "tamper-evident" | D64 |
| G0R-15 | P0 | Sensitive data protected in the API | D65, D22 |
| G0R-16 | P1 | Reschedule limit and reason | D66 |
| G0R-17 | P0 | How the new reporting manager is determined | D67, D03 |
| G0R-18 | P0 | New request while an earlier reversal is outstanding | D68, D07, D35 |
| G0R-19 | P0 | Transaction boundary for applying the change | D61 |
| G0R-20 | P0 | Two overlapping organisational changes | D68, D10 |
| G0R-21 | Mandatory | Additional acceptance scenarios | AS-P23 to AS-P29, AS-N23 to AS-N30 (reviewer IDs), plus AS-P30 to AS-P33 and AS-N31 to AS-N38 |
| G0R-22 | Readiness | Database uniqueness mechanism for the active-request rule | D07, D71 |
| G0R-23 | Readiness | Confirm timezone | D31 (Asia/Kolkata confirmed; UTC storage) |
| G0R-24 | Readiness | Confirm load profile | D51 (confirmed) |
| G0R-25 | Readiness | Adapter contract before development | D69, D71 |
| G0R-26 | Terminology | Keep request status, item status and flags separate | D70 |
