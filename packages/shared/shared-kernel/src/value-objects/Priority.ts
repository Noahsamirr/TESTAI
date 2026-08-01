import { ValueObject, type ValueObjectProps } from './ValueObject';
import { DomainError } from '../primitives/DomainError';

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Info: 4,
};

interface PriorityProps extends ValueObjectProps {
  level: PriorityLevel;
}

export class Priority extends ValueObject<PriorityProps> {
  private constructor(props: PriorityProps) {
    super(props);
  }

  public static create(level: PriorityLevel = 'Medium'): Priority {
    if (!PRIORITY_ORDER.hasOwnProperty(level)) {
      throw new DomainError(`Invalid priority level: ${level}`, 'INVALID_PRIORITY');
    }
    return new Priority({ level });
  }

  public static critical(): Priority {
    return new Priority({ level: 'Critical' });
  }

  public static high(): Priority {
    return new Priority({ level: 'High' });
  }

  public static medium(): Priority {
    return new Priority({ level: 'Medium' });
  }

  public static low(): Priority {
    return new Priority({ level: 'Low' });
  }

  public static info(): Priority {
    return new Priority({ level: 'Info' });
  }

  get level(): PriorityLevel {
    return this.props.level;
  }

  get order(): number {
    return PRIORITY_ORDER[this.props.level];
  }

  public isHigherThan(other: Priority): boolean {
    return this.order < other.order;
  }

  public isLowerThan(other: Priority): boolean {
    return this.order > other.order;
  }

  public toString(): string {
    return this.props.level;
  }
}
