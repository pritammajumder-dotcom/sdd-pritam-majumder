import { OutboxMessage } from '../types';

export interface IOutboxRepository {
  save(message: OutboxMessage): Promise<void>;
  findByAggregateId(aggregateId: string): Promise<OutboxMessage[]>;
  findPending(): Promise<OutboxMessage[]>;
  markProcessed(id: string): Promise<void>;
}

export class InMemoryOutboxRepository implements IOutboxRepository {
  private messages: OutboxMessage[] = [];

  async save(message: OutboxMessage): Promise<void> {
    this.messages.push({ ...message });
  }

  async findByAggregateId(aggregateId: string): Promise<OutboxMessage[]> {
    return this.messages.filter((m) => m.aggregateId === aggregateId);
  }

  async findPending(): Promise<OutboxMessage[]> {
    return this.messages.filter((m) => m.status === 'PENDING');
  }

  async markProcessed(id: string): Promise<void> {
    const msg = this.messages.find((m) => m.id === id);
    if (msg) {
      msg.status = 'PROCESSED';
      msg.processedAt = new Date();
    }
  }

  clear(): void {
    this.messages = [];
  }
}
