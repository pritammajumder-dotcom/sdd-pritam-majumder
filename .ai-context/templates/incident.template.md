# Incident: INC-YYYY-NNN — <Title>

## Incident Metadata
- **Incident ID:** INC-YYYY-NNN
- **Reporter / Source:** <Source>
- **Environment:** <Production | Staging | etc.>
- **Impact / Severity:** <Sev-1 | Sev-2 | Sev-3>
- **Reported Date:** YYYY-MM-DD
- **Status:** Open | Triaged | Fix In Progress | Verifying | Closed

## Description & Evidence
<Description of the failure>
### Log Evidence / Stack Trace:
```text
<logs / trace>
```

## Classification & Routing

- [ ] **Spec Gap** → Route to: `.ai-context/specs/<feature-slug>.spec.md` (Update Spec & Plan)
- [ ] **Implementation Defect** → Route to: `.ai-context/specs/hotfix-<incident-slug>.spec.md`
- [ ] **New Requirement** → Route to: `.ai-context/BRD.md` (BRD ingestion workflow)

## Root Cause Analysis

<Detailed root cause>

## Resolution & Post-Mortem Sign-Off

- **Hotfix / Spec Link:** `.ai-context/specs/hotfix-<incident-slug>.spec.md`
- **Resolution Date:** YYYY-MM-DD
- **ADR Triggered:** Yes / No (Link: `.ai-context/decisions/ADR-NNN.md`)
