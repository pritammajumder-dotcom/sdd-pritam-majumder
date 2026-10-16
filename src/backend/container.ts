import { InMemorySubmissionIdempotencyRepository } from './repositories/idempotency.repository';
import { InMemoryTransferRequestRepository } from './repositories/transfer-request.repository';
import { InMemoryOutboxRepository } from './repositories/outbox.repository';
import { EmployeeLockManager } from './utils/employee-lock';

/**
 * Shared in-memory singletons for local runtime and integration testing.
 */
export const defaultIdempotencyRepo = new InMemorySubmissionIdempotencyRepository();
export const defaultTransferRepo = new InMemoryTransferRequestRepository();
export const defaultOutboxRepo = new InMemoryOutboxRepository();
export const defaultLockManager = new EmployeeLockManager();
