export interface IIdGenerator {
  generate(): string;
  generatePrefixed(prefix: string): string;
}
