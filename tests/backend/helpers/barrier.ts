/**
 * Barrier utility to synchronize N parallel asynchronous workers to fire simultaneously.
 */
export class Barrier {
  private count: number;
  private release!: () => void;
  private readonly promise: Promise<void>;

  constructor(count: number) {
    this.count = count;
    this.promise = new Promise<void>((resolve) => {
      this.release = resolve;
    });
  }

  async wait(): Promise<void> {
    this.count--;
    if (this.count <= 0) {
      this.release();
    }
    return this.promise;
  }
}
