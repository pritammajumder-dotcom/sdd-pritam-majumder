> **ARCHIVED — SUPERSEDED**
>
> | Field | Value |
> |---|---|
> | Document | Business Requirements Document — Employee Internal Transfer Digital Journey |
> | Version | **v1.1** |
> | Status | Superseded by **v1.2** (`.ai-context/BRD.md`) on 2026-09-29 |
> | Reason | Gate 0 re-review by Shamik Bhattacharya (Project Manager, Gate 0 Reviewer) on 2026-09-29: **Changes Requested**, 25 feedback items (20 marked P0/P1 blockers) plus additional mandatory acceptance scenarios. See `.ai-context/pr_reviews/BRD-20260929.md` |
> | Change record | `.ai-context/decisions/brd-change-log.md` → Version 1.2 |
>
> This file is kept read-only for traceability. Do not use it as a requirement source for specs, plans, tasks or tests. The body below is v1.1 exactly as submitted for re-review, including its own "Pending Gate 0" header.

---

# Business Requirements Document (BRD)

| Field | Value |
|---|---|
| Document | Employee Internal Transfer Digital Journey |
| Version | **v1.1** |
| Status | **Pending Gate 0** (re-review) |
| Date | 2026-09-28 |
| Owner | Shamik Bhattacharya, Project Manager (Gate 0 Reviewer) |
| Supersedes | v1.0, archived at `.ai-context/archive/brd/BRD-v1.0.md` |
| Revision driver | Gate 0 feedback on v1.0, 2026-09-28: 28 items plus mandatory acceptance scenarios (`.ai-context/pr_reviews/BRD-20260928.md`) |
| Change record | `.ai-context/decisions/brd-change-log.md` → Version 1.1 |

### Version History

| Version | Date | Summary | Author | Gate 0 |
|---|---|---|---|---|
| v1.0 | Not recorded (on or before 2026-09-25) | Initial baseline for BRD-001 | Not recorded | Changes Requested (2026-09-28, Shamik Bhattacharya) |
| v1.1 | 2026-09-28 | Revised against Gate 0 feedback G0-01 to G0-28. Effective date is now the point the transfer takes effect. Adds withdrawal cutoff, HR action model, fulfilment failure, retry and idempotency rules, access matrix, SLAs and escalation, a state-transition table, audit, notifications, concurrency, performance, test data, business-day examples, and mandatory acceptance scenarios. | Agent (on behalf of PM) | Pending |

### How to read v1.1

- Every decision has a stable clause ID (`BRD-001.Dxx`). Specs, plans, tasks and test cases should trace to clause IDs, not just to `BRD-001`.
- `[G0-nn]` tags show which Gate 0 feedback item a clause answers. Appendix A maps every item to its clause.
- Clauses marked **(Assumption)** are reasoned business judgements made because no live stakeholder is available in this assessment. The Gate 0 reviewer must confirm or overturn them.

---

## Objective

Enable an employee to initiate, track, and complete an Internal Transfer Request entirely through the One-Point Employee Portal. This replaces the current manual, multi-team process (Employee → Manager → HR → Payroll → IT → Facilities) with a single digital journey. The portal runs that journey end to end and shows the employee one unified view of progress.

## Scope

**In scope:**
- Employee-initiated Internal Transfer Request capture: proposed department/business unit, proposed location, proposed role/job position, effective date, and optional reason. All values are validated against organisational master data, not free text, and only valid combinations can be chosen.
- Request submission with at least 14 calendar days between submission and effective date.
- One active (non-terminal) transfer request per employee at a time, enforced by the backend and database.
- Employee withdrawal of their own request up to (but not including) HR approval. After HR approval, only HR can cancel.
- An employee view, available at all times, showing the request's overall status, the status of each fulfilment activity, and which actions are pending with whom.
- A manager approval step, actioned by the employee's current reporting manager through a minimal "My Approvals" view in the portal.
- HR eligibility validation: the system evaluates three business rules and HR makes the approve/reject decision.
- Portal-side orchestration of Payroll, IT, and Facilities fulfilment. These run in parallel after HR approval, are tracked independently, and each has defined retry, failure and escalation behaviour.
- Applying the organisational change on the effective date, once all fulfilment is complete.
- Payroll, IT, and Facilities represented by internally defined, mocked/stubbed API adapters with realistic contracts, latency and failure modes, since no real target systems exist for this assessment.
- Self-seeded organisational master data and employee profile data in the project's own database. The project has **zero external third-party dependencies** by design.
- An audit trail of all significant actions, in-app notifications, SLA reminders and escalation, and defined behaviour for concurrency, data changes and inactive users.

**Out of scope (decided, not open):**
- Real integration with actual Payroll, IT, or Facilities systems. The mocked adapters replace this.
- Any approval step beyond one Manager gate and one HR gate: no secondary approvers, budget sign-off, or multi-level chains. Reassigning an approver (BRD-001.D29) is not an extra approval step.
- An HR override that approves a request failing an eligibility rule.
- A dedicated manager app or full manager dashboard.
- Email, SMS, and operating-system push notifications (APNs/FCM). These need an external provider, which conflicts with the zero-external-dependency decision.
- A public-holiday calendar. It is deferred as a future enhancement.
- Changing the effective date after submission by any party except HR (BRD-001.D17).
- Any other One-Point Employee Portal module.
- Delivery platform and technology stack. These are Technical decisions recorded in `constitution.md`.

---

## Governance

This BRD is the source that spec authoring draws from. A spec should never be the first place a requirement is written down. Every ambiguity found during Discovery and at Gate 0 on v1.0 has been turned into an explicit decision, so this BRD can support an `Approved` spec at Gate 1. Where business judgement stood in for an unavailable stakeholder, the decision says so with **(Assumption)**.

Actors: **Employee**, **Manager** (the employee's current direct reporting manager), **HR**, **Payroll**, **IT**, **Facilities**, and **System** (scheduled or automatic actions by the portal). **HR Lead** is a seeded designation on selected HR users that receives escalations. It is not a seventh role.

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
- **BRD-001.D03 (Valid combinations only)** `[G0-15]`. The master dataset defines which **(department, location, role)** combinations are valid. The employee can only pick valid combinations: choosing a department limits the locations offered, and choosing a location limits the roles offered. The backend rejects any combination not in the dataset, whatever the UI sent. Inactive master-data values are never offered for new requests. **(Assumption: a seeded combination table is enough for this assessment. Headcount or vacancy checks are out of scope.)**
- **BRD-001.D04 (No-change request not allowed)** `[G0-28]`. The proposed (department, location, role) must differ from the employee's current values in at least one field. A request identical to the current assignment is rejected at submission with the message "Proposed details are the same as your current assignment." A change to only one field (for example location only) is a valid transfer.
- **BRD-001.D05 (Effective date notice).** The effective date must be at least **14 calendar days** after the submission date (submission date = day 0). Weekends count. The effective date can be any calendar date. For example, if submitted on Thu 2026-10-01, the earliest effective date is Thu 2026-10-15. Picking 2026-10-14 is rejected. *(v1.0 rule, now with a worked example.)*
- **BRD-001.D06 (Optional reason).** The employee may enter an optional free-text reason (maximum 500 characters). The reason is visible to the employee, their manager, and HR. It is not visible to Payroll, IT, or Facilities.
- **BRD-001.D07 (Single active request, enforced by backend and database)** `[G0-17]`. An employee can hold only one non-terminal transfer request at a time. Non-terminal states are listed in BRD-001.D35. The rule is enforced atomically at the backend/database level, not only in the UI. If two submissions arrive at the same time (two browser tabs, or two API calls), exactly one succeeds and the other gets "You already have an active transfer request" and creates nothing. Resubmitting the same submission (same client idempotency key) returns the original request instead of creating a second one.
- **BRD-001.D08 (Snapshot at submission)** `[G0-14]`. At submission the request records a snapshot of the employee's current department, location, role, and reporting manager (the "from" details) alongside the proposed "to" details. The snapshot supports display and audit. Eligibility decisions use live data as described in BRD-001.D39.

#### 2. Withdrawal and cancellation

- **BRD-001.D09 (Withdrawal cutoff)** `[G0-02]`. The employee can **withdraw** their own request only while it is in `PendingManagerApproval` or `PendingHRValidation`. Withdrawal is terminal (`Withdrawn`), has an optional reason, and takes effect immediately. Once HR has approved (`PendingFulfilment` onward) the employee cannot withdraw, because downstream fulfilment may already be running. The Withdraw action is hidden in the UI and rejected by the API from then on, with the message "This request can no longer be withdrawn. Please contact HR." *(Changed from v1.0, which allowed withdrawal at any point before Completed.)*
- **BRD-001.D10 (HR cancellation after HR approval)** `[G0-02, G0-05]`. HR can **cancel** a request in `PendingFulfilment`, `FulfilmentFailed`, or `Scheduled`, but only before the effective date has been applied. For example, the employee asks HR to stop the transfer, or a fulfilment has permanently failed. A cancellation reason is mandatory. The result is terminal `Cancelled` (source = HR). Fulfilment items already completed get a reversal instruction under BRD-001.D26. No organisational data is changed, because it is only changed at `Completed` (BRD-001.D16).
- **BRD-001.D11 (System cancellation).** The system cancels a non-terminal request automatically (terminal `Cancelled`, source = System, reason recorded) when the employee becomes inactive (BRD-001.D41).

#### 3. Manager confirmation

- **BRD-001.D12 (Who the manager is)** `[G0-10]`. "Manager" means the employee's **current** direct reporting manager at the moment of action, not the proposed new manager and not necessarily the manager at submission. The Manager's standing comes from the reporting relationship in the seeded employee profile data. *(v1.0 rule, now defined at the moment of action.)*
- **BRD-001.D13 (Manager action).** The manager uses the "My Approvals" view to **Approve** (optional comment) or **Reject** (optional reason). Rejection is terminal (`RejectedByManager`). The employee may submit a new request afterwards. A rejected request is never reopened or edited. *(Unchanged from v1.0.)*
- **BRD-001.D14 (Manager changes while pending)** `[G0-10]`. If the employee's reporting manager changes while the request is in `PendingManagerApproval`:
  - the request moves automatically to the new manager's "My Approvals" queue,
  - the previous manager immediately loses visibility of it and the ability to act,
  - the manager SLA (BRD-001.D29) restarts (BRD-001.D30) from the reassignment time,
  - the new manager and the employee are notified.

  If the manager had already approved before the change, the approval stands and the request does not return to manager approval. **(Assumption.)**
- **BRD-001.D15 (Self-seeded employee profile data).** The profile data needed for this journey is seeded in the project's own database: reporting manager, date started in current role, disciplinary flag, last transfer completion date, employment status, and current department, location, and role. *(Unchanged from v1.0, with employment status and current assignment now named explicitly.)*

#### 4. Effective date and when the transfer takes effect

- **BRD-001.D16 (The transfer takes effect on the effective date, not on HR approval)** `[G0-01]`. **This is the main correction in v1.1.**
  - HR approval authorises the transfer and starts fulfilment. **It does not change the employee's organisational information.**
  - When all three fulfilment items are `Completed`, the request moves to `Scheduled` (awaiting effective date).
  - On the effective date, at 00:00 in the portal business timezone, the System applies the proposed department, location, role (and the new reporting manager where the seeded master data defines one) to the employee's organisational record. It updates the employee's last transfer completion date and moves the request to `Completed`.
  - If all fulfilment completes **on or after** the effective date, the System applies the change straight away, provided HR has not rescheduled (BRD-001.D17), and moves the request to `Completed`. **(Assumption: a same-day or late completion is applied the same day rather than held for a new date, unless HR steps in.)**

  *(Changed from v1.0, which said organisational information is updated immediately on HR approval.)*
- **BRD-001.D17 (Fulfilment not finished by the effective date)** `[G0-11]`. If any fulfilment item is not `Completed` at 00:00 on the effective date:
  - the transfer **does not** take effect, and organisational data is not changed,
  - the request stays in `PendingFulfilment` (or `FulfilmentFailed`) and is flagged **Effective date missed**,
  - the employee, the HR queue, and the relevant fulfilment queue(s) are notified.

  HR may then either:
  - **reschedule** by setting a revised effective date at least **3 business days** in the future. The revised date is recorded in the audit trail, shown to the employee, and sent to all three adapters as an amendment on the existing reference IDs. Completed items are not redone. Or,
  - leave the date as it is. Once the remaining items complete, the change is applied at once (BRD-001.D16).

  HR may also cancel (BRD-001.D10). The employee cannot change the effective date. For example: effective date Tue 2026-10-20; at 00:00 on 20 October, IT is still `InProgress`. The request stays `PendingFulfilment` with "Effective date missed". If IT completes on Wed 21 October with no HR reschedule, the change is applied on 21 October and the request becomes `Completed`.
- **BRD-001.D18 (Effective date passes before HR decision).** If the effective date arrives while the request is still in `PendingManagerApproval` or `PendingHRValidation`, the request stays in its current state, is flagged **Effective date missed**, and the employee and current approver are notified. If HR later approves, HR must set a revised effective date at least 3 business days in the future as part of the approval. Also, whenever HR approves with fewer than 3 business days (the fulfilment SLA) left before the effective date, the portal warns HR and offers to revise the date. **(Assumption.)**
- **BRD-001.D19 (System of record)** `[G0-22]`. The One-Point Employee Portal database is the **system of record** for employee organisational information (department, location, role, reporting manager) and for master data in this project. From `Completed` onward, the portal's record is authoritative. Payroll, IT, and Facilities adapters are informed of the change but are not sources of truth for it.

#### 5. HR eligibility validation

- **BRD-001.D20 (Eligibility rules).** Eligibility is defined by three checkable rules evaluated against the employee's profile data. *(Unchanged from v1.0.)*
  1. **R1 Tenure:** at least 6 months of continuous service in the current role.
  2. **R2 Disciplinary:** no active or open disciplinary case.
  3. **R3 Cooldown:** no internal transfer completed in the last 6 months.

  Six months means 6 calendar months, date to date. For example, someone who started a role on 2026-04-10 meets R1 on or after 2026-10-10.
- **BRD-001.D21 (HR action model: system evaluates, HR decides)** `[G0-03]`.
  - When a request enters `PendingHRValidation`, the System evaluates R1 to R3 automatically. The HR queue shows the result for each rule (Pass/Fail with the data it used).
  - **The system never approves or rejects on its own.** An HR user must act. HR is modelled as a shared queue, so any active HR user may act.
  - The System re-evaluates R1 to R3 and the master-data validity check (BRD-001.D40) at the moment HR submits a decision, using the latest data. If the result has changed since the queue view loaded, HR is shown the new result and must confirm again.
  - **Approve** is allowed only when all three rules pass and the proposed master data is still valid. There is no HR override. Approving moves the request to `PendingFulfilment` and starts fulfilment (Section 6).
  - **Reject** is always allowed and results in terminal `RejectedByHR`.
- **BRD-001.D22 (HR rejection reason)** `[G0-13]`.
  - When one or more rules fail, the failed rule(s) are pre-filled as the rejection reason and cannot be removed. HR may add an optional comment (maximum 500 characters).
  - When all rules pass but HR still rejects (for example, the proposed position is no longer valid, or another documented HR reason), HR must choose a reason category ("Proposed position invalid" or "Other HR reason") and enter a mandatory comment. **(Assumption: an HR rejection on grounds other than R1 to R3 is allowed, but must be justified.)**
  - The employee sees the failed rule(s) and the HR comment. The manager sees only that HR rejected the request, not the rule or comment, because disciplinary details are sensitive.
- **BRD-001.D23 (Segregation of duties).** The same user can never act as both Manager approver and HR approver on one request, and no user can act at any stage of their own request, even if they hold several roles. For example, an HR user who submits their own transfer cannot see it in the HR queue. The rule is enforced by the backend.

#### 6. Fulfilment orchestration (Payroll, IT, Facilities)

- **BRD-001.D24 (Parallel dispatch and unique reference IDs)** `[G0-07]`. On HR approval, the System creates three independent fulfilment items (Payroll, IT, Facilities) and dispatches each to its adapter at the same time. Each item gets a unique **fulfilment reference ID**, for example `<requestId>-PAYROLL`, that:
  - stays the same across every retry, manual retry, amendment, and reversal of that item,
  - is sent as the **idempotency key** on every adapter call.

  The adapter must perform the action **at most once** per reference ID. A repeated call with the same reference ID (because of a timeout, a retry, or a duplicate send) returns the result of the original action without doing it again. Duplicate completion callbacks or confirmations from an adapter are also recognised by reference ID and ignored after the first. A reference ID whose earlier attempt definitely failed without executing (a 4xx) may be retried under the same key. *(Parallelism unchanged from v1.0. Idempotency added.)*
- **BRD-001.D25 (Adapter outcomes and system behaviour)** `[G0-04, G0-21]`.

  | Adapter outcome | Meaning | Item status | System behaviour |
  |---|---|---|---|
  | Success, complete (2xx, valid body, status = completed) | Downstream action done | `Completed` | Record the completion time, notify the employee, check whether all items are complete |
  | Success, accepted (2xx, valid body, status = accepted) | Downstream accepted the work and will confirm later by callback | `InProgress` | Wait for the completion callback. The SLA clock keeps running |
  | Timeout (no response within the adapter timeout) | Outcome unknown | `Retrying` | Automatic retry with the same reference ID, up to **3 automatic retries** with increasing delay. Safe because of idempotency (BRD-001.D24) |
  | 5xx server error | Temporary downstream failure | `Retrying` | Same as timeout |
  | Invalid response (malformed or unexpected body, unknown status) | Outcome unknown | `Retrying` | Same as timeout. The invalid payload is recorded in the audit trail |
  | 4xx client/business error | Downstream refused the instruction (non-retryable) | `Failed` | No automatic retry. Notify the owning functional queue with the error detail |
  | Duplicate acknowledgement (adapter reports the reference ID was already processed) | Action was done earlier | Status of the original result (normally `Completed`) | Treated as success. Never executed twice |
  | Automatic retries exhausted | Could not reach a result | `Failed` | Notify the owning functional queue |

  The adapter timeout value, retry delays, and response contract are Technical decisions (`constitution.md` / `plan.md`). The number of automatic retries (3) is a business decision.
- **BRD-001.D26 (Handling a failed item)** `[G0-04, G0-05]`. An item in `Failed` stays with its owning functional queue (Payroll, IT, or Facilities), which can:
  - **Retry**: re-dispatch with the same reference ID. Manual retries have no limit, and every one is audited.
  - **Mark completed manually**: for work finished outside the adapter. An evidence note is mandatory.
  - **Mark Unable to Fulfil**: a permanent failure. A reason is mandatory.

  **Escalation:** if an item stays `Failed` for 1 business day with no action, HR and the HR Lead are notified.

  **Reversal on cancellation:** when a request is cancelled (BRD-001.D10 or D11), each item already `Completed` is sent a **reversal** instruction under its reference ID. The same retry and idempotency rules apply. The reversal is tracked as `ReversalPending`, then `Reversed` or `ReversalFailed`, in that functional queue. Items not yet completed are set to `Cancelled` and any outstanding downstream instruction is withdrawn.
- **BRD-001.D27 (Permanent failure and final status)** `[G0-05]`.
  - When any item is marked **Unable to Fulfil**, the overall request moves to **`FulfilmentFailed`**. This is a non-terminal state that waits for an HR decision. The other items carry on independently and are not rolled back automatically.
  - From `FulfilmentFailed`, HR can:
    - **Resume**: send the item back to its queue for another attempt (for example, after an offline fix). The request returns to `PendingFulfilment`.
    - **Cancel**: terminal `Cancelled`, with reversal of completed items under BRD-001.D26.
  - A request is **never** `Completed` unless all three items are `Completed`, and it is never shown as `Completed` or terminally failed while an item is still open.
- **BRD-001.D28 (Partial completion visibility)** `[G0-06]`. While fulfilment is under way, the overall status shows `PendingFulfilment` with a count such as "In progress: 2 of 3 complete". The status of each item is shown separately (`Pending`, `InProgress`, `Retrying`, `Completed`, `Failed`, `UnableToFulfil`), with the **Delayed** flag where it applies. For example, Payroll `Completed`, IT `Completed`, Facilities `Failed`:
  - the employee sees "In progress: 2 of 3 complete. Facilities: issue being resolved by the Facilities team",
  - the overall status is **not** `Completed` and **not** `FulfilmentFailed`,
  - if Facilities is later marked Unable to Fulfil, the overall status becomes `FulfilmentFailed` ("Awaiting HR decision").

#### 7. SLAs, reminders and escalation

- **BRD-001.D29 (Stage SLAs)** `[G0-09, G0-24]`. Business day = Monday to Friday, with no public-holiday calendar (see BRD-001.D31 for how days are counted).

  | Stage | SLA (starts when stage is entered) | At SLA breach | Escalation |
  |---|---|---|---|
  | Manager (`PendingManagerApproval`) | 5 business days *(unchanged)* | Flag **Delayed**. Reminder to the manager and the skip-level manager *(v1.0 sent it to the skip-level only)* | At 10 business days, escalate to the HR queue. HR may **reassign the approver** to the skip-level manager or another active manager in the same reporting line. HR does not approve on the manager's behalf. No auto-approval |
  | HR (`PendingHRValidation`) **(new)** | **3 business days** | Flag **Delayed**. Reminder to all active HR users | At 5 business days, escalate to the HR Lead designation, then send a daily reminder until actioned. No auto-approval |
  | Payroll / IT / Facilities (each item) | 3 business days from dispatch *(unchanged)* | Flag the item **Delayed**. Reminder to that functional queue | At 5 business days, escalate to the HR queue and HR Lead |

  **Delayed** is a visible flag on the stage or item, not a status. It never blocks or fails the request by itself. The employee sees the Delayed flag on the relevant stage. **(Assumption: the HR SLA of 3 business days and the 10- and 5-day escalation points are proposed values for PM confirmation.)**
- **BRD-001.D30 (SLA restart).** The manager SLA restarts on approver reassignment (BRD-001.D14, D29). A fulfilment item's SLA restarts on HR Resume (BRD-001.D27) and on HR reschedule (BRD-001.D17). Automatic retries do not restart the SLA.
- **BRD-001.D31 (Business-day calculation)** `[G0-27]`. Rules:
  - All clocks use one configured **portal business timezone**. **(Assumption: default Asia/Kolkata. Confirm.)**
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

#### 8. Status model and transitions

- **BRD-001.D32 (Overall request statuses)** `[G0-12]`. The v1.0 taxonomy is extended:

  | Status | Terminal? | Meaning |
  |---|---|---|
  | `Submitted` | No (momentary) | Accepted and being routed. Moves to `PendingManagerApproval` automatically |
  | `PendingManagerApproval` | No | Waiting for the current manager |
  | `PendingHRValidation` | No | Waiting for an HR decision |
  | `PendingFulfilment` | No | HR approved. Payroll, IT, and Facilities are in progress |
  | `FulfilmentFailed` **(new)** | No | At least one item is Unable to Fulfil. Waiting for an HR decision |
  | `Scheduled` **(new)** | No | All fulfilment complete. Waiting for the effective date |
  | `Completed` | Yes | Organisational change applied on the effective date |
  | `RejectedByManager` | Yes | Manager rejected |
  | `RejectedByHR` | Yes | HR rejected |
  | `Withdrawn` | Yes | Employee withdrew (before HR approval only) |
  | `Cancelled` **(new)** | Yes | Cancelled by HR or by the System, with reason and source recorded |

- **BRD-001.D33 (Allowed transitions: this list is exhaustive)** `[G0-12]`. The backend must reject any transition not listed here, whatever the client sends.

  | # | From | To | Triggered by | Condition |
  |---|---|---|---|---|
  | T1 | (none) | `Submitted` | Employee | All capture validations pass (D03 to D07) |
  | T2 | `Submitted` | `PendingManagerApproval` | System | Always. Routed to the current manager, or to the HR queue for approver assignment if there is no active manager (D42) |
  | T3 | `PendingManagerApproval` | `PendingHRValidation` | Manager | Approve |
  | T4 | `PendingManagerApproval` | `RejectedByManager` | Manager | Reject |
  | T5 | `PendingManagerApproval` | `Withdrawn` | Employee | Withdraw |
  | T6 | `PendingHRValidation` | `PendingFulfilment` | HR | Approve. R1 to R3 pass and master data is valid (D21, D40) |
  | T7 | `PendingHRValidation` | `RejectedByHR` | HR | Reject |
  | T8 | `PendingHRValidation` | `Withdrawn` | Employee | Withdraw |
  | T9 | `PendingFulfilment` | `Scheduled` | System | All three items `Completed` and effective date is in the future |
  | T10 | `PendingFulfilment` | `Completed` | System | All three items `Completed` and effective date is today or past, with no HR reschedule pending (D16, D17) |
  | T11 | `PendingFulfilment` | `FulfilmentFailed` | System | Any item marked Unable to Fulfil |
  | T12 | `FulfilmentFailed` | `PendingFulfilment` | HR | Resume |
  | T13 | `Scheduled` | `Completed` | System | Effective date reached (00:00 portal timezone) |
  | T14 | `PendingFulfilment` / `FulfilmentFailed` / `Scheduled` | `Cancelled` | HR | Cancel with mandatory reason, before the effective change is applied |
  | T15 | Any non-terminal | `Cancelled` | System | Employee becomes inactive (D41) |

  Rescheduling (D17) and approver reassignment (D14, D29) change data **within** a status and are not status transitions. Every other transition is invalid, including `Completed → PendingManagerApproval`, `Withdrawn → PendingFulfilment`, `RejectedByHR → PendingHRValidation`, and `PendingFulfilment → Withdrawn`. The API rejects it with a clear error ("Action not allowed in current status: <status>"), changes nothing, and records the attempt in the audit log.
- **BRD-001.D34 (Actions on terminal requests)** `[G0-12]`. No action of any kind (approve, reject, withdraw, cancel, retry, reschedule, fulfilment update) is accepted on a request in a terminal state. The only exception is tracking reversals of a `Cancelled` request's completed items (D26), which update item records, not the request status.
- **BRD-001.D35 (Non-terminal set).** For the single-active-request rule (D07), the non-terminal statuses are `Submitted`, `PendingManagerApproval`, `PendingHRValidation`, `PendingFulfilment`, `FulfilmentFailed`, and `Scheduled`.
- **BRD-001.D36 (Fulfilment item statuses).**
  - Main path: `Pending` → `InProgress` → `Completed`.
  - Retry and failure: `InProgress` ↔ `Retrying` → `Failed` → (`InProgress` via Retry | `Completed` via manual completion | `UnableToFulfil`). From `UnableToFulfil`, HR Resume returns the item to `InProgress`.
  - On cancellation: open items → `Cancelled`, and `Completed` items → `ReversalPending` → `Reversed` | `ReversalFailed`.
  - **Delayed** is a flag, not a status.
  - Each item's transitions are independent of the other two items.

#### 9. Access control

- **BRD-001.D37 (Role access matrix)** `[G0-08]`. The backend enforces this matrix on every API call. Hiding things in the UI is not enough. Every request outside a role's rights is refused and nothing is changed or leaked. The response does not reveal whether another user's request exists: "not found" and "forbidden" look the same to the caller. Each refusal is audited. Users may hold more than one role. Segregation of duties (D23) always applies on top.

  | Capability | Employee | Manager | HR | Payroll | IT | Facilities |
  |---|---|---|---|---|---|---|
  | **View** | Own requests only (all fields, all item statuses, own timeline) | Requests of **current direct reports** currently or previously assigned to them, excluding HR rule and comment detail (D22). The previous manager loses access on reassignment (D14) | All transfer requests (full detail, including eligibility results and audit trail) | Only their own item on requests in `PendingFulfilment` or later: employee name and ID, from/to department, location and role, effective date, reference ID. No reason, eligibility, or disciplinary data | Same, IT item only | Same, Facilities item only |
  | **Create** | Own request only | No (except their own request, as an Employee) | No (except their own) | No (except their own) | No (except their own) | No (except their own) |
  | **Approve / Reject** | Never (including their own) | Only at `PendingManagerApproval`, only for their current direct report, never their own request | Only at `PendingHRValidation`, never their own request, never one they approved as Manager | No | No | No |
  | **Withdraw** | Own request, only at `PendingManagerApproval` / `PendingHRValidation` | No | No | No | No | No |
  | **Cancel** | No | No | At `PendingFulfilment` / `FulfilmentFailed` / `Scheduled` (D10) | No | No | No |
  | **Update fulfilment item** (retry, manual complete, Unable to Fulfil) | No | No | Resume only (D27) | Payroll item only | IT item only | Facilities item only |
  | **Reschedule effective date** | No | No | Yes (D17, D18) | No | No | No |
  | **Reassign manager approver** | No | No | Yes (D29, D42) | No | No | No |
  | **View audit trail** | Simplified timeline of own request | No | Full | Own item's entries | Own item's entries | Own item's entries |

  Examples the backend must refuse: an Employee opening another employee's request by ID; an Employee approving their own request; a Manager approving someone who is not their current direct report; a non-HR user calling an HR action; a Payroll user updating an IT item.

#### 10. Data changes during a request

- **BRD-001.D38 (Manager change).** See BRD-001.D14.
- **BRD-001.D39 (Employee profile changes while pending)** `[G0-14]`.
  - **Eligibility data (tenure, disciplinary flag, last transfer):** always evaluated against **live** data at the moment HR decides (D21), not the snapshot. If a disciplinary case is opened **after** HR approval but before `Completed`, the request is flagged "Eligibility changed after approval" and HR is notified. It is not cancelled automatically. HR decides whether to cancel (D10).
  - **Current department, location, or role changes** (another organisational change while this request is pending): the request is flagged "Current assignment changed since submission" for HR. HR sees both the snapshot and the live values. If the proposed values now equal the live current values (D04), HR must reject (before HR approval) or cancel (after HR approval).
  - **Employment status becomes inactive:** see D41.
- **BRD-001.D40 (Master data changes after submission)** `[G0-16]`.
  - **Before HR approval:** if a proposed department, location, role, or combination becomes inactive or invalid, the request is flagged "Proposed position no longer valid". The manager may still act. HR cannot approve, and must reject with reason category "Proposed position invalid" (D22). The employee is notified and may submit a new request.
  - **After HR approval:** the approved position is treated as committed. Deactivating master data later does not affect the request, which continues to `Completed`. **(Assumption.)**

#### 11. Inactive users

- **BRD-001.D41 (Employee becomes inactive)** `[G0-23]`. When the employee's employment status becomes inactive (left or deactivated), the System immediately cancels any non-terminal request (T15, reason "Employee inactive"). Completed fulfilment items are reversed (D26). HR, the current approver, and affected functional queues are notified. No request is ever left pending for an inactive employee.
- **BRD-001.D42 (Manager or functional user becomes inactive)** `[G0-24]`.
  - **Manager inactive, or employee has no active manager:** the request goes to the HR queue for approver assignment. HR assigns the new or interim manager, or the skip-level manager, and the SLA restarts (D30). HR assigns only and does not approve.
  - **HR, Payroll, IT, Facilities users:** these are shared role-based queues with no single-person assignment, so one user becoming inactive does not strand an item. If a functional role has **no** active users, its items escalate to the HR Lead.
  - Inactive users cannot sign in or act. Their pending notifications go to the replacement recipient.

#### 12. Concurrency

- **BRD-001.D43 (Concurrent actions)** `[G0-20]`. Every state-changing action is checked against the request's **current** status and version at the moment it is applied. When two users (or two tabs or devices) act on the same request or item at almost the same time, **exactly one** valid transition is applied. Examples: two HR users approving and rejecting at once; a manager approving while the employee withdraws; two Payroll users retrying the same item. The other action gets "This request has already been updated (current status: <status>). Please refresh." and nothing changes. Side effects (adapter dispatch, notifications, audit entries) are produced once, for the winning action only. Resubmitting the same action with the same client idempotency key returns the original result.

#### 13. Audit trail

- **BRD-001.D44 (Audit trail)** `[G0-18]`. The system keeps an **append-only, tamper-evident** audit record of every significant event:
  - submission, approval, rejection, withdrawal, cancellation,
  - automatic status changes, approver reassignment, reschedule,
  - eligibility evaluation results,
  - adapter dispatch, each retry (automatic or manual), adapter response or failure, manual completion, Unable to Fulfil, resume, reversal,
  - SLA reminders and escalations,
  - notification generation,
  - refused unauthorised actions and invalid transitions.

  Each entry records: request ID; fulfilment item and reference ID (if any); event type; acting user ID and acting role (or `System`); timestamp (UTC, displayed in the portal timezone); previous status; new status; reason or comment; attempt number and adapter outcome (for fulfilment); correlation ID.

  Audit records can never be edited or deleted through the application and are kept for the life of the system. Visibility follows D37. Personal data in operational logs is masked under `constitution.md`. The audit trail is the business record, not a log file.

#### 14. Notifications

- **BRD-001.D45 (What "push notification" means)** `[G0-19]`. In this project a "push notification" is an **in-app notification only**:
  1. a persistent notification record in the user's in-app Notification Centre, with an unread badge, and
  2. a real-time in-app alert (banner or toast) when the user has the portal open.

  It does **not** include operating-system or mobile push (APNs/FCM), email, or SMS, which all need an external provider (out of scope). *(Clarifies v1.0's wording.)*
- **BRD-001.D46 (Notification events and recipients).**

  | Event | Recipients |
  |---|---|
  | Submitted | Employee (confirmation), Manager |
  | Manager approved / rejected | Employee. On approval, also the HR queue |
  | Approver reassigned | Employee, new Manager |
  | HR approved / rejected | Employee, Manager. On approval, also the Payroll, IT, and Facilities queues |
  | Fulfilment item completed | Employee |
  | Fulfilment item failed / Unable to Fulfil | Owning functional queue, Employee (non-technical wording), HR on escalation |
  | All fulfilment complete (`Scheduled`) | Employee, Manager, HR |
  | Effective date missed / rescheduled | Employee, HR, affected functional queues |
  | Completed | Employee, previous Manager, new Manager (where defined), HR |
  | Withdrawn / Cancelled | Employee, current approver or affected queues, HR |
  | SLA reminder / escalation | As defined in D29 |

- **BRD-001.D47 (Notification delivery failure).** A notification is saved before any real-time alert is attempted. If the real-time alert cannot be delivered (the user is offline, or the connection fails), the user sees the notification the next time they open the portal. If saving the notification fails, it is retried automatically and the failure is audited. **A notification failure never blocks, fails, or rolls back a workflow action.** The request status view is always the authoritative source of truth, whatever the notification outcome.

#### 15. Status and visibility

- **BRD-001.D48 (Employee view)**. At any time the employee can see:
  - the overall status (D32),
  - each fulfilment item's status and Delayed flag (D28),
  - who each pending action is with (role or queue, and the manager's name for the manager stage),
  - the SLA due date for the current stage,
  - the effective date (and any revision),
  - rejection or cancellation reasons within D22 limits,
  - a timeline of key events.

  *(Extends v1.0.)*

#### 16. Downstream systems

- **BRD-001.D49 (Mocked adapters).** Payroll, IT, and Facilities have no real, named target systems for this assessment. They are represented as internally defined mock adapters with realistic contracts, simulated latency, and configurable simulated outcomes. The simulated outcomes must include every case in D25: success complete, success accepted plus callback, timeout, 4xx, 5xx, invalid response, and duplicate acknowledgement, so each can be demonstrated and tested on purpose. Adapters must honour the idempotency and reversal requirements (D24, D26). Adapter contracts are a Technical decision (`constitution.md` / `plan.md`). *(Extends v1.0.)*

#### 17. Access (authentication)

- **BRD-001.D50 (Authenticated, role-differentiated access).** Only authenticated portal users can use this journey. The six roles and their rights are defined in D37. The authentication mechanism and how roles are enforced (JWT, RBAC) are Technical decisions in `constitution.md`. *(Unchanged in intent from v1.0. Detail moved to D37.)*

#### 18. Performance expectations

- **BRD-001.D51 (Performance)** `[G0-25]`. Measured in the test environment with the seeded dataset (D52), under a load of **100 concurrent users** and **1,000 transfer requests** in the database. **(Assumption: load profile to be confirmed.)**

  | Operation | Target (p95) |
  |---|---|
  | Submit request (API response) | ≤ 500 ms (constitution Tier 2) |
  | Approve / reject / withdraw / cancel / fulfilment update (API response) | ≤ 500 ms |
  | Load a queue (My Approvals, HR, Payroll, IT, Facilities), first page of 25 | ≤ 500 ms (API) and ≤ 2 s (screen fully rendered) |
  | Load request status / detail view | ≤ 300 ms (API) and ≤ 1.5 s (screen) |
  | Status change visible in the other party's view | ≤ 5 s with the portal open, or on next refresh |
  | Adapter dispatch after HR approval | Started ≤ 60 s after approval |
  | Effective-date application run | All requests due that day applied ≤ 15 min after 00:00 |
  | SLA reminder/escalation run | Reminders issued ≤ 15 min after the breach time |

#### 19. Test data

- **BRD-001.D52 (Minimum seeded test data)** `[G0-26]`. The seed dataset for development and UAT must include at least:
  - **Master data:** at least 4 departments, 3 locations, and 6 roles, with at least 1 inactive value of each type and at least 1 invalid combination (to test D03 and D40).
  - **Functional users:** at least 2 active HR users (at least 1 with the HR Lead designation), 2 Payroll, 2 IT, and 2 Facilities users, plus 1 inactive user of any functional role.
  - **Managers:** at least 3 managers, including a manager and their skip-level manager, 1 inactive manager, and 1 user who is both a Manager and HR (for segregation tests, D23).
  - **Employees:**

    | ID | Profile | Used for |
    |---|---|---|
    | TE-01 | Eligible: over 6 months in role, no disciplinary case, no recent transfer, Manager A | Happy path |
    | TE-02 | Eligible, different manager (Manager B) | Manager scoping |
    | TE-03 | Under 6 months in current role | R1 fail |
    | TE-04 | Active disciplinary case | R2 fail |
    | TE-05 | Transfer completed under 6 months ago | R3 fail |
    | TE-06 | Fails more than one rule (R1 and R2) | Multiple rule citation |
    | TE-07 | Already has an active request | Single-active rule |
    | TE-08 | Reports to an inactive manager / no manager | D42 routing |
    | TE-09 | Eligible; will be made inactive during a test | D41 |
    | TE-10 | Eligible; manager reassigned during a test | D14 |
    | TE-11 | Tenure exactly on the 6-month boundary | R1 boundary |
    | TE-12 | Employee who also holds the HR role | D23 self-action refusal |

  - **Adapter scenarios:** each adapter can be set per test to each D25 outcome.

---

### Mandatory Acceptance Scenarios

Specs and test cases must include at least these scenarios, each tracing to the clauses shown. `[Gate 0 mandatory list]`

**Positive**

| ID | Scenario | Expected result | Clauses |
|---|---|---|---|
| AS-P01 | Eligible employee (TE-01) submits a valid request | Request created, status `PendingManagerApproval`, Manager A and employee notified, audited | D01–D08, T1–T2 |
| AS-P02 | Manager approves | `PendingHRValidation`, HR queue shows R1 to R3 results | D13, D21, T3 |
| AS-P03 | HR approves (all rules pass) | `PendingFulfilment`, three items dispatched with unique reference IDs, **organisational data unchanged** | D16, D21, D24, T6 |
| AS-P04 | Payroll, IT, and Facilities complete independently and in any order | Each item `Completed` separately. Overall stays `PendingFulfilment` until the last one | D24, D28, D36 |
| AS-P05 | Employee views individual status of all three items | Each item's status and Delayed flag visible, with a "2 of 3" style summary | D28, D48 |
| AS-P06 | All three complete before the effective date, then the effective date arrives | `Scheduled`, then `Completed` at 00:00 on the effective date. Organisational data updated then, not earlier | D16, T9, T13 |
| AS-P07 | Manager rejects | `RejectedByManager` (terminal), employee notified, new request allowed | D13, T4 |
| AS-P08 | HR rejects on failed rule (TE-03/04/05/06) | `RejectedByHR`, failed rule(s) cited to the employee, manager sees no rule detail | D21, D22, T7 |
| AS-P09 | Employee withdraws at `PendingManagerApproval` and at `PendingHRValidation` | `Withdrawn` (terminal), approver loses the item | D09, T5, T8 |
| AS-P10 | Manager, HR, and fulfilment SLAs are exceeded | Delayed flag, reminders, and escalation at the defined points. No auto-approval | D29–D31 |

**Negative**

| ID | Scenario | Expected result | Clauses |
|---|---|---|---|
| AS-N01 | Effective date less than 14 calendar days away | Submission rejected with a validation message. Nothing created | D05 |
| AS-N02 | Employee (TE-07) already has an active request | Rejected: "You already have an active transfer request" | D07 |
| AS-N03 | Duplicate submission (double click, two tabs, or concurrent API calls) | Exactly one request created. Same idempotency key returns the original | D07, D43 |
| AS-N04 | Employee opens another employee's request by ID | Refused (indistinguishable from not-found), audited | D37 |
| AS-N05 | Employee tries to approve their own request (including TE-12 with the HR role) | Refused, audited | D23, D37 |
| AS-N06 | Manager approves someone outside their reporting line, or after being replaced | Refused | D12, D14, D37 |
| AS-N07 | Non-HR user calls an HR action (approve, reject, cancel, reschedule, resume) | Refused | D37 |
| AS-N08 | Payroll user updates the IT item | Refused | D37 |
| AS-N09 | Fulfilment adapter times out | `Retrying` with the same reference ID, up to 3 automatic retries, then `Failed` and the queue is notified | D24, D25 |
| AS-N10 | Adapter returns 4xx or 5xx | 4xx: `Failed` with no automatic retry. 5xx: automatic retry as for a timeout | D25 |
| AS-N11 | Adapter returns an invalid response | Treated as unknown outcome and retried. Payload audited | D25 |
| AS-N12 | Same fulfilment request received twice (retry or duplicate) | Action performed once. Second call returns the original result. Duplicate callback ignored | D24 |
| AS-N13 | One item succeeds while another fails (e.g., Payroll completed, Facilities Unable to Fulfil) | Overall `PendingFulfilment` while the failure is open, then `FulfilmentFailed` after Unable to Fulfil. Never `Completed` | D26–D28 |
| AS-N14 | Invalid status transition attempted (e.g., `Completed → PendingManagerApproval`, `Withdrawn → PendingFulfilment`) | Refused with an error, nothing changed, audited | D33 |
| AS-N15 | Any action on a withdrawn, completed, rejected, or cancelled request | Refused | D34 |
| AS-N16 | Employee tries to withdraw after HR approval | Refused: "Please contact HR" | D09 |
| AS-N17 | Proposed details identical to current assignment | Submission rejected | D04 |
| AS-N18 | Invalid department/location/role combination sent directly to the API | Rejected | D03 |
| AS-N19 | Two users act on the same request at the same moment | Exactly one transition applied. The other is told to refresh | D43 |
| AS-N20 | Fulfilment still incomplete on the effective date | Transfer not applied. "Effective date missed" shown. HR can reschedule or cancel | D17 |
| AS-N21 | Employee becomes inactive mid-request (TE-09) | `Cancelled` (System), completed items reversed | D41, D26 |
| AS-N22 | Master-data value deactivated before HR decision | HR cannot approve and must reject as "Proposed position invalid" | D40 |

---

**Open at BRD stage:** None blocking. Every Gate 0 feedback item (G1-01 to G0-28) has been turned into a decision (Appendix A). The following **(Assumption)** clauses need explicit confirmation or change by the Gate 0 reviewer at re-review:
- D03: combination table only, no headcount checks
- D14: approval stands after a manager change
- D16: late completion is applied on the day it completes
- D18: revised date required when the effective date passes before HR approval
- D22: HR may reject for non-rule reasons, with justification
- D29: HR SLA of 3 business days and the 10- and 5-business-day escalation points
- D31: business timezone Asia/Kolkata
- D40: committed position after HR approval
- D51: load profile

**Notes:** This is still the only Business Requirement in scope. Under SDD's "one feature, one spec" rule, one spec traces back to BRD-001, now at clause level (`BRD-001.Dxx`). Decisions are Business decisions unless marked otherwise. The delivery platform, adapter contracts, timeout values, retry delays, and enforcement mechanisms (locking, constraints, idempotency storage) are Technical decisions for `constitution.md` and the feature's `plan.md`. Spec and test case generation will commence following Gate 0 approval.

---

## Appendix A: Gate 0 feedback Traceability (v1.0 → v1.1)

| # | Priority | Feedback (summary) | Resolved in |
|---|---|---|---|
| G0-01 | Critical | When does the transfer become effective: HR approval or effective date? | D16 (effective date, after all fulfilment), D19 |
| G0-02 | Critical | Withdrawal cutoff | D09 (until HR approval), D10 (HR cancel afterwards) |
| G0-03 | Critical | HR workflow: automatic or manual? | D21 (system evaluates, HR decides, no override) |
| G0-04 | Critical | Behaviour when Payroll/IT/Facilities fails | D25, D26 |
| G0-05 | Critical | Final status on permanent failure | D27 (`FulfilmentFailed`, then HR resume or cancel), D10, D26 reversal |
| G0-06 | Critical | Partial completion behaviour and visibility | D28 |
| G0-07 | Critical | Duplicate-processing protection and idempotency | D24 |
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
| Scenarios | Mandatory | Positive and negative acceptance scenarios | Mandatory Acceptance Scenarios section (AS-P01 to AS-P10, AS-N01 to AS-N22) |
| Flag | Key point | Effective date vs HR approval | D16 (the headline change in v1.1) |
