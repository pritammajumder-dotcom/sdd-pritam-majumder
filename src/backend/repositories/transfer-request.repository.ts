import { TransferRequest, RequestStatus } from '../types';

export const ACTIVE_STATUSES: RequestStatus[] = [
  'Submitted',
  'PendingManagerApproval',
  'PendingHRValidation',
  'PendingFulfilment',
  'FulfilmentFailed',
  'Scheduled'
];

export interface ITransferRequestRepository {
  findById(id: string): Promise<TransferRequest | null>;
  findActiveByEmployeeId(employeeId: string): Promise<TransferRequest | null>;
  findCancellationPendingByEmployeeId(employeeId: string): Promise<TransferRequest | null>;
  save(request: TransferRequest): Promise<void>;
  updateStatus(id: string, status: RequestStatus): Promise<TransferRequest | null>;
  clearCancellationPendingFlag(employeeId: string): Promise<void>;
}

export class InMemoryTransferRequestRepository implements ITransferRequestRepository {
  private requests = new Map<string, TransferRequest>();

  async findById(id: string): Promise<TransferRequest | null> {
    const req = this.requests.get(id);
    return req ? { ...req } : null;
  }

  async findActiveByEmployeeId(employeeId: string): Promise<TransferRequest | null> {
    for (const req of this.requests.values()) {
      if (req.employeeId === employeeId && ACTIVE_STATUSES.includes(req.status)) {
        return { ...req };
      }
    }
    return null;
  }

  async findCancellationPendingByEmployeeId(employeeId: string): Promise<TransferRequest | null> {
    for (const req of this.requests.values()) {
      if (req.employeeId === employeeId && req.status === 'CancellationPending') {
        return { ...req };
      }
    }
    return null;
  }

  async save(request: TransferRequest): Promise<void> {
    this.requests.set(request.id, { ...request });
  }

  async updateStatus(id: string, status: RequestStatus): Promise<TransferRequest | null> {
    const req = this.requests.get(id);
    if (!req) return null;
    req.status = status;
    req.updatedAt = new Date();
    this.requests.set(id, req);
    return { ...req };
  }

  async clearCancellationPendingFlag(employeeId: string): Promise<void> {
    for (const [id, req] of this.requests.entries()) {
      if (req.employeeId === employeeId && req.blockedByPriorCancellation) {
        req.blockedByPriorCancellation = false;
        req.updatedAt = new Date();
        this.requests.set(id, req);
      }
    }
  }

  clear(): void {
    this.requests.clear();
  }
}
