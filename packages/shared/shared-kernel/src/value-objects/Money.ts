import { ValueObject, type ValueObjectProps } from './ValueObject';
import { DomainError } from '../primitives/DomainError';

type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'CNY'
  | 'AUD'
  | 'CAD'
  | 'CHF'
  | 'INR'
  | 'KRW'
  | 'BRL'
  | 'MXN';

const CURRENCY_DECIMALS: Record<CurrencyCode, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  CNY: 2,
  AUD: 2,
  CAD: 2,
  CHF: 2,
  INR: 2,
  KRW: 0,
  BRL: 2,
  MXN: 2,
};

interface MoneyProps extends ValueObjectProps {
  amount: number;
  currency: CurrencyCode;
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  public static create(amount: number, currency: CurrencyCode = 'USD'): Money {
    if (!CURRENCY_DECIMALS.hasOwnProperty(currency)) {
      throw new DomainError(`Unsupported currency: ${currency}`, 'INVALID_CURRENCY');
    }
    if (!Number.isFinite(amount)) {
      throw new DomainError('Amount must be a finite number', 'INVALID_AMOUNT');
    }
    const decimals = CURRENCY_DECIMALS[currency];
    const rounded = Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
    return new Money({ amount: rounded, currency });
  }

  public static zero(currency: CurrencyCode = 'USD'): Money {
    return Money.create(0, currency);
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): CurrencyCode {
    return this.props.currency;
  }

  private assertSameCurrency(other: Money): void {
    if (this.props.currency !== other.currency) {
      throw new DomainError(
        `Currency mismatch: ${this.props.currency} vs ${other.currency}`,
        'CURRENCY_MISMATCH',
      );
    }
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.create(this.props.amount + other.amount, this.props.currency);
  }

  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.create(this.props.amount - other.amount, this.props.currency);
  }

  public multiply(factor: number): Money {
    return Money.create(this.props.amount * factor, this.props.currency);
  }

  public isZero(): boolean {
    return this.props.amount === 0;
  }

  public isPositive(): boolean {
    return this.props.amount > 0;
  }

  public isNegative(): boolean {
    return this.props.amount < 0;
  }

  public isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.props.amount > other.amount;
  }

  public isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.props.amount < other.amount;
  }

  public format(locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.props.currency,
    }).format(this.props.amount);
  }
}
