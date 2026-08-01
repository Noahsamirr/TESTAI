import type { EntityId } from './EntityId';

export interface EntityProps {
  id?: EntityId;
  createdAt?: Date;
  updatedAt?: Date;
}

export abstract class Entity<T extends EntityProps> {
  protected readonly _id: EntityId;
  public readonly createdAt: Date;
  public updatedAt: Date;
  protected props: T;

  protected constructor(props: T) {
    this._id = props.id ?? EntityId.generate();
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
    this.props = { ...props, id: this._id, createdAt: this.createdAt, updatedAt: this.updatedAt };
  }

  get id(): EntityId {
    return this._id;
  }

  public equals(entity?: Entity<T>): boolean {
    if (entity === null || entity === undefined) {
      return false;
    }
    if (this === entity) {
      return true;
    }
    return this._id.equals(entity._id);
  }

  protected touch(): void {
    this.updatedAt = new Date();
    this.props.updatedAt = this.updatedAt;
  }
}
