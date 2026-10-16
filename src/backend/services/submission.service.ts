import { v4 as uuidv4 } from 'uuid';
import {
  CreateTransferPayload,
  SubmissionResult,
  SubmissionResponseData,
  SubmissionIdempotency,
  TransferRequest,
  RequestStatus
} from '../types';
import {
  calculatePayloadHash,
  isValidUuidV4
} from '../utils/fingerprint';
import {
  ISubmissionIdempotencyRepository,
  InMemorySubmissionIdempotencyRepository
} from '../repositories/idempotency.repository';
import {
  ITransferRequestRepository,
  InMemoryTransferRequestRepository
} from '../repositories/transfer-request.repository';
import { EmployeeLockManager } from '../utils/employee-lock';
import {
  defaultIdempotencyRepo,
  defaultTransferRepo,
  defaultLockManager
} from '../container';

export class SubmissionService {
  constructor(
    private idempotencyRepo: ISubmissionIdempotencyRepository = defaultIdempotencyRepo,
    private transferRepo: ITransferRequestRepository = defaultTransferRepo,
    private lockManager: EmployeeLockManager = defaultLockManager
  ) {}

  /**
   * Helper to seed requests for testing scenarios (e.g. earlier CancellationPending or active requests).
   */
  async seedRequest(params: {
    employeeId: string;
    status: RequestStatus;
    proposedEffectiveDate?: string;
  }): Promise<TransferRequest> {
    const request: TransferRequest = {
      id: uuidv4(),
      employeeId: params.employeeId,
      status: params.status,
      blockedByPriorCancellation: false,
      version: 1,
      proposedDepartmentId: 'DEP-SEED',
      proposedLocationId: 'LOC-SEED',
      proposedRoleId: 'ROLE-SEED',
      proposedEffectiveDate: params.proposedEffectiveDate || '2026-11-01',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.transferRepo.save(request);
    return request;
  }

  /**
   * Transition an employee's active request to CancellationPending (simulating T14 transition).
   */
  async transitionToCancellationPending(employeeId: string): Promise<TransferRequest | null> {
    return this.lockManager.runExclusive(employeeId, async () => {
      const active = await this.transferRepo.findActiveByEmployeeId(employeeId);
      if (!active) {
        // Create one in CancellationPending
        return this.seedRequest({ employeeId, status: 'CancellationPending' });
      }
      return this.transferRepo.updateStatus(active.id, 'CancellationPending');
    });
  }

  /**
   * API01 — Submit Internal Transfer Request with Idempotency & Concurrency Guarantees.
   * Conforms to INT SDD Spec lines 71-92:
   * - AC-N39: Idempotency-Key validation (UUID v4 required)
   * - AC-N40: Reused key with different payload -> 422 IDEMPOTENCY_KEY_REUSED
   * - AC-N41: Reused key with identical payload -> 201 Replay (isReplay: true, same ID)
   * - AC-N42 / AC-N03: Single active request constraint -> 409
   * - AC-N50: Earlier CancellationPending -> 201 with BlockedByPriorCancellation flag
   */
  async submitTransferRequest(
    employeeId: string,
    idempotencyKey: string,
    payload: CreateTransferPayload
  ): Promise<SubmissionResult> {
    const operation = 'CreateTransfer';

    // 1. AC-N39: Validate Idempotency-Key header is present and valid UUID v4
    if (!isValidUuidV4(idempotencyKey)) {
      return {
        statusCode: 400,
        body: {
          error: 'IDEMPOTENCY_KEY_REQUIRED',
          message: 'A valid Idempotency-Key header is required.'
        }
      };
    }

    // 2. Canonical payload fingerprinting (SHA-256)
    const payloadHash = calculatePayloadHash(payload);

    // 3. Fast-path check: Existing committed idempotency record
    const existing = await this.idempotencyRepo.find(employeeId, operation, idempotencyKey);
    if (existing) {
      if (existing.payloadHash === payloadHash) {
        return {
          statusCode: existing.responseStatus,
          isReplay: true,
          body: existing.responseBody as SubmissionResponseData
        };
      }
      return {
        statusCode: 422,
        body: {
          error: 'IDEMPOTENCY_KEY_REUSED',
          message: 'This idempotency key was already used for a different submission.'
        }
      };
    }

    // 4. In-flight synchronization for duplicate keys
    let lock: { release: () => void; isNew: boolean };
    try {
      lock = await this.idempotencyRepo.acquireLock(employeeId, operation, idempotencyKey, 5000);
    } catch (err: any) {
      if (err.message === 'IDEMPOTENCY_LOCK_TIMEOUT') {
        return {
          statusCode: 409,
          body: {
            error: 'IDEMPOTENCY_IN_PROGRESS',
            message: 'This submission is still being processed. Please retry.'
          }
        };
      }
      throw err;
    }

    // If another concurrent request with the same key was already in flight, wait and replay
    if (!lock.isNew) {
      const resolved = await this.idempotencyRepo.find(employeeId, operation, idempotencyKey);
      if (resolved) {
        if (resolved.payloadHash === payloadHash) {
          return {
            statusCode: resolved.responseStatus,
            isReplay: true,
            body: resolved.responseBody as SubmissionResponseData
          };
        }
        return {
          statusCode: 422,
          body: {
            error: 'IDEMPOTENCY_KEY_REUSED',
            message: 'This idempotency key was already used for a different submission.'
          }
        };
      }
    }

    // 5. Winning execution path: Serialize under per-employee lock
    try {
      return await this.lockManager.runExclusive(employeeId, async () => {
        // Double check after acquiring employee lock in case another key committed
        const activeRequest = await this.transferRepo.findActiveByEmployeeId(employeeId);
        if (activeRequest) {
          // Spec line 89: 409 You already have an active transfer request
          return {
            statusCode: 409,
            body: {
              error: 'You already have an active transfer request'
            }
          };
        }

        // Check if employee has an earlier request in CancellationPending (D68, AC-N50)
        const cancellationPending = await this.transferRepo.findCancellationPendingByEmployeeId(employeeId);
        const flags: string[] = [];
        if (cancellationPending) {
          flags.push('BlockedByPriorCancellation');
        }

        // Create the TransferRequest row
        const requestId = uuidv4();
        const transferRequest: TransferRequest = {
          id: requestId,
          employeeId,
          status: 'Submitted',
          blockedByPriorCancellation: Boolean(cancellationPending),
          version: 1,
          proposedDepartmentId: payload.proposedDepartmentId,
          proposedLocationId: payload.proposedLocationId,
          proposedRoleId: payload.proposedRoleId,
          proposedEffectiveDate: payload.effectiveDate,
          reason: payload.reason || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.transferRepo.save(transferRequest);

        // Prepare response body
        const responseBody: SubmissionResponseData = {
          id: requestId,
          status: 'Submitted',
          proposedEffectiveDate: payload.effectiveDate,
          ...(flags.length > 0 ? { flags } : {})
        };

        // Store idempotency record (24 hour retention)
        const idempotencyRecord: SubmissionIdempotency = {
          employeeId,
          operation,
          idempotencyKey,
          payloadHash,
          transferRequestId: requestId,
          responseStatus: 201,
          responseBody: responseBody as Record<string, unknown>,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };

        await this.idempotencyRepo.save(idempotencyRecord);

        return {
          statusCode: 201,
          isReplay: false,
          body: responseBody
        };
      });
    } finally {
      lock.release();
    }
  }
}
