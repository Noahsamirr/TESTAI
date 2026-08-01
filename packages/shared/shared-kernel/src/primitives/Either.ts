export type Either<L, R> = Left<L, R> | Right<L, R>;

export class Left<L, R> {
  readonly value: L;
  readonly isLeft = true;
  readonly isRight = false;

  constructor(value: L) {
    this.value = value;
  }

  public map<T>(_fn: (r: R) => T): Either<L, T> {
    return new Left<L, T>(this.value);
  }

  public flatMap<T>(_fn: (r: R) => Either<L, T>): Either<L, T> {
    return new Left<L, T>(this.value);
  }

  public fold<T>(onLeft: (l: L) => T, _onRight: (r: R) => T): T {
    return onLeft(this.value);
  }
}

export class Right<L, R> {
  readonly value: R;
  readonly isLeft = false;
  readonly isRight = true;

  constructor(value: R) {
    this.value = value;
  }

  public map<T>(fn: (r: R) => T): Either<L, T> {
    return new Right<L, T>(fn(this.value));
  }

  public flatMap<T>(fn: (r: R) => Either<L, T>): Either<L, T> {
    return fn(this.value);
  }

  public fold<T>(_onLeft: (l: L) => T, onRight: (r: R) => T): T {
    return onRight(this.value);
  }
}

export const left = <L, R>(l: L): Either<L, R> => new Left<L, R>(l);
export const right = <L, R>(r: R): Either<L, R> => new Right<L, R>(r);
