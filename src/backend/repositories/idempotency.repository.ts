import { SubmissionIdempotency } from '../types';

export interface ISubmissionIdempotencyRepository {
  find(
    employeeId: string,
    operation: string,
    idempotencyKey: string
  ): Promise<SubmissionIdempotency | null>;

  save(record: SubmissionIdempotency): Promise<void>;

  acquireLock(
    employeeId: string,
    operation: string,
    idempotencyKey: string,
    timeoutMs?: number
  ): Promise<{ release: () => void; isNew: boolean }>;

  purgeExpired(): Promise<number>;
}

interface InFlightEntry {
  promise: Promise<void>;
  resolve: () => void;
  reject: (err: Error) => void;
}

export class InMemorySubmissionIdempotencyRepository implements ISubmissionIdempotencyRepository {
  private records = new Map<string, SubmissionIdempotency>();
  private inFlight = new Map<string, InFlightEntry>();

  private buildKey(employeeId: string, operation: string, idempotencyKey: string): string {
    return `${employeeId}:${operation}:${idempotencyKey}`;
  }

  async find(
    employeeId: string,
    operation: string,
    idempotencyKey: string
  ): Promise<SubmissionIdempotency | null> {
    const key = this.buildKey(employeeId, operation, idempotencyKey);
    const record = this.records.get(key);
    if (!record) {
      return null;
    }
    // Check expiration (24h retention)
    if (new Date() > record.expiresAt) {
      this.records.delete(key);
      return null;
    }
    return record;
  }

  async save(record: SubmissionIdempotency): Promise<void> {
    const key = this.buildKey(record.employeeId, record.operation, record.idempotencyKey);
    this.records.set(key, { ...record });
  }

  async acquireLock(
    employeeId: string,
    operation: string,
    idempotencyKey: string,
    timeoutMs: number = 5000
  ): Promise<{ release: () => void; isNew: boolean }> {
    const key = this.buildKey(employeeId, operation, idempotencyKey);

    // If an existing committed record is already present, no need to lock as new
    const existing = await this.find(employeeId, operation, idempotencyKey);
    if (existing) {
      return {
        release: () => {},
        isNew: false
      };
    }

    // Check if there is an in-flight operation for this key
    const currentInFlight = this.inFlight.get(key);
    if (currentInFlight) {
      // Wait for existing in-flight operation with timeout
      let timer: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('IDEMPOTENCY_LOCK_TIMEOUT'));
        }, timeoutMs);
      });

      try {
        await Promise.race([currentInFlight.promise, timeoutPromise]);
      } finally {
        clearTimeout(timer!);
      }

      // Check again after waiter finishes
      return {
        release: () => {},
        isNew: false
      };
    }

    // Create a new in-flight lock
    let resolveFn!: () => void;
    let rejectFn!: (err: Error) => void;
    const lockPromise = new Promise<void>((res, rej) => {
      resolveFn = res;
      rejectFn = rej;
    });

    this.inFlight.set(key, {
      promise: lockPromise,
      resolve: resolveFn,
      reject: rejectFn
    });

    return {
      release: () => {
        const entry = this.inFlight.get(key);
        if (entry) {
          entry.resolve();
          this.inFlight.delete(key);
        }
      },
      isNew: true
    };
  }

  async purgeExpired(): Promise<number> {
    const now = new Date();
    let purged = 0;
    for (const [key, record] of this.records.entries()) {
      if (now > record.expiresAt) {
        this.records.delete(key);
        purged++;
      }
    }
    return purged;
  }
}
