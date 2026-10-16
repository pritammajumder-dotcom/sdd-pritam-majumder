import { v4 as uuidv4 } from 'uuid';
import { InMemorySubmissionIdempotencyRepository } from '../../../src/backend/repositories/idempotency.repository';
import { SubmissionService } from '../../../src/backend/services/submission.service';
import { SubmissionIdempotency, CreateTransferPayload } from '../../../src/backend/types';

describe('Unit Tests: SubmissionIdempotencyRepository & AC-N39 Validation', () => {
  let repository: InMemorySubmissionIdempotencyRepository;
  let service: SubmissionService;

  beforeEach(() => {
    repository = new InMemorySubmissionIdempotencyRepository();
    service = new SubmissionService(repository);
  });

  describe('Repository Operations & Expiration', () => {
    it('should store and retrieve an idempotency record', async () => {
      const record: SubmissionIdempotency = {
        employeeId: uuidv4(),
        operation: 'CreateTransfer',
        idempotencyKey: uuidv4(),
        payloadHash: 'a'.repeat(64),
        transferRequestId: uuidv4(),
        responseStatus: 201,
        responseBody: { id: 'req-1', status: 'Submitted' },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000)
      };

      await repository.save(record);
      const found = await repository.find(record.employeeId, record.operation, record.idempotencyKey);

      expect(found).not.toBeNull();
      expect(found?.transferRequestId).toBe(record.transferRequestId);
    });

    it('should return null and purge expired records past expiresAt (24h retention)', async () => {
      const record: SubmissionIdempotency = {
        employeeId: uuidv4(),
        operation: 'CreateTransfer',
        idempotencyKey: uuidv4(),
        payloadHash: 'b'.repeat(64),
        transferRequestId: uuidv4(),
        responseStatus: 201,
        responseBody: { id: 'req-expired' },
        createdAt: new Date(Date.now() - 90000000),
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      await repository.save(record);

      const found = await repository.find(record.employeeId, record.operation, record.idempotencyKey);
      expect(found).toBeNull();

      const purged = await repository.purgeExpired();
      expect(purged).toBe(0); // Already removed on access
    });
  });

  describe('AC-N39 Validation in SubmissionService', () => {
    const validPayload: CreateTransferPayload = {
      proposedDepartmentId: 'DEP01',
      proposedLocationId: 'LOC01',
      proposedRoleId: 'ROL01',
      effectiveDate: '2026-12-01',
      reason: 'Valid test'
    };

    it('should return 400 IDEMPOTENCY_KEY_REQUIRED when Idempotency-Key is missing', async () => {
      const result = await service.submitTransferRequest(uuidv4(), '', validPayload);

      expect(result.statusCode).toBe(400);
      expect(result.body.error).toBe('IDEMPOTENCY_KEY_REQUIRED');
      expect(result.body.message).toBe('A valid Idempotency-Key header is required.');
    });

    it('should return 400 IDEMPOTENCY_KEY_REQUIRED when Idempotency-Key is not a UUID v4', async () => {
      const result = await service.submitTransferRequest(uuidv4(), 'not-a-valid-uuid-v4', validPayload);

      expect(result.statusCode).toBe(400);
      expect(result.body.error).toBe('IDEMPOTENCY_KEY_REQUIRED');
      expect(result.body.message).toBe('A valid Idempotency-Key header is required.');
    });
  });
});
