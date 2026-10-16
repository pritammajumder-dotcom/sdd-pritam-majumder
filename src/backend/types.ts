export type RequestStatus =
  | 'Submitted'
  | 'PendingManagerApproval'
  | 'PendingHRValidation'
  | 'PendingFulfilment'
  | 'FulfilmentFailed'
  | 'Scheduled'
  | 'CancellationPending'
  | 'Completed'
  | 'RejectedByManager'
  | 'RejectedByHR'
  | 'Withdrawn'
  | 'Cancelled';

export interface Employee {
  id: string;
  name: string;
  email: string;
  currentDepartmentId: string;
  currentLocationId: string;
  currentRoleId: string;
  managerId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferRequest {
  id: string;
  employeeId: string;
  status: RequestStatus;
  blockedByPriorCancellation: boolean;
  version: number;
  proposedDepartmentId: string;
  proposedLocationId: string;
  proposedRoleId: string;
  proposedEffectiveDate: string;
  reason?: string | null;
  currentManagerId?: string | null;
  assignedApproverId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmissionIdempotency {
  employeeId: string;
  operation: string;
  idempotencyKey: string;
  payloadHash: string;
  transferRequestId: string;
  responseStatus: number;
  responseBody: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
}

export interface CreateTransferPayload {
  proposedDepartmentId: string;
  proposedLocationId: string;
  proposedRoleId: string;
  effectiveDate: string;
  reason?: string | null;
}

export interface SubmissionResponseData {
  id?: string;
  status?: RequestStatus;
  proposedEffectiveDate?: string;
  flags?: string[];
  error?: string;
  message?: string;
}

export interface SubmissionResult {
  statusCode: number;
  isReplay?: boolean;
  body: SubmissionResponseData;
}

export interface ApprovalResult {
  statusCode: number;
  body: {
    id?: string;
    status?: RequestStatus;
    error?: string;
    message?: string;
  };
}

export interface OutboxMessage {
  id: string;
  aggregateType: 'TransferRequest';
  aggregateId: string;
  eventType: 'TransferRequestApproved';
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  createdAt: Date;
  processedAt?: Date | null;
}

