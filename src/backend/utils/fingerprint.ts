import * as crypto from 'crypto';
import { CreateTransferPayload } from '../types';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v4 format.
 */
export function isValidUuidV4(key?: string | null): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }
  return UUID_V4_REGEX.test(key.trim());
}

/**
 * Canonical payload structure for SHA-256 fingerprint calculation.
 * Keys are ordered alphabetically:
 * effectiveDate, proposedDepartmentId, proposedLocationId, proposedRoleId, reason.
 */
export interface CanonicalPayload {
  effectiveDate: string;
  proposedDepartmentId: string;
  proposedLocationId: string;
  proposedRoleId: string;
  reason: string | null;
}

/**
 * Formats payload into canonical form according to INT SDD spec:
 * - String fields trimmed
 * - Date in YYYY-MM-DD
 * - Missing or empty reason converted to null
 * - Alphabetically sorted keys
 */
export function canonicalizePayload(payload: CreateTransferPayload): CanonicalPayload {
  const effectiveDate = (payload.effectiveDate || '').trim();
  const proposedDepartmentId = (payload.proposedDepartmentId || '').trim();
  const proposedLocationId = (payload.proposedLocationId || '').trim();
  const proposedRoleId = (payload.proposedRoleId || '').trim();
  const rawReason = payload.reason;
  const reason = rawReason && typeof rawReason === 'string' && rawReason.trim().length > 0
    ? rawReason.trim()
    : null;

  return {
    effectiveDate,
    proposedDepartmentId,
    proposedLocationId,
    proposedRoleId,
    reason
  };
}

/**
 * Computes canonical SHA-256 fingerprint hash of the submission payload.
 */
export function calculatePayloadHash(payload: CreateTransferPayload): string {
  const canonical = canonicalizePayload(payload);
  const serialized = JSON.stringify(canonical);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}
