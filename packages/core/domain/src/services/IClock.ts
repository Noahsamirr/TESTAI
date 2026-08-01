export interface IClock {
  now(): Date;
  nowIso(): string;
  epochMs(): number;
}
