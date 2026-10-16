import { v4 as uuidv4 } from 'uuid';
import {
  ApprovalResult,
  TransferRequest,
  RequestStatus,
  OutboxMessage
} from '../types';
import {
  ITransferRequestRepository
} from '../repositories/transfer-request.repository';
import {
  IOutboxRepository
} from '../repositories/outbox.repository';
import { EmployeeLockManager } from '../utils/employee-lock';
import {
  defaultTransferRepo,
  defaultOutboxRepo,
  defaultLockManager
} from '../container';

export class ApprovalService {
  constructor(
    private transferRepo: ITransferRequestRepository = defaultTransferRepo,
    private outboxRepo: IOutboxRepository = defaultOutboxRepo,
    private lockManager: EmployeeLockManager = defaultLockManager
  ) {}

  /**
   * Helper to seed requests for testing approval and race scenarios.
   */
  async seedRequest(params: {
    id?: string;
    employeeId: string;
    status: RequestStatus;
    blockedByPriorCancellation?: boolean;
    proposedEffectiveDate?: string;
  }): Promise<TransferRequest> {
    const request: TransferRequest = {
      id: params.id || uuidv4(),
      employeeId: params.employeeId,
      status: params.status,
      blockedByPriorCancellation: params.blockedByPriorCancellation ?? false,
      version: 1,
      proposedDepartmentId: 'DEP-SEED',
      proposedLocationId: 'LOC-SEED',
      proposedRoleId: 'ROLE-SEED',
      proposedEffectiveDate: params.proposedEffectiveDate || '2026-12-01',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.transferRepo.save(request);
    return request;
  }

  /**
   * T17 transition: Completes cancellation of an earlier request under the employee lock.
   * Clears the BlockedByPriorCancellation flag on other requests if no other request remains in CancellationPending.
   */
  async completeCancellation(requestId: string): Promise<TransferRequest | null> {
    const req = await this.transferRepo.findById(requestId);
    if (!req) return null;

    return this.lockManager.runExclusive(req.employeeId, async () => {
      // Transition earlier request to Cancelled
      const updated = await this.transferRepo.updateStatus(requestId, 'Cancelled');

      // Check if any other request of the employee is still in CancellationPending
      const remainingCancellation = await this.transferRepo.findCancellationPendingByEmployeeId(req.employeeId);
      if (!remainingCancellation) {
        await this.transferRepo.clearCancellationPendingFlag(req.employeeId);
      }

      return updated;
    });
  }

  /**
   * API06 — POST /api/transfers/{id}/hr-decision (Approve)
   * Enforces D68 protocol:
   * - Serializes under per-employee row lock
   * - Refuses with D68 error if any other request of the employee is in CancellationPending
   * - Transitions status to PendingFulfilment
   * - Writes outbox event in the same atomic transaction
   */
  async approveTransferRequest(
    requestId: string,
    approverId: string
  ): Promise<ApprovalResult> {
    const request = await this.transferRepo.findById(requestId);
    if (!request) {
      return {
        statusCode: 404,
        body: {
          error: 'REQUEST_NOT_FOUND',
          message: 'Transfer request not found'
        }
      };
    }

    return this.lockManager.runExclusive(request.employeeId, async () => {
      // Re-read request under employee lock
      const currentRequest = await this.transferRepo.findById(requestId);
      if (!currentRequest) {
        return {
          statusCode: 404,
          body: {
            error: 'REQUEST_NOT_FOUND',
            message: 'Transfer request not found'
          }
        };
      }

      // Check D68: Does another request of the employee exist in CancellationPending?
      const priorPending = await this.transferRepo.findCancellationPendingByEmployeeId(currentRequest.employeeId);
      if (priorPending && priorPending.id !== requestId) {
        return {
          statusCode: 409,
          body: {
            error: 'D68_BLOCKED_BY_PRIOR_CANCELLATION',
            message: "Approval blocked until the earlier transfer's cancellation is complete."
          }
        };
      }

      // Transition to PendingFulfilment
      currentRequest.status = 'PendingFulfilment';
      currentRequest.assignedApproverId = approverId;
      currentRequest.blockedByPriorCancellation = false;
      currentRequest.updatedAt = new Date();
      await this.transferRepo.save(currentRequest);

      // Write transactional outbox row for downstream fulfilment dispatch
      const outboxMessage: OutboxMessage = {
        id: uuidv4(),
        aggregateType: 'TransferRequest',
        aggregateId: requestId,
        eventType: 'TransferRequestApproved',
        payload: {
          requestId,
          employeeId: currentRequest.employeeId,
          status: 'PendingFulfilment',
          approverId,
          proposedDepartmentId: currentRequest.proposedDepartmentId,
          proposedLocationId: currentRequest.proposedLocationId,
          proposedRoleId: currentRequest.proposedRoleId,
          proposedEffectiveDate: currentRequest.proposedEffectiveDate
        },
        status: 'PENDING',
        createdAt: new Date()
      };
      await this.outboxRepo.save(outboxMessage);

      return {
        statusCode: 200,
        body: {
          id: requestId,
          status: 'PendingFulfilment'
        }
      };
    });
  }
}
