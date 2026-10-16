import { v4 as uuidv4 } from 'uuid';
import { SubmissionService } from '../../../src/backend/services/submission.service';
import { CreateTransferPayload } from '../../../src/backend/types';
import { Barrier } from '../helpers/barrier';

/**
 * internal-transfer-journey.IT-01: 10 parallel API01 calls, same key, same payload.
 * Maps to: internal-transfer-journey.AC-N41, AC-N03
 *
 * internal-transfer-journey.IT-03: 2 parallel API01 calls, same key, different payloads.
 * Maps to: internal-transfer-journey.AC-N40
 */
describe('IT-01 & IT-03 — Submission Idempotency Concurrency & Conflict Tests', () => {
  let submissionService: SubmissionService;

  beforeAll(() => {
    submissionService = new SubmissionService();
  });

  describe('IT-01: 10 parallel submissions with same key and same payload (AC-N41)', () => {
    it('should create exactly 1 request and return identical ID across all 10 responses', async () => {
      const employeeId = uuidv4();
      const idempotencyKey = uuidv4();
      const payload: CreateTransferPayload = {
        proposedDepartmentId: 'DEP-ENG',
        proposedLocationId: 'LOC-NY',
        proposedRoleId: 'ROLE-SSE',
        effectiveDate: '2026-12-01',
        reason: 'Career development internal transfer'
      };

      const concurrencyCount = 10;
      const barrier = new Barrier(concurrencyCount);

      const promises = Array.from({ length: concurrencyCount }, async () => {
        await barrier.wait();
        return submissionService.submitTransferRequest(employeeId, idempotencyKey, payload);
      });

      const results = await Promise.all(promises);

      // Verify all 10 return HTTP 201
      expect(results).toHaveLength(10);
      results.forEach((res) => {
        expect(res.statusCode).toBe(201);
      });

      // Exactly 1 initial 201 and 9 replays
      const initialCreations = results.filter((r) => !r.isReplay);
      const replays = results.filter((r) => r.isReplay);
      expect(initialCreations).toHaveLength(1);
      expect(replays).toHaveLength(9);

      // Verify all responses carry the exact same transfer request ID
      const targetId = initialCreations[0].body.id;
      expect(targetId).toBeDefined();
      results.forEach((res) => {
        expect(res.body.id).toBe(targetId);
      });
    });
  });

  describe('IT-03: 2 parallel submissions with same key and conflicting payloads (AC-N40)', () => {
    it('should allow one 201 and return 422 IDEMPOTENCY_KEY_REUSED for the conflicting payload', async () => {
      const employeeId = uuidv4();
      const idempotencyKey = uuidv4();

      const payloadA: CreateTransferPayload = {
        proposedDepartmentId: 'DEP-ENG',
        proposedLocationId: 'LOC-NY',
        proposedRoleId: 'ROLE-SSE',
        effectiveDate: '2026-12-01',
        reason: 'Transfer Plan A'
      };

      const payloadB: CreateTransferPayload = {
        proposedDepartmentId: 'DEP-PROD',
        proposedLocationId: 'LOC-SF',
        proposedRoleId: 'ROLE-PM',
        effectiveDate: '2026-12-15',
        reason: 'Conflicting Transfer Plan B'
      };

      const barrier = new Barrier(2);

      const [resA, resB] = await Promise.all([
        (async () => {
          await barrier.wait();
          return submissionService.submitTransferRequest(employeeId, idempotencyKey, payloadA);
        })(),
        (async () => {
          await barrier.wait();
          return submissionService.submitTransferRequest(employeeId, idempotencyKey, payloadB);
        })()
      ]);

      const statusCodes = [resA.statusCode, resB.statusCode].sort();
      expect(statusCodes).toEqual([201, 422]);

      const conflictResponse = resA.statusCode === 422 ? resA : resB;
      expect(conflictResponse.body.error).toBe('IDEMPOTENCY_KEY_REUSED');
    });
  });
});
