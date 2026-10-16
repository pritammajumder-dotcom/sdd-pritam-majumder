-- CreateEnum: RequestStatus (BRD D32)
CREATE TYPE "RequestStatus" AS ENUM (
    'Submitted',
    'PendingManagerApproval',
    'PendingHRValidation',
    'PendingFulfilment',
    'FulfilmentFailed',
    'Scheduled',
    'CancellationPending',
    'Completed',
    'RejectedByManager',
    'RejectedByHR',
    'Withdrawn',
    'Cancelled'
);

-- CreateTable: Employee
CREATE TABLE "Employee" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "currentDepartmentId" TEXT NOT NULL,
    "currentLocationId" TEXT NOT NULL,
    "currentRoleId" TEXT NOT NULL,
    "managerId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateTable: TransferRequest (BRD D07, D08, D32, D35, D68)
CREATE TABLE "TransferRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employeeId" UUID NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'Submitted',
    "blockedByPriorCancellation" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "proposedDepartmentId" TEXT NOT NULL,
    "proposedLocationId" TEXT NOT NULL,
    "proposedRoleId" TEXT NOT NULL,
    "proposedEffectiveDate" DATE NOT NULL,
    "reason" TEXT,
    "currentManagerId" UUID,
    "assignedApproverId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferRequest_pkey" PRIMARY KEY ("id")
);

-- Layer 1 Database Backstop: Partial Unique Index (BRD D07, D35, D68, Gate 1 G1-06, D71 Item 1)
-- Exactly enforces one active request per employee.
-- Excludes CancellationPending (non-terminal but non-active) and terminal statuses.
CREATE UNIQUE INDEX ux_transfer_request_one_active_per_employee
  ON "TransferRequest" ("employeeId")
  WHERE "status" IN (
    'Submitted',
    'PendingManagerApproval',
    'PendingHRValidation',
    'PendingFulfilment',
    'FulfilmentFailed',
    'Scheduled'
  );

CREATE INDEX "ix_transfer_request_employee" ON "TransferRequest"("employeeId");
CREATE INDEX "ix_transfer_request_status" ON "TransferRequest"("status");

-- CreateTable: SubmissionIdempotency (BRD D43, Spec API01, Gate 1 G1-04)
CREATE TABLE "SubmissionIdempotency" (
    "employeeId" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "payloadHash" CHAR(64) NOT NULL,
    "transferRequestId" UUID NOT NULL,
    "responseStatus" SMALLINT NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SubmissionIdempotency_pkey" PRIMARY KEY ("employeeId", "operation", "idempotencyKey")
);

CREATE INDEX ix_submission_idempotency_expires ON "SubmissionIdempotency" ("expiresAt");

-- Foreign Keys
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SubmissionIdempotency" ADD CONSTRAINT "SubmissionIdempotency_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SubmissionIdempotency" ADD CONSTRAINT "SubmissionIdempotency_transferRequestId_fkey" FOREIGN KEY ("transferRequestId") REFERENCES "TransferRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
