# Prompt History

## Setup
Project setup initiated with Mobile/Backend architecture.

## Milestones

### [2026-09-28 16:44]
**User Request:** Shamik Bhattacharya (Gate 0 Reviewer) logged 28 Gate 0 feedback items and mandatory acceptance scenarios on the BRD, and asked for an updated BRD with the previous version archived and properly versioned (no code changes).
**Agent Action:** Archived the previous BRD unchanged as v1.0 at `.ai-context/archive/brd/BRD-v1.0.md` with a superseded header. Rewrote `.ai-context/BRD.md` as v1.1 (Pending Gate 0) with clause IDs BRD-001.D01 to D52, a status and transition model, an access matrix, fulfilment failure and idempotency rules, SLAs with business-day examples, acceptance scenarios AS-P01 to P10 and AS-N01 to N22, and a feedback traceability appendix. Recorded the feedback in `.ai-context/pr_reviews/BRD-20260928.md`. Created `.ai-context/decisions/brd-change-log.md` with the v1.1 impact analysis and updated the summary `.ai-context/brd-change-log.md`. No code or spec files were changed.

### [2026-09-29 19:29]
**User Request:** Shamik Bhattacharya (Gate 0 Reviewer) gave Gate 0 re-review feedback on BRD v1.1 (25 items plus terminology and extra acceptance scenarios) and asked for the BRD only to be revised and released, keeping the old version for reference.
**Agent Action:** Asked the reviewer to decide four open points: all v1.1 assumptions confirmed; cancellation terminal only after unwind; new submission allowed but HR approval blocked during an earlier unwind; new manager from master data with HR filling gaps. Archived v1.1 unchanged at `.ai-context/archive/brd/BRD-v1.1.md`. Rewrote `.ai-context/BRD.md` as v1.2 (Pending Gate 0): kept D01 to D52, added D53 to D71, `CancellationPending`, T16 to T18, AS-P23 to P33, AS-N23 to N38, Decision Register (no open assumptions), Appendix B. Recorded the feedback in `.ai-context/pr_reviews/BRD-20260929.md`. Updated both change logs and the v1.0 archive and feedback pointers. Spec and code unchanged.

### [2026-10-01 19:09]
**User Request:** Shamik Bhattacharya (Gate 0 Reviewer) approved BRD v1.2 as functionally development-ready, with no remaining business-requirement blocker, subject to the D71 technical entry conditions in the feature plan.md.
**Agent Action:** Recorded Gate 0 approval in `.ai-context/pr_reviews/BRD-20261001-190918.md` with the D71 conditions of approval. Set BRD v1.2 status to Approved and updated both change logs, `assumptions.md`, `dashboard.html` and `status.md`. No spec, plan or code files were changed.

### [2026-10-05 14:46]
**User Request:** Proceed with generating the Feature Specification based on the approved BRD v1.2.
**Agent Action:** Generated the Feature Specification (.ai-context/specs/internal-transfer-journey.spec.md) based directly on BRD v1.2 constraints. Set status to "In Peer Review". Updated the project dashboard and status board to reflect that the project is now officially Waiting at Gate 1 for PM Spec Approval.

### [2026-10-09 16:43]
**User Request:** Shamik Bhattacharya (Gate 1 Reviewer) ran `/int-pr-gate-workflow`, did not approve the internal-transfer-journey spec, gave feedback items 4 to 6 (API01 idempotency, queue and master-data APIs, active set vs `CancellationPending`) with a request for positive and negative tests, and asked for the spec to be updated with a version history. Items 1 to 3 to follow.
**Agent Action:** Verified the reviewer's git email against the `project_context.md` roster. Recorded Gate 1 Changes Requested in `.ai-context/pr_reviews/internal-transfer-journey-G1-20261009-164323.md` (G1-04 to G1-06; G1-01 to G1-03 pending). Archived spec v1.0 unchanged at `.ai-context/archive/specs/internal-transfer-journey.spec-v1.0.md`. Revised the spec to v1.1: version history, Gate 1 history row, API01 idempotency contract, API02 scoping and paging, new API18 to API24, active-set partial index and employee-lock protocol for D68, AC-P22 to P29, AC-N39 to N54, UT rows, IT-01 to IT-08. Updated `dashboard.html` and `status.md`. No code changed.

### [2026-10-09 17:00]
**User Request:** The reviewer re-sent Gate 1 feedback items 4 to 6 and asked for the spec to be updated accordingly.
**Agent Action:** Confirmed spec v1.1 already covers G1-04 to G1-06. Closed the remaining G1-06 point by creating `.ai-context/plans/internal-transfer-journey.plan.md` (draft) with the exact active set, partial unique index DDL, employee-lock protocol, error mapping and `SubmissionIdempotency` DDL. D71 items 2 to 7 are marked pending. Linked the plan from the spec and the review record. Items G1-01 to G1-03 are still not received.

### [2026-10-09 17:10]
**User Request:** The reviewer confirmed that "Gate 1 not approved" applies to v1.0, and that the spec can be approved once the given feedback is addressed.
**Agent Action:** Recorded G1-04 to G1-06 as the complete feedback (no items 1 to 3). Resubmitted spec v1.1 for Gate 1 re-review: set the spec status to In Peer Review (Gate 1 re-review) and updated the review record, `dashboard.html` and `status.md`. No approval recorded yet.

### [2026-10-13 17:22]
**User Request:** Shamik Bhattacharya (Gate 1 Reviewer) ran `/int-pr-gate-workflow` and chose the bulk action "Approve All Pending Items".
**Agent Action:** Verified the reviewer's git email against the `project_context.md` roster. The only pending item was the Gate 1 re-review of internal-transfer-journey spec v1.1. Recorded Gate 1 Approved in `.ai-context/pr_reviews/internal-transfer-journey-G1-20261013-172245.md` (G1-04 to G1-06 resolved; D71 item 1 approved; D71 items 2 to 7 not yet defined, so those areas stay blocked). Updated the spec status, version history and gate table; `plans/internal-transfer-journey.plan.md`; `dashboard.html`; and `status.md`. No code changed.
