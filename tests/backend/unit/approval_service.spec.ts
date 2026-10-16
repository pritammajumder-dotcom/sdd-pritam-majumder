import { v4 as uuidv4 } from 'uuid';
import { ApprovalService } from '../../../src/backend/services/approval.service';
import { InMemoryTransferRequestRepository } from '../../../src/backend/repositories/transfer-request.repository';
import { InMemoryOutboxRepository } from '../../../src/backend/repositories/outbox.repository';
import { EmployeeLockManager } from '../../../src/backend/utils/employee-lock';

describe('Unit Tests: ApprovalService & Transactional Outbox (AC-P06, AC-P29, AC-N54, D68)', () => {
  let transferRepo: InMemoryTransferRequestRepository;
  let outboxRepo: InMemoryOutboxRepository;
  let lockManager: EmployeeLockManager;
  let approvalService: ApprovalService;

  beforeEach(() => {
    transferRepo = new InMemoryTransferRequestRepository();
    outboxRepo = new InMemoryOutboxRepository();
    lockManager = new EmployeeLockManager();
    approvalService = new ApprovalService(transferRepo, outboxRepo, lockManager);
  });

  it('should return 404 when approving a non-existent transfer request', async () => {
    const result = await approvalService.approveTransferRequest(uuidv4(), uuidv4());
    expect(result.statusCode).toBe(404);
    expect(result.body.error).toBe('REQUEST_NOT_FOUND');
  });

  it('should refuse approval with D68 error when another request of the employee is in CancellationPending (AC-N54)', async () => {
    const employeeId = uuidv4();
    const approverId = uuidv4();

    // Prior request undergoing cancellation
    await approvalService.seedRequest({
      employeeId,
      status: 'CancellationPending'
    });

    // New request awaiting HR validation
    const newRequest = await approvalService.seedRequest({
      employeeId,
      status: 'PendingHRValidation',
      blockedByPriorCancellation: true
    });

    const result = await approvalService.approveTransferRequest(newRequest.id, approverId);

    expect(result.statusCode).toBe(409);
    expect(result.body.error).toBe('D68_BLOCKED_BY_PRIOR_CANCELLATION');
    expect(result.body.message).toContain("earlier transfer's cancellation is complete");

    // Ensure outbox was NOT written
    const outboxEvents = await outboxRepo.findByAggregateId(newRequest.id);
    expect(outboxEvents).toHaveLength(0);
  });

  it('should successfully approve and write transactional outbox event when no cancellation is pending (AC-P06)', async () => {
    const employeeId = uuidv4();
    const approverId = uuidv4();

    const request = await approvalService.seedRequest({
      employeeId,
      status: 'PendingHRValidation'
    });

    const result = await approvalService.approveTransferRequest(request.id, approverId);

    expect(result.statusCode).toBe(200);
    expect(result.body.id).toBe(request.id);
    expect(result.body.status).toBe('PendingFulfilment');

    // Verify request status in repository
    const updated = await transferRepo.findById(request.id);
    expect(updated?.status).toBe('PendingFulfilment');
    expect(updated?.assignedApproverId).toBe(approverId);
    expect(updated?.blockedByPriorCancellation).toBe(false);

    // Verify transactional outbox row
    const outboxEvents = await outboxRepo.findByAggregateId(request.id);
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0].eventType).toBe('TransferRequestApproved');
    expect(outboxEvents[0].status).toBe('PENDING');
    expect(outboxEvents[0].payload.requestId).toBe(request.id);
    expect(outboxEvents[0].payload.approverId).toBe(approverId);
  });

  it('should clear BlockedByPriorCancellation flag when completeCancellation (T17) runs (AC-P29)', async () => {
    const employeeId = uuidv4();

    const prior = await approvalService.seedRequest({
      employeeId,
      status: 'CancellationPending'
    });

    const active = await approvalService.seedRequest({
      employeeId,
      status: 'PendingHRValidation',
      blockedByPriorCancellation: true
    });

    expect(active.blockedByPriorCancellation).toBe(true);

    // Complete cancellation of prior
    await approvalService.completeCancellation(prior.id);

    const updatedPrior = await transferRepo.findById(prior.id);
    expect(updatedPrior?.status).toBe('Cancelled');

    const updatedActive = await transferRepo.findById(active.id);
    expect(updatedActive?.blockedByPriorCancellation).toBe(false);
  });
});
