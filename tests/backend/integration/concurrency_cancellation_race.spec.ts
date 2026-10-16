import { v4 as uuidv4 } from 'uuid';
import { SubmissionService } from '../../../src/backend/services/submission.service';
import { ApprovalService } from '../../../src/backend/services/approval.service';
import { CreateTransferPayload } from '../../../src/backend/types';
import { Barrier } from '../helpers/barrier';

/**
 * internal-transfer-journey.IT-05: T14 (CancellationPending transition) in parallel with new submission.
 * Maps to: internal-transfer-journey.AC-N53
 *
 * internal-transfer-journey.IT-06: T17 (Cancellation completed) in parallel with HR approval on new request.
 * Maps to: internal-transfer-journey.AC-N54, AC-P29
 */
describe('IT-05 & IT-06 — Concurrency Cancellation & HR Approval Race Conditions', () => {
  let submissionService: SubmissionService;
  let approvalService: ApprovalService;

  beforeAll(() => {
    submissionService = new SubmissionService();
    approvalService = new ApprovalService();
  });

  describe('IT-05: T14 transition concurrent with new submission under employee row lock (AC-N53)', () => {
    it('should result in either 409 conflict or 201 with BlockedByPriorCancellation; never unflagged active row', async () => {
      const employeeId = uuidv4();
      const idempotencyKey = uuidv4();
      const payload: CreateTransferPayload = {
        proposedDepartmentId: 'DEP-FIN',
        proposedLocationId: 'LOC-NY',
        proposedRoleId: 'ROLE-ANALYST',
        effectiveDate: '2026-12-01',
        reason: 'Race test T14 vs submission'
      };

      await submissionService.seedRequest({
        employeeId,
        status: 'Submitted'
      });

      const barrier = new Barrier(2);

      const [submissionResult] = await Promise.all([
        (async () => {
          await barrier.wait();
          return submissionService.submitTransferRequest(employeeId, idempotencyKey, payload);
        })(),
        (async () => {
          await barrier.wait();
          return submissionService.transitionToCancellationPending(employeeId);
        })()
      ]);

      expect([201, 409]).toContain(submissionResult.statusCode);
      if (submissionResult.statusCode === 201) {
        expect(submissionResult.body.flags).toContain('BlockedByPriorCancellation');
      }
    });
  });

  describe('IT-06: T17 transition concurrent with HR Approval (AC-N54, AC-P29)', () => {
    it('should refuse approval with D68 error while prior is CancellationPending, or succeed only after T17 commits', async () => {
      const newRequestId = uuidv4();
      const hrApproverId = uuidv4();
      const employeeId = uuidv4();
      const priorRequest = await approvalService.seedRequest({
        employeeId,
        status: 'CancellationPending'
      });
      await approvalService.seedRequest({
        id: newRequestId,
        employeeId,
        status: 'PendingHRValidation',
        blockedByPriorCancellation: true
      });

      const barrier = new Barrier(2);

      const [approvalResult] = await Promise.all([
        (async () => {
          await barrier.wait();
          return approvalService.approveTransferRequest(newRequestId, hrApproverId);
        })(),
        (async () => {
          await barrier.wait();
          return approvalService.completeCancellation(priorRequest.id);
        })()
      ]);

      expect([200, 409]).toContain(approvalResult.statusCode);
      if (approvalResult.statusCode === 409) {
        expect(approvalResult.body.error).toContain('D68');
      }
    });
  });
});
