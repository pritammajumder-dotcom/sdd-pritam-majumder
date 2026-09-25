# Spec: <Feature Name>

## Spec ID
<feature-slug>

## Status
Draft | In Peer Review | Changes Requested | Approved | Plan Drafted | Plan Reviewed | Tasks Generated | Under Development | In QA | Ready for Release | Released (vX.Y.Z)

## Roles & Assignments
- **Developer:** <Developer Name / Email>
- **Gate 1 Reviewer(s):** <Assigned Reviewer Name(s) / Email(s) / User ID(s)> (Single or Multiple)
- **Gate 2 Reviewer(s):** <Assigned Reviewer Name(s) / Email(s) / User ID(s)> (Single or Multiple)

## Linked BRD
.ai-context/BRD.md#BRD-NNN

## Gate Approvals & History
| Gate | Approver Name | Approver Email/ID | Date/Time | Outcome | Approval Comment / Summary |
|---|---|---|---|---|---|
| Gate 1 (Spec Review) | <Approver Name> | <Email/ID> | YYYY-MM-DD HH:MM:SS | Approved | "<Gate 1 review summary / link to dashboard>" |
| Gate 2 (Code Review) | <Approver Name> | <Email/ID> | YYYY-MM-DD HH:MM:SS | Approved | "<Gate 2 review summary / link to dashboard>" |

## Intent
<One paragraph: what changes, for whom, under what condition>

## Context
- Builds on: .ai-context/architecture.md (<section>)
- Related: .ai-context/specs/<related-spec>.spec.md
- API contract: <link if external>

## API Contract (Mandatory if API surface exists)
### <slug>.API01 — <METHOD> <path>
**Request payload:**
```json
{ "field": "type" }
```

**Success response (`<code>`):**

```json
{ "field": "type" }
```

**Exceptions:**

| Code | Condition       | Response body |
| ---- | --------------- | ------------- |
| 4xx  | `<condition>` | `<shape>`   |

## Acceptance Criteria

1. `<slug>`.AC1 — Given `<state>`, when `<action>`, then `<outcome>`.
2. `<slug>`.AC2 — Given `<state>`, when `<action>`, then `<outcome>`.

## Unit Test Cases (spec-derived)

| Test ID         | Maps to AC | Scenario       | Expected       |
| --------------- | ---------- | -------------- | -------------- |
| `<slug>`.UT01 | AC1        | `<scenario>` | `<expected>` |

## Explicitly Out of Scope

- <item>

## Non-Functional Constraints (from constitution.md)

- <latency / throughput / compliance constraint>
