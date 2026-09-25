---
name: int-hotfix-management
description: Manage urgent production fixes linked to an existing Incident using the INT compressed SDD chain, mandatory Gate 2, retro-documentation, and Release Management.
---

# INT Hotfix Management Workflow

## 1. Purpose

This workflow manages urgent production fixes.

A Hotfix MUST originate from an existing Incident.

The lifecycle is:

```text
Incident
 ↓
HOTFIX-<incident-slug>
 ↓
Lightweight Spec
 ↓
Root Cause
 ↓
Implementation
 ↓
Test Validation
 ↓
Gate 2
 ↓
Retro-documentation
 ↓
Release Management
 ↓
Production
 ↓
Incident Resolution
```

The INT SDD Blueprint V1.0 is the sole source of truth for Hotfix lifecycle, artefact structure, Gate 2, release, and production-support rules.

If this workflow conflicts with the Blueprint, the Blueprint takes precedence.

---

# 2. Preconditions

Before starting, verify:

```text
Incident ID exists
↓
Incident file exists
↓
Incident is classified
↓
Hotfix is justified
```

Incident record:

```text
.ai-context/incidents/INC-YYYY-NNN.md
```

Do not create a Hotfix without a valid Incident ID.

---

# 3. Hotfix Identifier

Create:

```text
HOTFIX-<incident-slug>
```

The Hotfix ID MUST remain stable throughout the Hotfix lifecycle.

---

# 4. Hotfix Operational Record

Create:

```text
.ai-context/hotfixes/HOTFIX-<incident-slug>.md
```

Use:

```markdown
# Hotfix: <Title>

## Hotfix ID
HOTFIX-<incident-slug>

## Incident ID
INC-YYYY-NNN

## Status
In Progress

## Incident
.ai-context/incidents/INC-YYYY-NNN.md

## Root Cause
Pending Investigation

## Correct Behaviour
<expected behaviour>

## Acceptance Criteria
1. HOTFIX-<incident-slug>.AC1 — Given <state>, when <action>, then <outcome>.

## Related Original Spec
.ai-context/specs/<feature-slug>.spec.md

## Fix Summary
Pending

## Test Evidence
Pending

## Gate 2
Pending

## Retro-documentation
Pending

## Release
Pending
```

The operational Hotfix record is separate from the Blueprint-required lightweight Hotfix Spec.

---

# 5. Lightweight Hotfix Spec

Where required by the INT SDD Blueprint, create:

```text
.ai-context/specs/hotfix-<incident-slug>.spec.md
```

The Hotfix Spec MUST identify:

- Incident
- Root Cause
- Correct Behaviour
- Acceptance Criteria
- Related original Spec
- Fix Summary

The Hotfix Spec and operational Hotfix record MUST use the same Hotfix ID and Incident ID.

Do not create a duplicate unrelated Spec ID.

---

# 6. Root Cause

Investigate and document:

- Root Cause
- Contributing Factors
- Affected Module
- Affected API
- Database impact
- Configuration impact
- Security impact
- Regression risk

If the root cause cannot be determined before the urgent correction, record `Pending Investigation` rather than inventing a root cause.

Update the Incident and Hotfix records when the root cause becomes known.

---

# 7. Implementation

Create a dedicated branch:

```text
hotfix/<incident-slug>
```

Implement only the minimum required correction.

Do not use a Hotfix to introduce unrelated features, refactoring, architecture redesign, or scope expansion.

If a major architecture change is required, stop and route through the normal architecture review process.

---

# 8. Test Validation

Validate the Hotfix against its Acceptance Criteria.

Required where applicable:

- Original incident reproduction
- Acceptance Criteria
- Regression tests
- Integration tests
- Security validation
- Data validation
- Production safety validation

Follow the INT test-first discipline where feasible and required.

The Hotfix MUST NOT proceed to release with known blocking failures.

---

# 9. Gate 2

Gate 2 is mandatory.

Gate 2 MUST verify:

- Incident is correctly identified
- Hotfix scope is correct
- Acceptance Criteria pass
- Tests pass
- Root cause is addressed
- Regression risk is acceptable
- Security checks are complete
- Architecture impact is considered
- Required documentation is updated
- Production rollback/recovery is considered

Gate 2 result:

```text
Approved
```

or:

```text
Changes Requested
```

If Changes Requested, fix, retest, and repeat Gate 2.

Do not release before Gate 2 approval.

---

# 10. Retro-documentation

After Gate 2, update:

```text
.ai-context/incidents/INC-YYYY-NNN.md
.ai-context/hotfixes/HOTFIX-<incident-slug>.md
```

Record:

- Root Cause
- Resolution
- Test result
- Gate 2 result
- Release version
- Preventive action
- Follow-up work

If the incident reveals a genuine new requirement:

```text
Hotfix
 ↓
BRD Change
 ↓
BRD Change Log
 ↓
Gate 1
 ↓
Normal SDD lifecycle
```

Do not silently alter the BRD through the Hotfix workflow.

---

# 11. Release

Once Gate 2 and retro-documentation are complete, hand the Hotfix to `release-management`.

Release Management controls:

- Release readiness
- Version
- Release notes
- Spec release state
- `status.md`
- Git tag

The Hotfix workflow MUST NOT create a release independently when the Release Management workflow is available.

---

# 12. Production Verification

After release:

```text
Release
 ↓
Production Deployment
 ↓
Smoke Test
 ↓
Monitor
 ↓
Confirm Incident Resolution
```

Verify the original Incident condition is resolved.

---

# 13. Incident Resolution

Update the Incident with:

```text
Status:
Resolved

Hotfix:
HOTFIX-<incident-slug>

Release:
vX.Y.Z

Resolution:
<summary>
```

The Incident may then proceed to Closed according to the Incident workflow.

---

# 14. Final Traceability

```text
Client / Monitoring Report
 ↓
INC-YYYY-NNN
 ↓
HOTFIX-<incident-slug>
 ↓
Lightweight Hotfix Spec
 ↓
Root Cause
 ↓
Implementation
 ↓
Tests
 ↓
Gate 2
 ↓
Retro-documentation
 ↓
Release Management
 ↓
vX.Y.Z
 ↓
Production
 ↓
Incident Resolution
```

---

# 15. Final Validation

Verify:

1. Incident ID exists.
2. Incident file exists.
3. Hotfix ID is unique.
4. Hotfix references the Incident ID.
5. Incident references the Hotfix ID.
6. Operational Hotfix record exists.
7. Blueprint-required Hotfix Spec exists where applicable.
8. Root Cause is documented or explicitly marked pending.
9. Acceptance Criteria are documented.
10. Tests pass.
11. Gate 2 is approved.
12. Retro-documentation is complete.
13. Release Management is completed.
14. Production verification is completed.
15. Incident status is updated.
16. `status.md` is updated.
17. No unrelated functionality was introduced.

If any mandatory validation fails, do not report the Hotfix as complete.
