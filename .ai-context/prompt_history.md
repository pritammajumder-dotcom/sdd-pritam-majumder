# Prompt History

## Setup
Project setup initiated with Mobile/Backend architecture.

## Milestones
- **2026-09-25**: Created `internal-transfer-journey.spec.md` and `internal-transfer-journey.test_cases.md` based on BRD-001, then updated them to resolve all gaps from the spec audit.

### [2026-09-28 16:44]
**User Request:** Shamik Bhattacharya (Gate 1 Reviewer) logged 28 Gate 1 feedback items and mandatory acceptance scenarios on the BRD, and asked for an updated BRD with the previous version archived and properly versioned (no code changes).
**Agent Action:** Archived the previous BRD unchanged as v1.0 at `.ai-context/archive/brd/BRD-v1.0.md` with a superseded header. Rewrote `.ai-context/BRD.md` as v1.1 (Pending Gate 1) with clause IDs BRD-001.D01 to D52, a status and transition model, an access matrix, fulfilment failure and idempotency rules, SLAs with business-day examples, acceptance scenarios AS-P01 to P10 and AS-N01 to N22, and a feedback traceability appendix. Recorded the feedback in `.ai-context/decisions/gate-1-feedback-brd-v1.0.md`. Created `.ai-context/decisions/brd-change-log.md` with the v1.1 impact analysis and updated the summary `.ai-context/brd-change-log.md`. No code, spec, or test-case files were changed.

### [2026-09-29 19:29]
**User Request:** Shamik Bhattacharya (Gate 1 Reviewer) gave Gate 1 re-review feedback on BRD v1.1 (25 items plus terminology and extra acceptance scenarios) and asked for the BRD only to be revised and released, keeping the old version for reference.
**Agent Action:** Asked the reviewer to decide four open points: all v1.1 assumptions confirmed; cancellation terminal only after unwind; new submission allowed but HR approval blocked during an earlier unwind; new manager from master data with HR filling gaps. Archived v1.1 unchanged at `.ai-context/archive/brd/BRD-v1.1.md`. Rewrote `.ai-context/BRD.md` as v1.2 (Pending Gate 1): kept D01 to D52, added D53 to D71, `CancellationPending`, T16 to T18, AS-P23 to P33, AS-N23 to N38, Decision Register (no open assumptions), Appendix B. Recorded the feedback in `.ai-context/decisions/gate-1-feedback-brd-v1.1.md`. Updated both change logs and the v1.0 archive and feedback pointers. Spec, test cases and code unchanged.
