import type { JSONObject, JSONValue, ISO8601Date } from '../types/Common';

export class Serializers {
  public static toJSON<T>(value: T): string {
    return JSON.stringify(value, (key, val) => {
      if (val instanceof Date) return val.toISOString();
      if (val instanceof Map) return Object.fromEntries(val.entries());
      if (val instanceof Set) return Array.from(val.values());
      if (typeof val === 'bigint') return val.toString();
      return val;
    });
  }

  public static fromJSON<T = JSONObject>(json: string): T {
    return JSON.parse(json, (key, value: JSONValue) => {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return new Date(value);
      }
      return value;
    }) as T;
  }

  public static tryToJSON<T>(value: T): string | null {
    try {
      return this.toJSON(value);
    } catch {
      return null;
    }
  }

  public static tryFromJSON<T = JSONObject>(json: string): T | null {
    try {
      return this.fromJSON<T>(json);
    } catch {
      return null;
    }
  }

  public static toBase64(value: string): string {
    return Buffer.from(value, 'utf-8').toString('base64');
  }

  public static fromBase64(encoded: string): string {
    return Buffer.from(encoded, 'base64').toString('utf-8');
  }

  public static toBase64Url(value: string): string {
    return Buffer.from(value, 'utf-8').toString('base64url');
  }

  public static fromBase64Url(encoded: string): string {
    return Buffer.from(encoded, 'base64url').toString('utf-8');
  }

  public static urlEncodeParams(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    });
    return searchParams.toString();
  }

  public static parseQueryString(qs: string): Record<string, string | string[]> {
    const params = new URLSearchParams(qs);
    const result: Record<string, string | string[]> = {};
    for (const [key, value] of params.entries()) {
      const existing = result[key];
      if (existing !== undefined) {
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          result[key] = [existing, value];
        }
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  public static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as T;
    if (obj instanceof Set) return new Set(Array.from(obj as Set<unknown>)) as T;
    if (obj instanceof Map)
      return new Map(Array.from(obj as Map<unknown, unknown>).map(([k, v]) => [this.deepClone(k), this.deepClone(v)])) as T;
    if (Array.isArray(obj)) return obj.map((item) => this.deepClone(item)) as T;
    const cloned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      cloned[key] = this.deepClone(value);
    }
    return cloned as T;
  }

  public static serializeDate(date: Date): ISO8601Date {
    return date.toISOString();
  }

  public static deserializeDate(value: ISO8601Date): Date {
    return new Date(value);
  }
}
