import { ValueObject, type ValueObjectProps } from './ValueObject';
import { DomainError } from '../primitives/DomainError';

export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  Critical: 100,
  High: 75,
  Medium: 50,
  Low: 25,
};

interface SeverityProps extends ValueObjectProps {
  level: SeverityLevel;
}

export class Severity extends ValueObject<SeverityProps> {
  private constructor(props: SeverityProps) {
    super(props);
  }

  public static create(level: SeverityLevel = 'Medium'): Severity {
    if (!SEVERITY_WEIGHTS.hasOwnProperty(level)) {
      throw new DomainError(`Invalid severity level: ${level}`, 'INVALID_SEVERITY');
    }
    return new Severity({ level });
  }

  public static critical(): Severity {
    return new Severity({ level: 'Critical' });
  }

  public static high(): Severity {
    return new Severity({ level: 'High' });
  }

  public static medium(): Severity {
    return new Severity({ level: 'Medium' });
  }

  public static low(): Severity {
    return new Severity({ level: 'Low' });
  }

  get level(): SeverityLevel {
    return this.props.level;
  }

  get weight(): number {
    return SEVERITY_WEIGHTS[this.props.level];
  }

  public toString(): string {
    return this.props.level;
  }
}
