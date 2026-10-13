# Gate 1 PR Review: internal-transfer-journey — Employee Internal Transfer Digital Journey

## Review Metadata
- **Project Name:** Employee Internal Transfer Digital Journey
- **Spec ID:** internal-transfer-journey
- **Spec Name:** Employee Internal Transfer Digital Journey
- **Spec Version Reviewed:** v1.0 (2026-10-05), archived at `.ai-context/archive/specs/internal-transfer-journey.spec-v1.0.md`
- **Developer:** Pritam Majumder (pritam.majumder@intglobal.com)
- **Assigned Reviewer:** Shamik Bhattacharya, Project Manager / Gate 1 Reviewer
- **Reviewer Name:** Shamik Bhattacharya
- **Reviewer Email/User ID:** shamik.bhattacharya@intglobal.com (git identity checked against `project_context.md` roster)
- **Review Status:** Changes Requested (reviewer: "As Gate 1 approver I don't approve this")
- **Review Date/Time:** 2026-10-09 16:43:23
- **Resulting revision:** Spec v1.1 (`.ai-context/specs/internal-transfer-journey.spec.md`), resubmitted for Gate 1 re-review on 2026-10-09

## Review Criteria Evaluation
1. **Requirement Completeness:** Needs Improvement (G1-05: queue and master-data retrieval missing from an API contract labelled exhaustive)
2. **Requirement Understanding:** Needs Improvement (G1-06: active set vs `CancellationPending`, BRD D68)
3. **Functional Scope:** Needs Improvement (G1-05)
4. **Technical Approach/Design:** Needs Improvement (G1-04, G1-06: idempotency persistence and the database constraint strategy)
5. **Business Rules:** Needs Improvement (G1-06: D07, D35, D68)
6. **Validations:** Needs Improvement (G1-04: idempotency key and conflicting payload)
7. **Dependencies:** Not called out by the reviewer
8. **Assumptions:** Not called out by the reviewer
9. **Edge Cases:** Needs Improvement (concurrent and conflicting-payload submissions; concurrent submission while `CancellationPending`)
10. **Acceptance Criteria:** Needs Improvement (reviewer: "Add positive and negative acceptance tests for these cases")
11. **Development Readiness:** Not Ready

## Review Summary & Feedback
- **Review Description:** Gate 1 not approved for v1.0. The reviewer's feedback is numbered 4 to 6 and is the complete Gate 1 feedback; there are no items 1 to 3 (reviewer confirmed 2026-10-09). The reviewer stated that the spec can be approved once this feedback is addressed.
- **Review Comments:** Logged as given by the reviewer, with the spec v1.1 resolution.

| ID | Finding (reviewer) | Developer-friendly feedback (reviewer) | Resolution in spec v1.1 |
|---|---|---|---|
| G1-04 | **Request submission idempotency is incomplete in the API definition.** AC-N03 requires duplicate submissions, including concurrent requests, to create exactly one transfer and return the original request for a repeated idempotency key. API01 does not explicitly define an idempotency header/key, its persistence, or how a repeated key with a different payload is handled. | Define the idempotency contract for API01: where the key is supplied, its scope and retention, how concurrent submissions are handled, and what happens when the same key is reused with a different payload. Ensure the database and API guarantee one request is created and retries return the original result. Add tests for duplicate, concurrent, and conflicting-payload submissions. | API01: required `Idempotency-Key` header (UUID v4); scope `(employeeId, CreateTransfer)`; `SubmissionIdempotency` table with SHA-256 payload hash; single transaction; concurrent duplicate waits and replays; `422 IDEMPOTENCY_KEY_REUSED` on payload mismatch; only successes stored; 24 h retention. AC-P22, AC-P23, AC-N39 to AC-N44; IT-01 to IT-03 |
| G1-05 | **Queue and master-data retrieval APIs are not defined clearly enough.** The contract is labelled exhaustive but does not define how the portal retrieves valid department/location/role combinations or how Managers, HR and fulfilment teams retrieve their assigned work queues. | Define the API behaviour for retrieving valid master-data combinations and the Manager, HR and fulfilment queues. Specify role-based filtering, assignment rules, required response fields, pagination, and access restrictions. If existing APIs cover this, document the exact filtering and authorisation. Add acceptance tests confirming each role sees only its permitted records. | Common queue rules (server-side filtering, D23, D65 DTOs, pagination 25/100). API18 to API20 master-data cascade; API21 My Approvals (`pending`/`decided`); API22 HR queue buckets with `blockedBy`; API23 fulfilment queue per team; API24 approver/new-manager candidates; API02 limited to own requests and paginated. AC-P24 to AC-P28, AC-N45 to AC-N49 |
| G1-06 | **The active-request database rule must account for pending cancellation.** The BRD allows a new request while an earlier one is `CancellationPending` but blocks HR approval until it resolves. The spec's unique constraint over an "Active Set" does not say whether `CancellationPending` is included; including it would reject a submission the BRD allows. | Define the database active-status set and its interaction with D68. Allow submission while the earlier request is `CancellationPending`, and prevent approval and downstream dispatch until the earlier cancellation is fully resolved. Add a concurrent-submission test and document the exact constraint/index strategy in `plan.md`. | Data Model: exact active set (excludes `CancellationPending`); partial unique index DDL; employee row lock for API01, T6, T14/T16, T17; dispatch outbox in the T6 transaction; error mapping. AC-N50 to AC-N54, AC-P29; IT-04 to IT-08. Constraint/index strategy documented in `.ai-context/plans/internal-transfer-journey.plan.md` (draft; D71 item 1 and the idempotency store only, items 2 to 7 pending) |

## Re-submission
- Spec v1.1 addresses G1-04 to G1-06 and was resubmitted for Gate 1 re-review on 2026-10-09. Status: In Peer Review (Gate 1 re-review).
- The re-review outcome will be recorded in a new review file.
- Re-review outcome: **Approved** on 2026-10-13. Record: `.ai-context/pr_reviews/internal-transfer-journey-G1-20261013-172245.md`.
