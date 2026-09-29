# BRD Change Log

> The detailed change log, with impact analysis, is kept at `.ai-context/decisions/brd-change-log.md` (per the `int-brd-ingestion` workflow). This table is a summary only.

| Date | Version | Changes | Author |
|---|---|---|---|
| Not recorded (on or before 2026-09-25) | 1.0 | Initial creation. Archived at `archive/brd/BRD-v1.0.md` | Agent |
| 2026-09-28 | 1.1 | Revised against Gate 1 feedback G1-01 to G1-28 from Shamik Bhattacharya: effective-date semantics, withdrawal cutoff, HR action model, fulfilment failure, idempotency, access matrix, SLAs, state transitions, audit, notifications, concurrency, performance, test data, acceptance scenarios. Gate 1 re-review 2026-09-29: Changes Requested. Archived at `archive/brd/BRD-v1.1.md` | Agent (for Shamik Bhattacharya, PM) |
| 2026-09-29 | 1.2 | Revised against Gate 1 re-review feedback G1R-01 to G1R-26 from Shamik Bhattacharya: all v1.1 assumptions confirmed; per-operation idempotency keys; adapter Cancel; `CancellationPending` and reversal resolution; late and authenticated callbacks; manual-completion controls; approver assignment; new-manager rule; effective-date cutoff, atomic application and recovery; notification idempotency; tamper evidence; API-level data protection; reschedule limits; adapter contract; status/flag separation; development entry conditions; AS-P23 to P33, AS-N23 to N38. Status: Pending Gate 1 | Agent (for Shamik Bhattacharya, PM) |
