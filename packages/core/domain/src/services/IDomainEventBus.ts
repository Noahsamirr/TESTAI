import type { IDomainEvent } from '@testmind/shared-kernel';

export interface IDomainEventBus {
  publish(event: IDomainEvent): Promise<void>;
  publishAll(events: IDomainEvent[]): Promise<void>;
  subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void> | void,
  ): void;
}
