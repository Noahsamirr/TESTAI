import { DomainError } from '../primitives/DomainError';

export class Guard {
  public static againstNull<T>(value: T | null | undefined, name: string): T {
    if (value === null || value === undefined) {
      throw new DomainError(`${name} cannot be null or undefined`, 'NULL_VALUE', { name });
    }
    return value;
  }

  public static againstNullOrUndefined<T>(value: T | null | undefined, name: string): asserts value is T {
    if (value === null || value === undefined) {
      throw new DomainError(`${name} cannot be null or undefined`, 'NULL_VALUE', { name });
    }
  }

  public static againstNullOrWhitespace(value: string, name: string): asserts value is string {
    if (value === null || value === undefined || value.trim() === '') {
      throw new DomainError(`${name} cannot be null, undefined, or whitespace`, 'EMPTY_VALUE', { name });
    }
  }

  public static againstEmpty<T extends { length: number }>(value: T, name: string): void {
    if (value === null || value === undefined || value.length === 0) {
      throw new DomainError(`${name} cannot be empty`, 'EMPTY_COLLECTION', { name });
    }
  }

  public static againstNegative(value: number, name: string): void {
    if (value < 0) {
      throw new DomainError(`${name} cannot be negative`, 'NEGATIVE_VALUE', { name, value });
    }
  }

  public static againstZeroOrNegative(value: number, name: string): void {
    if (value <= 0) {
      throw new DomainError(`${name} must be greater than zero`, 'NON_POSITIVE_VALUE', { name, value });
    }
  }

  public static againstAtLeast(value: number, min: number, name: string): void {
    if (value < min) {
      throw new DomainError(`${name} must be at least ${min}`, 'VALUE_TOO_LOW', { name, value, min });
    }
  }

  public static againstAtMost(value: number, max: number, name: string): void {
    if (value > max) {
      throw new DomainError(`${name} must be at most ${max}`, 'VALUE_TOO_HIGH', { name, value, max });
    }
  }

  public static againstInRange(value: number, min: number, max: number, name: string): void {
    if (value < min || value > max) {
      throw new DomainError(`${name} must be between ${min} and ${max}`, 'VALUE_OUT_OF_RANGE', {
        name,
        value,
        min,
        max,
      });
    }
  }

  public static againstMinLength(value: string, minLength: number, name: string): void {
    if (value.length < minLength) {
      throw new DomainError(
        `${name} must be at least ${minLength} characters`,
        'STRING_TOO_SHORT',
        { name, length: value.length, minLength },
      );
    }
  }

  public static againstMaxLength(value: string, maxLength: number, name: string): void {
    if (value.length > maxLength) {
      throw new DomainError(
        `${name} must be at most ${maxLength} characters`,
        'STRING_TOO_LONG',
        { name, length: value.length, maxLength },
      );
    }
  }

  public static againstInvalidPattern(value: string, pattern: RegExp, name: string): void {
    if (!pattern.test(value)) {
      throw new DomainError(`${name} does not match required pattern`, 'INVALID_PATTERN', {
        name,
        pattern: pattern.toString(),
      });
    }
  }

  public static againstDuplicates<T>(values: T[], name: string): void {
    const set = new Set(values);
    if (set.size !== values.length) {
      throw new DomainError(`${name} contains duplicates`, 'DUPLICATE_VALUES', { name });
    }
  }

  public static againstInvalidEmail(value: string): void {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) {
      throw new DomainError('Invalid email address format', 'INVALID_EMAIL', { value });
    }
  }

  public static againstInvalidUrl(value: string): void {
    try {
      new URL(value);
    } catch {
      throw new DomainError('Invalid URL format', 'INVALID_URL', { value });
    }
  }
}
