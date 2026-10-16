import { calculatePayloadHash, canonicalizePayload, isValidUuidV4 } from '../../../src/backend/utils/fingerprint';
import { CreateTransferPayload } from '../../../src/backend/types';

describe('Unit Tests: Payload Canonicalization, Fingerprinting & Key Validation', () => {
  describe('UUID v4 validation (AC-N39)', () => {
    it('should validate standard RFC 4122 UUID v4', () => {
      expect(isValidUuidV4('c3a50d24-38c2-482f-87a4-8468725893d1')).toBe(true);
      expect(isValidUuidV4('C3A50D24-38C2-482F-87A4-8468725893D1')).toBe(true);
    });

    it('should reject invalid, missing or malformed UUIDs', () => {
      expect(isValidUuidV4('')).toBe(false);
      expect(isValidUuidV4(undefined as any)).toBe(false);
      expect(isValidUuidV4(null as any)).toBe(false);
      expect(isValidUuidV4('not-a-uuid')).toBe(false);
      expect(isValidUuidV4('c3a50d24-38c2-182f-87a4-8468725893d1')).toBe(false); // UUID v1
      expect(isValidUuidV4('12345')).toBe(false);
    });
  });

  describe('Payload Canonicalization & SHA-256 Fingerprint (AC-N40, G1-04)', () => {
    it('should canonicalize trimmed strings and missing reason as null', () => {
      const payload: CreateTransferPayload = {
        proposedDepartmentId: '  DEP01  ',
        proposedLocationId: '  LOC01  ',
        proposedRoleId: '  ROL01  ',
        effectiveDate: '  2026-12-01  ',
        reason: '   '
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).toEqual({
        effectiveDate: '2026-12-01',
        proposedDepartmentId: 'DEP01',
        proposedLocationId: 'LOC01',
        proposedRoleId: 'ROL01',
        reason: null
      });
    });

    it('should produce identical SHA-256 hash regardless of object key insertion order or surrounding whitespace', () => {
      const payload1: CreateTransferPayload = {
        proposedDepartmentId: 'DEP01',
        proposedLocationId: 'LOC01',
        proposedRoleId: 'ROL01',
        effectiveDate: '2026-12-01',
        reason: 'Transfer reason'
      };

      const payload2: CreateTransferPayload = {
        reason: '  Transfer reason  ',
        effectiveDate: '2026-12-01',
        proposedRoleId: 'ROL01',
        proposedLocationId: 'LOC01',
        proposedDepartmentId: 'DEP01'
      };

      const hash1 = calculatePayloadHash(payload1);
      const hash2 = calculatePayloadHash(payload2);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should produce different SHA-256 hash when any single field changes (AC-N40)', () => {
      const base: CreateTransferPayload = {
        proposedDepartmentId: 'DEP01',
        proposedLocationId: 'LOC01',
        proposedRoleId: 'ROL01',
        effectiveDate: '2026-12-01',
        reason: 'Transfer reason'
      };

      const baseHash = calculatePayloadHash(base);

      expect(calculatePayloadHash({ ...base, proposedDepartmentId: 'DEP02' })).not.toBe(baseHash);
      expect(calculatePayloadHash({ ...base, proposedLocationId: 'LOC02' })).not.toBe(baseHash);
      expect(calculatePayloadHash({ ...base, proposedRoleId: 'ROL02' })).not.toBe(baseHash);
      expect(calculatePayloadHash({ ...base, effectiveDate: '2026-12-02' })).not.toBe(baseHash);
      expect(calculatePayloadHash({ ...base, reason: 'Modified reason' })).not.toBe(baseHash);
      expect(calculatePayloadHash({ ...base, reason: null })).not.toBe(baseHash);
    });
  });
});
