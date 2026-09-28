# Spec-Derived Test Cases: Employee Internal Transfer Digital Journey

## Linked Spec
.ai-context/specs/internal-transfer-journey.spec.md

## Unit Test Cases

| Test ID | Maps to AC | Scenario | Expected |
|---|---|---|---|
| internal-transfer-journey.UT01 | AC01 | Eligible employee submits valid request | 201 Created, status `PendingManagerApproval` |
| internal-transfer-journey.UT02 | AC02 | Manager approves request | Status changes to `PendingHRValidation` |
| internal-transfer-journey.UT03 | AC03 | HR approves request | Status `PendingFulfilment`, items dispatched |
| internal-transfer-journey.UT04 | AC04 | All adapters complete | Items `Completed`, request stays `PendingFulfilment` until all done |
| internal-transfer-journey.UT05 | AC05 | Employee fetches request status | Summary shows "X of 3 complete" |
| internal-transfer-journey.UT06 | AC06 | Effective date arrives at 00:00 with all items complete | Status `Completed`, DB profile updated |
| internal-transfer-journey.UT07 | AC07 | Manager rejects request | Status `RejectedByManager` |
| internal-transfer-journey.UT08 | AC08 | HR rejects failing request | Status `RejectedByHR` |
| internal-transfer-journey.UT09 | AC09 | Employee withdraws before HR approval | Status `Withdrawn` |
| internal-transfer-journey.UT10 | AC10 | Manager SLA breaches 5 days | Flag `Delayed`, reminder sent to Manager/Skip-level |
| internal-transfer-journey.UT11 | AC11 | Effective date < 14 days | 400 Bad Request |
| internal-transfer-journey.UT12 | AC12 | Employee has active request | 409 Conflict |
| internal-transfer-journey.UT13 | AC13 | Duplicate submission idempotency | 201 Created (Original response returned) |
| internal-transfer-journey.UT14 | AC14 | Employee fetches another's request | 403 Forbidden |
| internal-transfer-journey.UT15 | AC15 | Employee approves own request | 403 Forbidden |
| internal-transfer-journey.UT16 | AC16 | Manager approves for non-report | 403 Forbidden |
| internal-transfer-journey.UT17 | AC17 | Non-HR user calls HR approval | 403 Forbidden |
| internal-transfer-journey.UT18 | AC18 | Payroll updates IT item | 403 Forbidden |
| internal-transfer-journey.UT19 | AC19 | Adapter timeout | Item status `Retrying` |
| internal-transfer-journey.UT20 | AC20 | Adapter 4xx response | Item status `Failed` (No retry) |
| internal-transfer-journey.UT21 | AC21 | Adapter invalid response | Item status `Retrying` |
| internal-transfer-journey.UT22 | AC22 | Duplicate adapter completion | 200 OK (Ignored subsequent) |
| internal-transfer-journey.UT23 | AC23 | Adapter unable to fulfil | Item `UnableToFulfil`, Request `FulfilmentFailed` |
| internal-transfer-journey.UT24 | AC24 | Invalid state transition (e.g., withdraw after approve) | 400 Bad Request |
| internal-transfer-journey.UT25 | AC25 | Action on terminal request | 400 Bad Request |
| internal-transfer-journey.UT26 | AC26 | Employee withdraw after HR approval | 400 Bad Request |
| internal-transfer-journey.UT27 | AC27 | Proposed == Current assignment | 400 Bad Request |
| internal-transfer-journey.UT28 | AC28 | Invalid combo submitted | 400 Bad Request |
| internal-transfer-journey.UT29 | AC29 | Concurrent DB updates | 409 Conflict (Optimistic locking fail) |
| internal-transfer-journey.UT30 | AC30 | Effective date arrives but items incomplete | Request flagged "Effective date missed" |
| internal-transfer-journey.UT31 | AC31 | Employee deactivated mid-flight | Status `Cancelled`, reversals sent |
| internal-transfer-journey.UT32 | AC32 | Master data invalid at HR approval | 400 Bad Request (Must reject) |
