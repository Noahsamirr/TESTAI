export class DateTime {
  public static now(): Date {
    return new Date();
  }

  public static nowISO(): string {
    return new Date().toISOString();
  }

  public static nowUnixMs(): number {
    return Date.now();
  }

  public static nowUnixSec(): number {
    return Math.floor(Date.now() / 1000);
  }

  public static fromISO(iso: string): Date {
    return new Date(iso);
  }

  public static fromUnixMs(ms: number): Date {
    return new Date(ms);
  }

  public static fromUnixSec(sec: number): Date {
    return new Date(sec * 1000);
  }

  public static toISO(date: Date): string {
    return date.toISOString();
  }

  public static addMs(date: Date, ms: number): Date {
    return new Date(date.getTime() + ms);
  }

  public static addSeconds(date: Date, seconds: number): Date {
    return this.addMs(date, seconds * 1000);
  }

  public static addMinutes(date: Date, minutes: number): Date {
    return this.addMs(date, minutes * 60 * 1000);
  }

  public static addHours(date: Date, hours: number): Date {
    return this.addMs(date, hours * 60 * 60 * 1000);
  }

  public static addDays(date: Date, days: number): Date {
    return this.addMs(date, days * 24 * 60 * 60 * 1000);
  }

  public static diffMs(a: Date, b: Date): number {
    return a.getTime() - b.getTime();
  }

  public static diffSeconds(a: Date, b: Date): number {
    return Math.floor(this.diffMs(a, b) / 1000);
  }

  public static diffMinutes(a: Date, b: Date): number {
    return Math.floor(this.diffMs(a, b) / (60 * 1000));
  }

  public static diffHours(a: Date, b: Date): number {
    return Math.floor(this.diffMs(a, b) / (60 * 60 * 1000));
  }

  public static diffDays(a: Date, b: Date): number {
    return Math.floor(this.diffMs(a, b) / (24 * 60 * 60 * 1000));
  }

  public static isBefore(a: Date, b: Date): boolean {
    return a.getTime() < b.getTime();
  }

  public static isAfter(a: Date, b: Date): boolean {
    return a.getTime() > b.getTime();
  }

  public static isSame(a: Date, b: Date): boolean {
    return a.getTime() === b.getTime();
  }

  public static isBetween(date: Date, start: Date, end: Date): boolean {
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
  }

  public static isInPast(date: Date): boolean {
    return this.isBefore(date, this.now());
  }

  public static isInFuture(date: Date): boolean {
    return this.isAfter(date, this.now());
  }

  public static startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  public static endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  public static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
}
