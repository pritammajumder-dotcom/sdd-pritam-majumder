---
name: int-project-resume
description: State-Aware Session Continuation & SDD Resume Engine (inspects BRD, Gate 0, Spec states, Gate 1, TDD, Gate 2, Release state, and Git status before executing valid actions).
---

# INT Project Resume Workflow (State-Driven Engine)

The `/int-project-resume` workflow is the **authoritative entry point for resuming an interrupted or in-progress SDD project**.

> [!IMPORTANT]
> **True State Reconstruction (No Blind Continuation)**
> Every time this workflow is triggered, the system inspects persistent repository memory (`.ai-context/`), review records (`pr_reviews/`), and Git working tree status to determine the actual project state tree. It validates state consistency, detects manual edits, and prompts for explicit user confirmation before executing any action.

---

## Workflow Flowchart

```text
/int-project-resume
       ↓
Reconstruct Project State Tree (.ai-context/status.md, dashboard.html, project_context.md)
       ↓
Inspect BRD & Gate 0 Review State (.ai-context/BRD.md, pr_reviews/BRD-*.md)
       ├─► [BRD Approved] ──► Prompt: "BRD Approved. Continue to Spec Generation?"
       ├─► [BRD Changes Requested] ──► Display Reviewer Comments & Suggest Updates
       └─► [Manual BRD Edits Detected] ──► Prompt: "Manual changes detected. Review or Submit for Gate 0?"
       ↓
Inspect Feature Specs & Gate 1 Status (.ai-context/specs/*.spec.md, pr_reviews/GATE1-*.md)
       ↓
Display Multi-Spec Interactive Selection Table (e.g. "3 of 8 Specs Approved")
       ↓
User Selects Specific Feature Spec
       ↓
Inspect Selected Spec Downstream Artifacts (.plan.md, .tasks.md, .test_cases.md)
       ├─► [Spec Approved (Gate 1 Passed)] ──► Prompt: "Spec Approved. Continue to Plan Generation?"
       ├─► [Spec Changes Requested] ──► Show Reviewer Feedback & Block Downstream Coding
       └─► [Spec In Development] ──► Inspect Tasks (- [ ]) & TDD State (tests/ RED vs GREEN)
       ↓
Inspect Gate 2 & Release Readiness State (.ai-context/pr_reviews/GATE2-*.md, releases/)
       ├─► [Gate 2 Changes Requested] ──► Show Gate 2 Reviewer Feedback & Guide Code Fix
       └─► [Gate 2 Approved] ──► Prompt: "Gate 2 Approved. Continue to Release File Generation?"
       ↓
Inspect Git Status & Working Tree Diffs (Classify: No Changes | Workflow | Manual | PR Review Edits)
       ↓
Present Valid Next Actions to Developer
       ↓
Wait for Developer Confirmation
       ↓
Execute Selected Action & Update Repository State
```

---

## Standard State Transition Confirmation Prompts

### 1. BRD Approved Confirmation
> 🟢 **BRD has already been approved (Gate 0 Passed).**
> Do you want to continue with Spec Generation?
> 
> **Options:**
> 1. Continue with Spec Generation
> 2. Review/Modify BRD
> 3. Exit

---

### 2. Multi-Spec Selection Prompt
> 📊 **Project Specifications Status Summary (X of Y Specs Approved)**
> 
> Select the specification you want to work with:
> 1. Spec 1 — `<Slug 1>` `[APPROVED]`
> 2. Spec 2 — `<Slug 2>` `[APPROVED]`
> 3. Spec 3 — `<Slug 3>` `[PENDING REVIEW]`
> 4. Spec 4 — `<Slug 4>` `[CHANGES REQUESTED]`
> 5. Spec 5 — `<Slug 5>` `[DRAFT]`

---

### 3. Approved Spec Plan Generation Prompt
> 🟢 **Spec `<feature-slug>` has already been approved (Gate 1 Passed).**
> The next workflow stage is Plan Generation. Do you want to continue?
> 
> **Options:**
> 1. Continue with Plan Generation
> 2. Review Spec
> 3. Modify Spec
> 4. Exit

---

### 4. Gate 2 Approved Release File Generation Prompt
> 🟢 **Gate 2 has been approved for Spec `<feature-slug>`.**
> The next step is Release File Generation. Do you want to continue?
> 
> **Options:**
> 1. Generate Release File
> 2. Review Gate 2 changes
> 3. Review Spec
> 4. Exit

---

## Non-Negotiable Safety Rules
1. **Precedence Hierarchy**: `Gate 0 Approval > Spec Approval (Gate 1) > Gate 2 Approval > Release Generation`.
2. **No Blind Execution**: Never assume the previous command represents current state.
3. **No Gate Bypassing**: Never skip Gate 0, Gate 1, or Gate 2 review cycles.
4. **No Silent Overwrites**: Never overwrite or regenerate approved artifacts without user sign-off.
