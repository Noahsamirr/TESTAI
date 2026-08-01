import { ValueObject, type ValueObjectProps } from './ValueObject';
import { DomainError } from '../primitives/DomainError';

interface PercentageProps extends ValueObjectProps {
  value: number;
}

export class Percentage extends ValueObject<PercentageProps> {
  private constructor(props: PercentageProps) {
    super(props);
  }

  public static create(value: number): Percentage {
    if (!Number.isFinite(value)) {
      throw new DomainError('Percentage must be a finite number', 'INVALID_PERCENTAGE');
    }
    if (value < 0 || value > 100) {
      throw new DomainError(
        `Percentage must be between 0 and 100, got ${value}`,
        'PERCENTAGE_OUT_OF_RANGE',
      );
    }
    return new Percentage({ value });
  }

  public static zero(): Percentage {
    return new Percentage({ value: 0 });
  }

  public static hundred(): Percentage {
    return new Percentage({ value: 100 });
  }

  get value(): number {
    return this.props.value;
  }

  get asDecimal(): number {
    return this.props.value / 100;
  }

  public add(other: Percentage): Percentage {
    return Percentage.create(Math.min(100, this.props.value + other.value));
  }

  public subtract(other: Percentage): Percentage {
    return Percentage.create(Math.max(0, this.props.value - other.value));
  }

  public isGreaterThan(other: Percentage): boolean {
    return this.props.value > other.value;
  }

  public isLessThan(other: Percentage): boolean {
    return this.props.value < other.value;
  }

  public format(decimalPlaces: number = 2): string {
    return `${this.props.value.toFixed(decimalPlaces)}%`;
  }
}
