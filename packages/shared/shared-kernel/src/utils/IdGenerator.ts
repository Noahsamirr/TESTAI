import { ulid } from 'ulid';
import { randomUUID } from 'node:crypto';

export interface IdGenerator {
  generate(): string;
  generatePrefixed(prefix: string): string;
  isUlid(id: string): boolean;
  extractTimestamp(id: string): number;
  sortByIds<T extends { id: string }>(items: T[]): T[];
}

export const IdGenerator: IdGenerator = {
  generate(): string {
    return ulid();
  },

  generatePrefixed(prefix: string): string {
    return `${prefix}_${ulid()}`;
  },

  isUlid(id: string): boolean {
    const ulidRegex = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;
    return ulidRegex.test(id);
  },

  extractTimestamp(id: string): number {
    if (!this.isUlid(id)) {
      throw new Error('Not a valid ULID');
    }
    const epoch = id.slice(0, 10);
    return parseInt(epoch, 36);
  },

  sortByIds<T extends { id: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
      const tsA = this.isUlid(a.id) ? this.extractTimestamp(a.id) : 0;
      const tsB = this.isUlid(b.id) ? this.extractTimestamp(b.id) : 0;
      if (tsA !== tsB) return tsA - tsB;
      return a.id.localeCompare(b.id);
    });
  },
};

export function generateShortId(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i]! % chars.length];
  }
  return result;
}

export function generateUuid(): string {
  return randomUUID();
}

export function generateNumericId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}
