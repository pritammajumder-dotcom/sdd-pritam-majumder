> **ARCHIVED — SUPERSEDED**
>
> | Field | Value |
> |---|---|
> | Document | Business Requirements Document — Employee Internal Transfer Digital Journey |
> | Version | **v1.0** |
> | Status | Superseded by **v1.1** (`.ai-context/BRD.md`) on 2026-09-28 |
> | Reason | Gate 1 review by Shamik Bhattacharya (Project Manager, Gate 1 Reviewer) on 2026-09-28: **Changes Requested**, 28 feedback items plus mandatory acceptance scenarios. See `.ai-context/decisions/gate-1-feedback-brd-v1.0.md` |
> | Change record | `.ai-context/decisions/brd-change-log.md` → Version 1.1 |
>
> This file is kept read-only for traceability. Do not use it as a requirement source for specs, plans, tasks or tests.

---

# Business Requirements Document (BRD)

## Objective

Enable an employee to initiate, track, and complete an Internal Transfer Request entirely through the One-Point Employee Portal, replacing the current manual, multi-team coordination process (Employee → Manager → HR → Payroll → IT → Facilities) with a single digital journey that the portal orchestrates end-to-end and reports back to the employee as one unified view of progress.

## Scope

**In scope:**
- Employee-initiated Internal Transfer Request capture: proposed department/business unit, proposed location, proposed role/job position, effective date, optional reason — all validated against organisational master data, not free text.
- Request submission, with a minimum 14-calendar-day notice period between submission and effective date.
- One active (non-terminal) transfer request per employee at a time.
- Employee-initiated Withdraw of their own request at any point before it reaches a terminal state.
- Employee-facing view of current request status and of actions pending with other stakeholders, at all times.
- Manager approval step, actioned by the employee's current reporting manager via a minimal "My Approvals" view inside the same One-Point Employee Portal.
- HR eligibility validation against three defined business rules (tenure, disciplinary status, transfer cooldown — see BRD-001).
- Portal-side orchestration of Payroll, IT, and Facilities fulfilment, run in parallel once HR approves, each independently tracked and visible to the employee.
- Downstream Payroll/IT/Facilities participation represented via internally defined, mocked/stubbed API adapters with realistic contracts (request/response shape, latency, simulated failure modes), since no real target systems exist for this assessment.
- Organisational master data (departments, locations, roles) is self-seeded within the project's own database, not sourced from any real external system — this project has **zero external third-party dependencies** by design.

**Out of scope (decided, not open):**
- Real third-party integration with actual Payroll, IT, or Facilities systems — superseded by the mocked-adapter decision above.
- Any approval step beyond a single Manager gate and a single HR gate — no secondary approvers, no budget sign-off, no multi-level approval chains.
- A dedicated manager-facing app or full manager dashboard — managers act only through the minimal in-app approvals view described above.
- Email or SMS notifications — this journey uses in-app notification and status display only, since no notification provider is defined for this assessment.
- Any other One-Point Employee Portal module (payroll self-service, learning, general IT tickets, etc.) beyond what supports this journey.
- Delivery platform/technology stack — a Technical decision, recorded in `constitution.md`, not in this BRD.

---

## Governance

This BRD is the source spec authoring pulls from — a spec should never be the first place a requirement is written down. Every ambiguity identified during Discovery has been resolved into an explicit decision below rather than left open, so this BRD is ready to support an `Approved` spec at Gate 1 without a dependency on a future business decision. Where reasonable business judgement was required in the absence of a real stakeholder to consult, that judgement is disclosed in `Notes`, not hidden inside the decision itself.

---

### BRD-001: Employee Internal Transfer Digital Journey

**Raised by:** Business Requirement — single digital journey for internal transfers, replacing manual cross-team coordination
**Business need:** Currently, an employee requesting an internal transfer must interact manually with multiple teams and systems in sequence — discuss with manager, manager confirms, HR validates eligibility, organisational information is updated, Payroll may need updating, IT may need to provision or remove access, Facilities may need to arrange the new location, and only then does the employee receive confirmation. This is slow, fragmented across systems, and gives the employee no visibility into progress until the very end. The organisation wants a single digital journey through the One-Point Employee Portal that lets the employee initiate the request themselves and gives them one place to track it, while the portal orchestrates the downstream activities on their behalf.
**Sponsor:** HR Business Owner, One-Point Employee Portal
**Priority:** High — sole business requirement driving this workstream

**Decided (Business):**

*Request capture*
- The employee selects proposed department/business unit, proposed location, and proposed role/job position from organisational master-data lists (org-chart-backed), not free text — this keeps values usable by downstream orchestration and prevents typos from breaking fulfilment.
- This organisational master data (department, location, and role lists) is **self-seeded within the project's own database** — a fixed, developer-defined reference dataset — not fetched from any real external HR system, directory service, or third-party source. No external data source is available for this evaluation, so treating this as an internal, self-contained dependency (same treatment as the Payroll/IT/Facilities adapters below) avoids introducing an undefined external dependency the assessment cannot actually reach.
- The employee provides an effective date at least 14 calendar days after the submission date, giving Manager, HR, Payroll, IT, and Facilities realistic lead time.
- The employee provides an optional reason (free text) and submits the request.
- An employee may hold only one active (non-terminal) transfer request at a time; a new request cannot be submitted until the current one reaches a terminal state (Completed, Rejected, or Withdrawn).
- The employee may withdraw their own request at any point before it reaches Completed. *(This capability is not explicitly named in the original business requirement; it is added here as a necessary completeness decision — a request-tracking journey with no way to cancel a request would be an unreasonable gap. Flagged transparently, not silently assumed.)*

*Manager confirmation*
- "Manager" means the employee's current, direct reporting manager — not the proposed new manager, who has no standing over a transfer that has not yet happened.
- The employee's own profile data needed to evaluate this journey (current reporting manager assignment, tenure/join date in current role, disciplinary flag, and last-transfer-completion date) is **self-seeded within the project's own database**, the same treatment as organisational master data above — not sourced from any external HR record system, since none is available for this evaluation.
- The manager actions the request (Approve/Reject) via a minimal "My Approvals" view inside the same One-Point Employee Portal — no separate manager application or dashboard.
- The manager has 5 business days to act (business day = Monday–Friday; no public holiday calendar is applied in this scope — holiday-awareness is deferred as a future enhancement, since inventing a specific country/region calendar has no basis in the requirement). If unresolved after 5 business days, an automatic reminder notification is sent to the manager's own manager (skip-level) — the request itself remains in `PendingManagerApproval` (no auto-approval; approval requires a human decision).
- A manager Rejection is terminal (`RejectedByManager`), with an optional reason recorded. The employee may submit a new request afterward; a rejected request is not reopened or edited.

*HR eligibility validation*
- HR eligibility validation occurs only after manager approval, and must pass before organisational data is updated. Eligibility is defined by three checkable rules, evaluated against the employee's self-seeded profile data (above):
  1. The employee has completed at least 6 months of continuous service in their current role (no transfer during initial probation).
  2. The employee has no active/open disciplinary case at the time of request.
  3. The employee has not completed another internal transfer within the last 6 months (cooldown period).
- Failing any rule results in a terminal `RejectedByHR` status, with the specific rule cited as the reason.
- HR, Payroll, IT, and Facilities are each modelled as a **role-based shared queue**, not a named individual the way the manager is. Any authenticated user holding that functional role in the system can view and act on items in that stage's queue — this mirrors how these functions actually operate as departments in a real organisation, and avoids inventing a fictional org chart of specific named HR/Payroll/IT/Facilities staff.

*Orchestration and fulfilment*
- On HR approval, the employee's organisational information is updated automatically, and the request enters `PendingFulfilment`.
- Payroll, IT, and Facilities fulfilment run in parallel, not sequentially — they act on independent systems and independent data, and serialising them would add delay with no business justification.
- Each of the three fulfilment stakeholders has 3 business days to complete their action from the start of `PendingFulfilment` (same Monday–Friday, no-holiday-calendar definition as above). Exceeding this SLA marks that stakeholder's item `Delayed` in the employee's pending-actions view and triggers an automatic reminder notification to that stakeholder's queue — it does not block or fail the request.
- The request reaches `Completed` once all three fulfilment stakeholders confirm completion.

*Status and visibility*
- The employee can view the current status of the request and which actions are pending with which stakeholders, at any time, via the following fixed status taxonomy:
  `Submitted → PendingManagerApproval → (RejectedByManager | PendingHRValidation) → (RejectedByHR | PendingFulfilment) → Completed`, with `Withdrawn` reachable from any non-terminal state by employee action. `PendingFulfilment` additionally tracks a `Payroll` / `IT` / `Facilities` sub-status each (`Pending` / `Completed` / `Delayed`).
- Notifications are delivered in-app only (push notification plus a persistent in-app status indicator) — no email or SMS integration in this scope, since no notification provider is defined for this assessment and introducing one would be a larger unstated assumption than omitting it.

*Downstream systems*
- Payroll, IT, and Facilities have no real, named target systems for this assessment. They are represented as internally defined, mocked/stubbed API adapters with realistic contracts (request/response shape, simulated latency, simulated failure modes), rather than real third-party integrations or UI-only stages with no service boundary. This satisfies the business need — a single, portal-orchestrated view of progress — without depending on integration access that does not exist. The adapter contracts themselves are a Technical decision, to be formalised in `constitution.md` and the feature's `plan.md`, not restated here.

*Access*
- This journey is available only to authenticated users of the One-Point Employee Portal. Six distinct roles participate: Employee, Manager, HR, Payroll, IT, and Facilities — each sees and can act only on the parts of the journey relevant to their role (an employee cannot approve their own request; HR cannot see other employees' unrelated requests, etc.). The specific authentication mechanism and role-enforcement approach (JWT, RBAC) is a Technical decision, recorded in `constitution.md`, not restated here — this is the business-level statement that access is restricted and role-differentiated at all.

**Open at BRD stage:** None — all Discovery-stage ambiguities have been resolved into the decisions above, including the source of employee profile data, the actor model for HR/Payroll/IT/Facilities, the definition of "business day" used in every SLA, and the business-level statement that access is authenticated and role-restricted. Where a real business stakeholder was not available to make the call (this is an assessment, not a live engagement), a reasoned, disclosed assumption stands in its place; see the italicised note on the Withdraw capability above for the one addition beyond the original requirement's literal wording.

**Notes:** This is the only Business Requirement in scope for this project; there is one feature and, per SDD's "one feature, one spec" rule, one spec traces back to this single BRD entry. All decisions above are Business decisions except where explicitly marked otherwise; the delivery platform/technology stack and the downstream-adapter contract details are Technical decisions, recorded separately in `constitution.md`, and do not change what the business is asking for.
