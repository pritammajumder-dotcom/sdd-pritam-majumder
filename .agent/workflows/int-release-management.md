---
name: int-release-management
description: Validate release readiness, release approved Specs, generate release notes from Spec Intent, update project status, and create the Git release tag.
---

# INT Release Management Workflow

## 1. Purpose

This workflow manages the release of completed and approved Specs.

It is responsible for:

- Release readiness validation
- Identifying Specs included in the release
- Verifying all included Specs are Ready for Release
- Preparing release notes from Spec Intent
- Updating Spec states to Released
- Updating `status.md`
- Creating the Git release tag

This workflow MUST NOT implement business functionality.

The INT SDD Blueprint V1.0 is the sole source of truth for release management, lifecycle states, artefact structure, and release rules.

If this workflow conflicts with the INT SDD Blueprint V1.0, the Blueprint takes precedence.

---

# 2. Release Flow

The release lifecycle is:

```text
status.md
      ↓
Identify release scope
      ↓
All included Specs = Ready for Release
      ↓
Release Readiness Validation
      ↓
Release
      ↓
Specs → Released (vX.Y.Z)
      ↓
Release Notes from Spec Intent
      ↓
status.md updated
      ↓
Git Tag