export type ID = string;

export type ISO8601Date = string;

export type JSONValue = string | number | boolean | null | JSONArray | JSONObject;

export interface JSONObject {
  [key: string]: JSONValue;
}

export type JSONArray = JSONValue[];

export type CorrelationId = string;

export type TenantId = string;

export type UserId = string;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type AsyncReturnType<T extends (...args: never[]) => unknown> = Awaited<ReturnType<T>>;

export type Constructor<T> = new (...args: never[]) => T;

export type ClassConstructor<T> = {
  new (...args: unknown[]): T;
};

export type WithoutId<T> = Omit<T, 'id'>;

export type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type PickByType<T, U> = Pick<T, KeysOfType<T, U>>;

export interface Range<T> {
  min: T;
  max: T;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CursorPage<T, C> {
  items: T[];
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: C;
  prevCursor?: C;
}

export type DiffOp = 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';

export interface DiffChange<T> {
  op: DiffOp;
  path: string;
  value?: T;
  oldValue?: T;
  from?: string;
}

export interface Metadata {
  [key: string]: unknown;
}

export interface Serializable {
  toJSON(): JSONObject;
  toString(): string;
}
