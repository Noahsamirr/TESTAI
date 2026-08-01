import { Entity, type EntityProps } from './Entity';

export interface IDomainEvent {
  aggregateId: string;
  occurredOn: Date;
  eventType: string;
  metadata?: Record<string, unknown>;
}

export abstract class AggregateRoot<T extends EntityProps> extends Entity<T> {
  private _domainEvents: IDomainEvent[] = [];

  get domainEvents(): IDomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(domainEvent: IDomainEvent): void {
    this._domainEvents.push(domainEvent);
    this.touch();
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }

  public pullDomainEvents(): IDomainEvent[] {
    const events = this._domainEvents.slice();
    this._domainEvents = [];
    return events;
  }
}
