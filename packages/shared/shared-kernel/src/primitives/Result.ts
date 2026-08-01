export class Result<T, E = Error> {
  private constructor(
    public readonly isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: E,
  ) {
    Object.freeze(this);
  }

  public static ok<U, E = Error>(value?: U): Result<U, E> {
    return new Result<U, E>(true, value);
  }

  public static fail<U, E = Error>(error: E): Result<U, E> {
    return new Result<U, E>(false, undefined, error);
  }

  public get value(): T {
    if (!this.isSuccess) {
      throw new Error('Cannot retrieve value from a failed Result');
    }
    return this._value as T;
  }

  public get error(): E {
    if (this.isSuccess) {
      throw new Error('Cannot retrieve error from a successful Result');
    }
    return this._error as E;
  }

  public map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.isSuccess) {
      return Result.ok<U, E>(fn(this.value));
    }
    return Result.fail<U, E>(this.error);
  }

  public flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.isSuccess) {
      return fn(this.value);
    }
    return Result.fail<U, E>(this.error);
  }

  public onSuccess(fn: (value: T) => void): Result<T, E> {
    if (this.isSuccess) {
      fn(this.value);
    }
    return this;
  }

  public onFailure(fn: (error: E) => void): Result<T, E> {
    if (!this.isSuccess) {
      fn(this.error);
    }
    return this;
  }

  public fold<U>(onSuccess: (value: T) => U, onFailure: (error: E) => U): U {
    return this.isSuccess ? onSuccess(this.value) : onFailure(this.error);
  }
}
