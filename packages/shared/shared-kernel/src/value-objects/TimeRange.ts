import { ValueObject, type ValueObjectProps } from './ValueObject';
import { DomainError } from '../primitives/DomainError';

interface TimeRangeProps extends ValueObjectProps {
  start: Date;
  end?: Date;
}

export class TimeRange extends ValueObject<TimeRangeProps> {
  private constructor(props: TimeRangeProps) {
    super(props);
  }

  public static create(start: Date, end?: Date): TimeRange {
    if (end && end < start) {
      throw new DomainError('End time must be after start time', 'INVALID_TIME_RANGE');
    }
    return new TimeRange({ start, end });
  }

  public static fromNow(durationMs: number): TimeRange {
    const now = new Date();
    return new TimeRange({ start: now, end: new Date(now.getTime() + durationMs) });
  }

  get start(): Date {
    return this.props.start;
  }

  get end(): Date | undefined {
    return this.props.end;
  }

  get durationMs(): number {
    if (!this.props.end) return Date.now() - this.props.start.getTime();
    return this.props.end.getTime() - this.props.start.getTime();
  }

  get isOngoing(): boolean {
    return !this.props.end;
  }

  public contains(date: Date): boolean {
    if (date < this.props.start) return false;
    if (this.props.end && date > this.props.end) return false;
    return true;
  }

  public overlapsWith(other: TimeRange): boolean {
    return (
      this.contains(other.start) ||
      (other.end !== undefined && this.contains(other.end)) ||
      this.props.start < other.start
    );
  }

  public close(endDate: Date = new Date()): TimeRange {
    return new TimeRange({ start: this.props.start, end: endDate });
  }
}
