import { v4 as uuidv4 } from 'uuid';
import { SubmissionService } from '../../../src/backend/services/submission.service';
import { CreateTransferPayload } from '../../../src/backend/types';
import { Barrier } from '../helpers/barrier';

/**
 * internal-transfer-journey.IT-02: 10 parallel API01 calls, different keys.
 * Maps to: internal-transfer-journey.AC-N42, AC-N03
 *
 * internal-transfer-journey.IT-04: Earlier request CancellationPending; 10 parallel submissions with different keys.
 * Maps to: internal-transfer-journey.AC-N50
 */
describe('IT-02 & IT-04 — Parallel Submissions Active Set & CancellationPending Tests', () => {
  let submissionService: SubmissionService;

  beforeAll(() => {
    submissionService = new SubmissionService();
  });

  describe('IT-02: 10 parallel submissions with different keys (AC-N42, AC-N03)', () => {
    it('should allow exactly one 201 and nine 409 conflicts with zero 500 errors', async () => {
      const employeeId = uuidv4();
      const concurrencyCount = 10;
      const barrier = new Barrier(concurrencyCount);

      const promises = Array.from({ length: concurrencyCount }, async (_, idx) => {
        const payload: CreateTransferPayload = {
          proposedDepartmentId: `DEP-${idx}`,
          proposedLocationId: 'LOC-NY',
          proposedRoleId: 'ROLE-DEV',
          effectiveDate: '2026-12-01',
          reason: `Attempt ${idx}`
        };
        await barrier.wait();
        return submissionService.submitTransferRequest(employeeId, uuidv4(), payload);
      });

      const results = await Promise.all(promises);

      const successResults = results.filter((r) => r.statusCode === 201);
      const conflictResults = results.filter((r) => r.statusCode === 409);
      const serverErrorResults = results.filter((r) => r.statusCode === 500);

      expect(successResults).toHaveLength(1);
      expect(conflictResults).toHaveLength(9);
      expect(serverErrorResults).toHaveLength(0);

      conflictResults.forEach((r) => {
        expect(r.body.error).toContain('You already have an active transfer request');
      });
    });
  });

  describe('IT-04: 10 parallel submissions while earlier request is CancellationPending (AC-N50)', () => {
    it('should allow exactly one 201 with BlockedByPriorCancellation and nine 409 conflicts', async () => {
      const employeeId = uuidv4();
      await submissionService.seedRequest({
        employeeId,
        status: 'CancellationPending'
      });
      const concurrencyCount = 10;
      const barrier = new Barrier(concurrencyCount);

      const promises = Array.from({ length: concurrencyCount }, async (_, idx) => {
        const payload: CreateTransferPayload = {
          proposedDepartmentId: `DEP-NEW-${idx}`,
          proposedLocationId: 'LOC-LON',
          proposedRoleId: 'ROLE-LEAD',
          effectiveDate: '2026-12-15',
          reason: `Submission during cancellation ${idx}`
        };
        await barrier.wait();
        return submissionService.submitTransferRequest(employeeId, uuidv4(), payload);
      });

      const results = await Promise.all(promises);

      const successResults = results.filter((r) => r.statusCode === 201);
      const conflictResults = results.filter((r) => r.statusCode === 409);

      expect(successResults).toHaveLength(1);
      expect(conflictResults).toHaveLength(9);

      // The winning request must have BlockedByPriorCancellation flag set
      expect(successResults[0].body.flags).toContain('BlockedByPriorCancellation');
    });
  });
});
