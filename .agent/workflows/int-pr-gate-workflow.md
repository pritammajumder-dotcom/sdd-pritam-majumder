---
name: int-pr-gate-workflow
description: Standardized PR Gate Workflow between Spec Generation and Gate 2 Approval covering parallel spec execution, reviewer detection after git pull, role decision prompts, reviewer identity validation, Gate 1 & Gate 2 standardized review templates, and dashboard synchronization.
---

# INT PR Gate Workflow (Spec Generation → Gate 1 → Development → Gate 2)

> [!IMPORTANT]
> **Scope Restriction**
> This workflow governs exclusively the PR Gate lifecycle between **Spec Generation and Gate 2 Approval**.
> Workflows before Spec Generation (BRD, Setup, Ingestion) and after Gate 2 Approval (Release Management, CRs, Hotfixes, Deployment) remain 100% unchanged.

---

## 1. Non-Blocking Parallel Spec Execution

Multiple specs exist and progress independently. Specs in different lifecycle stages do not block one another:
- `spec-1` → Waiting for Gate 1 (`In Peer Review`)
- `spec-2` → Waiting for Gate 1 (`In Peer Review`)
- `spec-3` → Gate 1 Approved (`Approved`)
- `spec-4` → In Development (`Under Development`)
- `spec-5` → Waiting for Gate 2 (`In QA`)

---

## 2. Reviewer Detection & Trigger Mechanism

The PR Gate Workflow supports **Hybrid Triggering** for optimal user experience:

### A. Context-Aware Session Resume / Git Pull Notification
When a user pulls code or resumes an agent session:
1. The agent inspects Git user credentials: `git config user.name`, `git config user.email` (or configured User ID).
2. The agent queries `.ai-context/dashboard.html` and `.ai-context/specs/` for assigned pending reviews.
3. If pending reviews exist for this user identity, the agent displays a non-blocking notification:
   > 📌 **Pending PR Reviews**: You have **N pending reviews** assigned to you.
   > *Type **`/pr-gate-workflow`** to launch the reviewer workspace, or proceed with your command.*

### B. Mandatory Pre-Check Authorization Workflow (`/pr-gate-workflow`)

When `/pr-gate-workflow` is triggered, the system MUST execute **Mandatory Pre-Check Authorization FIRST** before asking any questions:

```text
               1. Execute /pr-gate-workflow
                           │
                           ▼
          2. Check git config user.email
                           │
                           ▼
   Compare against Assigned Reviewer Roster (project_context.md)
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
    [ EMAILS MATCH ]            [ EMAILS DO NOT MATCH ]
             │                           │
             ▼                           ▼
  User IS Authorized Reviewer   User IS NOT Authorized Reviewer
             │                           │
             ▼                           ▼
  Show Reviewer Questions:      1. Display Unauthorized Alert:
  - Option 1: Review Specs         "🛑 UNAUTHORIZED FOR PR REVIEW:
  - Option 2: Work on Specs         Your email (<logged_in_email>) does
                                    not match assigned reviewer (<assigned_email>)."
                                2. SKIP Option 1 completely!
                                3. DIRECTLY route to Developer Selection:
                                   "Which approved spec would you like
                                    to start development on?"
```

#### Step 1: Execute Authorization Pre-Check FIRST
Inspect `git config user.email` and compare against assigned reviewer emails (`Gate 0 Reviewers`, `Gate 1 Reviewers`, `Gate 2 Reviewers`) configured in `.ai-context/project_context.md` and `.ai-context/constitution.md`.

#### Step 2A: If Email MATCHES Assigned Reviewer Roster
The user is confirmed as an **Authorized Reviewer**. Present the Reviewer Decision Prompt:
> **"You are logged in as <User Name> (<Email>). You are an authorized PR Reviewer. What would you like to do?"**
> - **[ Option 1 — Review Pending Specs ]**
> - **[ Option 2 — Work on Approved Specs ]**

#### Step 2B: If Email DOES NOT MATCH Assigned Reviewer Roster
The user is **UNAUTHORIZED FOR PR REVIEW**.
1. **DO NOT** display Option 1 (Review Pending Specs).
2. **DO NOT** use interactive modal tools (`ask_question`) to prompt the user to change or update `.ai-context/project_context.md` or `.ai-context/constitution.md`!
3. Display the high-priority Unauthorized Alert:
   > 🛑 **UNAUTHORIZED FOR PR REVIEW**
   > - **Logged-in Git Email:** `<logged_in_email>` (e.g. `supratim.jetty@intglobal.com`)
   > - **Assigned Reviewer Email:** `<assigned_email>` (e.g. `sjetty786@gmail.com`)
   >
   > 🔒 **Access Restricted**: You are not authorized to perform PR reviews for this project because your logged-in Git email (`<logged_in_email>`) does not match the assigned PR reviewer email (`<assigned_email>`). Remaining in Developer mode.
4. **Bypass Reviewer Prompt & Direct Immediately to Development**:
   > 💻 **Directing to Developer Workspace...**
   > **"Which approved spec would you like to start development on?"**
   > [Displays roster of eligible Gate 1 approved specs]

---

## 5. Behavior When Developer Pulls Code After REJECTED PR Review

When a developer pulls code or resumes execution and prompts to "continue" or start work on an artifact whose PR Review was **REJECTED** or marked **`Changes Requested`**:

```text
Developer prompts "continue" after PR Reviewer marked status = REJECTED / CHANGES REQUESTED
                                     │
                                     ▼
Agent inspects .ai-context/pr_reviews/, .spec.md, BRD.md, and status.md
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
   [ Gate 0 REJECTED ]       [ Gate 1 REJECTED ]       [ Gate 2 REJECTED ]
           │                         │                         │
           ▼                         ▼                         ▼
 1. Spec Generation BLOCKED 1. Plan/Task/Coding BLOCKED 1. Merge/Release BLOCKED
 2. Displays Gate 0         2. Displays Gate 1         2. Displays Gate 2
    rejection comments         rejection comments         rejection comments
 3. Instructs author to     3. Instructs author to     3. Instructs developer to
    update BRD.md and          update .spec.md and        fix code/tests in src/
    re-submit for Gate 0       re-submit for Gate 1       and re-submit for Gate 2
```

### Strict System Response on Rejected Review Continuation:
The system **STRICTLY STOPS** and refuses to proceed to downstream steps (`.plan.md`, `.tasks.md`, `src/` coding, merge, or release). The agent displays:

> 🛑 **WORKFLOW STOPPED: PR REVIEW REJECTED / CHANGES REQUESTED**
>
> - **Review Level:** Gate 0 (BRD) | Gate 1 (Spec) | Gate 2 (Code)
> - **Target Artifact:** `<BRD / Spec ID / Code Diff>`
> - **Assigned Reviewer:** `<Reviewer Name>` (`<Reviewer Email>`)
> - **Review Status:** `Rejected` / `Changes Requested`
> - **Review Date:** `<YYYY-MM-DD HH:MM:SS>`
> - **Reviewer Description & Comments:**
>   - *Description*: `<Review Description>`
>   - *Comments*: `<Review Comments>`
>
> 🔒 **Enforcement Rule**: You cannot proceed with planning, coding, or merging for a rejected artifact.
> **Required Next Action**:
> - **For Gate 0 Rejection**: Author must update `.ai-context/BRD.md` to resolve comments and re-submit for Gate 0 review.
> - **For Gate 1 Rejection**: Author must update `.ai-context/specs/<slug>.spec.md` to resolve comments and re-submit for Gate 1 review.
> - **For Gate 2 Rejection**: Developer must update code in `src/` and tests under `tests/` to resolve comments and re-submit for Gate 2 review.

4. **Hard Approval Guard**:
   Any attempt to submit an `Approve`, `Reject`, or `Changes Requested` decision by a user whose email does not match the assigned reviewer roster MUST be **REJECTED AND BLOCKED IMMEDIATELY**.

---

## 3. Option 1 — Review Pending Specs Protocol (Complete Lifecycle)

1. **Role-Based Spec & Artifact Filtering & Listing**:
   The agent queries `.ai-context/BRD.md`, `.ai-context/specs/`, and `.ai-context/dashboard.html` for artifacts waiting for review where current user identity matches the assigned reviewer roster:
   - **BRD Approver (Gate 0)**: Shows pending BRD PR Reviews (`.ai-context/BRD.md` status = `Pending Review`).
   - **Gate 1 Approver**: Shows pending Gate 1 Spec Peer Reviews (`In Peer Review`).
   - **Gate 2 Approver**: Shows pending Gate 2 Code Reviews (`In QA`).
   - **Multi-Role Approver**: Shows ALL assigned pending reviewals (BRD, Gate 1 Specs, Gate 2 Code) in the same listing!

   > **"Which item would you like to review?"**

   | # | Item / Spec ID | Title | Gate Level | Assigned Role | Author/Dev | Current Status |
   |---|---|---|---|---|---|---|
   | 1 | `BRD-Baseline` | Project Requirement Baseline | **Gate 0** | BRD Reviewer | PM / Lead | Pending BRD Review |
   | 2 | `auth-service` | User Authentication Spec | **Gate 1** | Gate 1 Reviewer | Dev A | Pending Spec Review |
   | 3 | `payment-gateway` | Payment Gateway Code | **Gate 2** | Gate 2 Reviewer | Dev B | Pending Code Review |
   | 4 | `order-engine` | Order Processing Spec | **Gate 1 & Gate 2** | Dual Reviewer | Dev C | Pending Spec Review |

2. **Spec & BRD-Oriented Interactive Q&A Review Process**:
   When the reviewer selects a spec:
   - **Step A — Spec & BRD Orientation Summary**: Agent displays feature Intent, Linked BRD Requirement ID & Text (`.ai-context/BRD.md#BRD-NNN`), Acceptance Criteria, and (for Gate 2) code diff summary & test suite results.
   - **Step B — Interactive Q&A Criteria Evaluation**: Agent collects criteria scores across the 11 Gate 1 metrics (including **BRD Traceability & Alignment**) or Gate 2 metrics.
   - **Step C — Review Description**: Agent prompts for high-level findings summary and BRD scope assessment.
   - **Step D — Review Comments**: Agent prompts for detailed line-item notes or requested changes.
   - **Step E — Final Decision**: Agent prompts for decision: `Approve`, `Reject`, or `Changes Requested`.

3. **Dedicated Review Record Artifact File Creation**:
   Upon review completion, automatically write a dedicated review artifact file under:
   - `.ai-context/pr_reviews/GATE1-<feature-slug>-<YYYYMMDD-HHMMSS>.md` (for Gate 1)
   - `.ai-context/pr_reviews/GATE2-<feature-slug>-<YYYYMMDD-HHMMSS>.md` (for Gate 2)

4. **Git Identity Validation**:
   Validate authenticated Git credentials match the assigned reviewer roster before committing the review outcome.

5. **5-Artifact Synchronization Protocol**:
   Synchronize review completion across **5 core repository artifacts**:
   - **1. Dedicated PR Review File**: Saved under `.ai-context/pr_reviews/`.
   - **2. Dashboard HTML (`.ai-context/dashboard.html` — SINGLE SOURCE OF TRUTH)**: Updated with complete 22-field template, criteria scores, comments, description, reviewer ID, timestamp.
   - **3. Governing Spec (`.ai-context/specs/<slug>.spec.md`)**: Updated status and `## Gate Approvals & History` log linking to review file.
   - **4. Project Status Board (`.ai-context/status.md`)**: Updated active spec status and daily log.
   - **5. Prompt History (`.ai-context/prompt_history.md`)**: Appended turn log entry (STRICT APPEND-ONLY RULE).

6. **Continuous Review Loop**:
   - After completing the review for the selected spec, **automatically loop back** to display the updated listing of remaining pending PR reviews assigned to that reviewer!
   - If no more pending reviews remain, display:
     > *"All assigned PR reviews have been completed! Would you like to select an approved spec to start development on?"*

---

## 4. Option 2 / Developer Work Selection & Pre-Development Verification Protocol

1. When starting development on a feature, ask:
   > **"Which approved spec would you like to start development on?"**
2. Display ONLY specs eligible for development (Spec status = `Approved` / Gate 1 Status = `Approved`).
3. If no approved spec exists, display:
   > **"No approved spec is currently available for development. Please complete the PR Gate 1 approval process before proceeding."**
4. **Pre-Development PR Review Check & Developer Notification**:
   Before creating plans, tasks, or code, inspect `.ai-context/pr_reviews/GATE1-<slug>-*.md` for the selected spec and notify the developer:
   - Display Gate 1 Reviewer Name, Email, Review Date, Description, and Comments.
   - **Case A: Gate 1 Status = `Approved`**:
     - Notify developer of approval comments and guide them through:
       1. Create Implementation Plan (`.plan.md`)
       2. Create Tasks Breakdown (`.tasks.md`)
       3. Create Test Cases (`.test_cases.md`)
       4. Execute TDD RED (`tests/`) -> GREEN (`src/`)
       5. Run full test suite to confirm 100% PASS
       6. Submit for Gate 2 Review (`.ai-context/pr_reviews/GATE2-<slug>-*.md`)
   - **Case B: Gate 1 Status = `Rejected` / `Changes Requested`**:
     - **STRICT DEVELOPMENT BLOCK**: Block developer from creating `.plan.md`, `.tasks.md`, `.test_cases.md`, or writing code!
     - Display high-priority rejection warning with reviewer comments.
     - Direct spec author to update `.ai-context/specs/<slug>.spec.md` and re-submit for Gate 1 approval.

---

## 5. Role Separation & Local-Only Handling

- **Reviewer Identity**: Confers official Gate 1 & Gate 2 approval/rejection rights. Pulling code does NOT confer reviewer approval rights unless user is assigned reviewer.
- **Developer Identity**: Confers rights to pull code, select approved specs, write implementation code, and submit for Gate 2 review.
- **Local-Only Scenario**: If project is not pushed to Git, Git credential validation is bypassed, but complete reviewer name, email/User ID, review comments, description, and timestamps MUST be captured in the review record.
