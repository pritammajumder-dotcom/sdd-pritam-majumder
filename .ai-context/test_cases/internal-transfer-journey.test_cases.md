# Test Cases: Employee Internal Transfer Digital Journey

## Derived From Spec
.ai-context/specs/internal-transfer-journey.spec.md

## Acceptance Test Scenarios

### internal-transfer-journey.TC01 — Valid Request Submission
- **Maps to AC:** internal-transfer-journey.AC1
- **Given:** Authenticated employee with no active transfer request
- **When:** Submits a transfer request with valid data and effective date 14+ days away
- **Then:** Request is saved in `PendingManagerApproval` status
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC02 — Invalid Effective Date
- **Maps to AC:** internal-transfer-journey.AC1
- **Given:** Authenticated employee with no active transfer request
- **When:** Submits a request with effective date < 14 days away
- **Then:** System rejects request with validation error
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC03 — Active Request Rejection
- **Maps to AC:** internal-transfer-journey.AC2
- **Given:** Employee with an active non-terminal request
- **When:** Attempts to submit a new request
- **Then:** System rejects request with validation error
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC04 — Withdraw Request
- **Maps to AC:** internal-transfer-journey.AC3
- **Given:** Employee with an active non-terminal request
- **When:** Employee withdraws the request
- **Then:** Request status changes to `Withdrawn`
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC05 — Manager Approval
- **Maps to AC:** internal-transfer-journey.AC4
- **Given:** Request in `PendingManagerApproval`
- **When:** Manager approves the request
- **Then:** Status changes to `PendingHRValidation`
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC06 — Manager Rejection
- **Maps to AC:** internal-transfer-journey.AC5
- **Given:** Request in `PendingManagerApproval`
- **When:** Manager rejects the request
- **Then:** Status changes to `RejectedByManager` and is terminal
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC07 — HR Approval (Eligible)
- **Maps to AC:** internal-transfer-journey.AC6
- **Given:** Request in `PendingHRValidation` and employee meets all eligibility criteria
- **When:** HR approves the request
- **Then:** Status changes to `PendingFulfilment` and organizational data is updated
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC08 — HR Rejection (Tenure < 6 months)
- **Maps to AC:** internal-transfer-journey.AC7
- **Given:** Request in `PendingHRValidation` but employee has < 6 months tenure
- **When:** HR attempts to approve/validate
- **Then:** Status changes to `RejectedByHR` citing the tenure rule
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC09 — HR Rejection (Active Disciplinary Case)
- **Maps to AC:** internal-transfer-journey.AC7
- **Given:** Request in `PendingHRValidation` but employee has an open disciplinary case
- **When:** HR attempts to approve/validate
- **Then:** Status changes to `RejectedByHR` citing the disciplinary rule
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC10 — HR Rejection (Transfer within 6 months)
- **Maps to AC:** internal-transfer-journey.AC7
- **Given:** Request in `PendingHRValidation` but employee transferred within last 6 months
- **When:** HR attempts to approve/validate
- **Then:** Status changes to `RejectedByHR` citing the cooldown rule
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC11 — Fulfilment Completion
- **Maps to AC:** internal-transfer-journey.AC8
- **Given:** Request in `PendingFulfilment`
- **When:** Payroll, IT, and Facilities all complete their actions
- **Then:** Status changes to `Completed`
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC12 — Employee View
- **Maps to AC:** internal-transfer-journey.AC9
- **Given:** Authenticated employee
- **When:** Fetches request status
- **Then:** Current status and pending actions are returned accurately
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC13 — SLA Reminder (Manager)
- **Maps to AC:** internal-transfer-journey.AC10
- **Given:** Request in `PendingManagerApproval` for >5 business days
- **When:** The SLA is evaluated
- **Then:** Reminder notification sent to skip-level manager, status remains `PendingManagerApproval`
- **Automated Test File:** tests/backend/modules/transfers/sla.service.spec.ts

### internal-transfer-journey.TC14 — SLA Breach (Fulfilment)
- **Maps to AC:** internal-transfer-journey.AC11
- **Given:** Fulfilment stakeholder item pending >3 business days
- **When:** The SLA is evaluated
- **Then:** Stakeholder sub-status changes to `Delayed` and reminder sent, request status unchanged
- **Automated Test File:** tests/backend/modules/transfers/sla.service.spec.ts

### internal-transfer-journey.TC15 — Partial Fulfilment Completion
- **Maps to AC:** internal-transfer-journey.AC12
- **Given:** Request in `PendingFulfilment` with partial stakeholder completions
- **When:** Status is queried
- **Then:** Request remains `PendingFulfilment`, sub-statuses reflect completion state
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC16 — Manager Views Queue
- **Maps to AC:** internal-transfer-journey.AC13
- **Given:** Authenticated Manager
- **When:** Requests their approvals queue
- **Then:** Returns only requests where they are the reporting manager
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC17 — HR Views Queue
- **Maps to AC:** internal-transfer-journey.AC14
- **Given:** Authenticated HR-role user
- **When:** Requests HR validation queue
- **Then:** Returns all org-wide `PendingHRValidation` requests
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC18 — In-App Notifications
- **Maps to AC:** internal-transfer-journey.AC15
- **Given:** A request transitions state
- **When:** The transition occurs
- **Then:** In-app notification generated for relevant party
- **Automated Test File:** tests/backend/modules/notifications/notifications.service.spec.ts

### internal-transfer-journey.TC19 — Unauthorized Manager Approval
- **Maps to AC:** internal-transfer-journey.AC16
- **Given:** Authenticated user without Manager relationship
- **When:** Attempts to approve/reject the request
- **Then:** Action is denied (403)
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC20 — Cross-Employee Data Access
- **Maps to AC:** internal-transfer-journey.AC17
- **Given:** Authenticated Employee
- **When:** Attempts to view or act on another employee's request
- **Then:** Access is denied (403)
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts

### internal-transfer-journey.TC21 — Mismatched Session Role
- **Maps to AC:** internal-transfer-journey.AC18
- **Given:** Authenticated user attempts approval
- **When:** Session role does not match request's current pending stage
- **Then:** Request is rejected (403)
- **Automated Test File:** tests/backend/modules/transfers/transfers.controller.spec.ts
