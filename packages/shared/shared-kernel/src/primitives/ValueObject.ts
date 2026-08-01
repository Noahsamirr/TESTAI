export interface ValueObjectProps {
  [key: string]: unknown;
}

export abstract class ValueObject<T extends ValueObjectProps> {
  protected constructor(public readonly props: T) {}

  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }

  public toJSON(): T {
    return this.deepFreeze(this.props);
  }

  private deepFreeze<TObj>(obj: TObj): TObj {
    Object.freeze(obj);
    Object.keys(obj as Record<string, unknown>).forEach((key) => {
      const prop = (obj as Record<string, unknown>)[key];
      if (
        prop !== null &&
        typeof prop === 'object' &&
        !Object.isFrozen(prop as object)
      ) {
        this.deepFreeze(prop as Record<string, unknown>);
      }
    });
    return obj;
  }
}
