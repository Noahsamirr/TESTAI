import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export class HashUtil {
  public static sha256(input: string, salt?: string): string {
    const data = salt ? `${salt}${input}` : input;
    return createHash('sha256').update(data).digest('hex');
  }

  public static sha512(input: string, salt?: string): string {
    const data = salt ? `${salt}${input}` : input;
    return createHash('sha512').update(data).digest('hex');
  }

  public static md5(input: string): string {
    return createHash('md5').update(input).digest('hex');
  }

  public static generateSalt(length: number = 16): string {
    return randomBytes(length).toString('hex');
  }

  public static randomToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  public static randomTokenUrlSafe(length: number = 32): string {
    return randomBytes(length).toString('base64url');
  }

  public static hmacSha256(input: string, secret: string): string {
    return createHash('sha256').update(input + secret).digest('hex');
  }

  public static secureCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);
      if (bufA.length !== bufB.length) return false;
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  public static fingerprint(data: Record<string, unknown>): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return this.sha256(normalized);
  }
}
