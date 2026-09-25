---
name: int-project-setup
description: Initialize a new software project using the INT AI-First standard Control Plane, project-specific AI context, technology discovery gate, and repository baseline.
---

# INT AI-First Project Setup Workflow

This workflow triggers the **`int-project-setup`** skill.

For the full detailed specification, templates, and execution protocols, see:
[int-project-setup/SKILL.md](file:///C:/Users/Supratim_Jetty/.gemini/config/skills/int-project-setup/SKILL.md)

## Summary of Steps:

1. **Technology & Architecture Discovery Gate**:
   - Confirm Project Type (Full Stack, Frontend Only, Backend Only, Mobile)
   - Confirm Architecture Style (MANDATORY FOR ALL TYPES: Monolithic vs Modular Monolith / Microservices-Ready vs Microservices vs Clean Architecture vs Feature-Sliced Architecture)
   - Confirm Tech Stack (Frontend, Backend, Database, ORM, Auth, Deployment)
   - Confirm Gate 1 Reviewer(s) and Gate 2 Reviewer(s) (supports single or multiple assigned reviewers per gate specified by Name/Email/User ID)
2. **Copy INT Control Plane & Setup Governance**:
   - Dynamically copy `resources/INT-Control-Plane/.agent/` to `.agent/`
   - Auto-generate `AGENTS.md` in workspace root for vendor-agnostic governance
   - Auto-copy all SDD sub-skills into `.agents/skills/` within the project repository
   - Auto-generate `.gitignore` with standard rules protecting `.agent/`, `.ai-context/`, and `.agents/`
3. **Initialize `.ai-context/` Knowledge Base**:
   - Create subdirectories (`specs`, `plans`, `tasks`, `test_cases`, etc.)
   - Generate all 12 mandatory engineering templates under `.ai-context/templates/`
   - Initialize `constitution.md`, `project_context.md`, `architecture.md`, `BRD.md`, `status.md`, `prompt_history.md`
4. **Setup Execution Layer**:
   - Build `src/` and `tests/` directory layout matching project type.

