export abstract class Option<T> {
  public static some<U>(value: U): Option<U> {
    return new Some<U>(value);
  }

  public static none<U>(): Option<U> {
    return new None<U>();
  }

  public static fromNullable<U>(value: U | null | undefined): Option<U> {
    return value === null || value === undefined ? Option.none<U>() : Option.some<U>(value);
  }

  public abstract isSome(): this is Some<T>;
  public abstract isNone(): this is None<T>;
  public abstract get value(): T;
  public abstract unwrap(): T;
  public abstract unwrapOr(defaultValue: T): T;
  public abstract unwrapOrElse(fn: () => T): T;
  public abstract map<U>(fn: (value: T) => U): Option<U>;
  public abstract flatMap<U>(fn: (value: T) => Option<U>): Option<U>;
  public abstract fold<U>(onSome: (value: T) => U, onNone: () => U): U;
  public abstract onSome(fn: (value: T) => void): Option<T>;
  public abstract onNone(fn: () => void): Option<T>;
  public abstract toNullable(): T | null;
}

export class Some<T> extends Option<T> {
  constructor(private readonly _value: T) {
    super();
  }

  public isSome(): this is Some<T> {
    return true;
  }

  public isNone(): this is None<T> {
    return false;
  }

  public get value(): T {
    return this._value;
  }

  public unwrap(): T {
    return this._value;
  }

  public unwrapOr(_defaultValue: T): T {
    return this._value;
  }

  public unwrapOrElse(_fn: () => T): T {
    return this._value;
  }

  public map<U>(fn: (value: T) => U): Option<U> {
    return Option.some<U>(fn(this._value));
  }

  public flatMap<U>(fn: (value: T) => Option<U>): Option<U> {
    return fn(this._value);
  }

  public fold<U>(onSome: (value: T) => U, _onNone: () => U): U {
    return onSome(this._value);
  }

  public onSome(fn: (value: T) => void): Option<T> {
    fn(this._value);
    return this;
  }

  public onNone(_fn: () => void): Option<T> {
    return this;
  }

  public toNullable(): T | null {
    return this._value;
  }
}

export class None<T> extends Option<T> {
  public isSome(): this is Some<T> {
    return false;
  }

  public isNone(): this is None<T> {
    return true;
  }

  public get value(): T {
    throw new Error('Cannot get value of None');
  }

  public unwrap(): T {
    throw new Error('Called unwrap on None value');
  }

  public unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  public unwrapOrElse(fn: () => T): T {
    return fn();
  }

  public map<U>(_fn: (value: T) => U): Option<U> {
    return Option.none<U>();
  }

  public flatMap<U>(_fn: (value: T) => Option<U>): Option<U> {
    return Option.none<U>();
  }

  public fold<U>(_onSome: (value: T) => U, onNone: () => U): U {
    return onNone();
  }

  public onSome(_fn: (value: T) => void): Option<T> {
    return this;
  }

  public onNone(fn: () => void): Option<T> {
    fn();
    return this;
  }

  public toNullable(): T | null {
    return null;
  }
}

export const some = <T>(value: T): Option<T> => Option.some(value);
export const none = <T>(): Option<T> => Option.none<T>();
