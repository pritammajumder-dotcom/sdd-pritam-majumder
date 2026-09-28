# Project Context: Employee Internal Transfer Digital Journey

## Objective
Enable an employee to initiate, track, and complete an Internal Transfer Request entirely through the One-Point Employee Portal. This project replaces the current manual, multi-team coordination process (Employee → Manager → HR → Payroll → IT → Facilities) with a single, automated digital journey. The portal orchestrates downstream activities and provides a unified, transparent view of progress back to the employee.

## Architecture Summary
The system follows a **Modular Monolith (Microservice Ready)** architecture.
- **Frontend/Mobile**: Built using **Flutter (Dart)** with Material 3 theming, compiled to APK/IPA.
- **Backend**: Built with **Node.js (NestJS)** and deployed via Docker containers.
- **Data & Persistence**: **PostgreSQL** serves as the primary system of record, accessed via **Prisma ORM**.
- **Security**: Authentication is managed securely via **JWT**.
- **Integrations**: Downstream fulfilment actors (Payroll, IT, Facilities) are orchestrated via mocked adapters in this iteration, keeping the system fully self-contained with zero external third-party dependencies.

## Stakeholders & Governance
- **Sponsor**: HR Business Owner
- **Project Manager (Gate 1 Reviewer)**: Shamik Bhattacharya (shamik.bhattacharya@intglobal.com)
- **Technical Lead / Architect (Gate 2 Reviewer)**: Subhajit Mukherjee (subhajit.mukherjee@intglobal.com)
- **Senior Software Engineer (Spec Author)**: Pritam Majumder (pritam.majumder@intglobal.com)

## Getting Started
- All feature specifications reside in `.ai-context/specs/`.
- The strict rules governing coding standards, testing, and security are found in `.ai-context/constitution.md`.
- Ensure all work adheres to the **INT SDD BluePrint - V1.0** (located in `docs/`) for foundational guidelines.
