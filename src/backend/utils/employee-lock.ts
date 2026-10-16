/**
 * In-memory mutex for serializing operations per employee.
 * In a distributed or database-backed deployment, this corresponds to:
 * `SELECT 1 FROM "Employee" WHERE id = $1 FOR UPDATE` (5s lock timeout)
 */
export class EmployeeLockManager {
  private locks = new Map<string, Promise<void>>();

  async acquire(employeeId: string, timeoutMs: number = 5000): Promise<() => void> {
    while (this.locks.has(employeeId)) {
      const currentLock = this.locks.get(employeeId);
      if (currentLock) {
        let timer: NodeJS.Timeout;
        const timeoutPromise = new Promise<void>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error('EMPLOYEE_LOCK_TIMEOUT'));
          }, timeoutMs);
        });

        try {
          await Promise.race([currentLock, timeoutPromise]);
        } finally {
          clearTimeout(timer!);
        }
      }
    }

    let releaseFn!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseFn = resolve;
    });

    this.locks.set(employeeId, lockPromise);

    return () => {
      this.locks.delete(employeeId);
      releaseFn();
    };
  }

  async runExclusive<T>(employeeId: string, fn: () => Promise<T>, timeoutMs: number = 5000): Promise<T> {
    const release = await this.acquire(employeeId, timeoutMs);
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
