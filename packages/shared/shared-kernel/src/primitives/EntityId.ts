import { ulid } from 'ulid';
import { z } from 'zod';

const entityIdSchema = z.string().min(1).max(255);

export class EntityId {
  private constructor(private readonly _value: string) {
    const result = entityIdSchema.safeParse(_value);
    if (!result.success) {
      throw new Error(`Invalid EntityId: ${result.error.message}`);
    }
  }

  public static create(value?: string): EntityId {
    return new EntityId(value ?? ulid());
  }

  public static generate(): EntityId {
    return new EntityId(ulid());
  }

  get value(): string {
    return this._value;
  }

  public equals(other: EntityId): boolean {
    return this._value === other.value;
  }

  public toString(): string {
    return this._value;
  }

  public toJSON(): string {
    return this._value;
  }
}
