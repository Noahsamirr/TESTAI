import { ValueObject, type ValueObjectProps } from './ValueObject';
import { DomainError } from '../primitives/DomainError';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface EmailAddressProps extends ValueObjectProps {
  local: string;
  domain: string;
}

export class EmailAddress extends ValueObject<EmailAddressProps> {
  private constructor(props: EmailAddressProps) {
    super(props);
  }

  public static create(email: string): EmailAddress {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) {
      throw new DomainError(`Invalid email address: ${email}`, 'INVALID_EMAIL');
    }
    const [local, domain] = trimmed.split('@') as [string, string];
    return new EmailAddress({ local, domain });
  }

  get local(): string {
    return this.props.local;
  }

  get domain(): string {
    return this.props.domain;
  }

  public toString(): string {
    return `${this.props.local}@${this.props.domain}`;
  }

  public masked(): string {
    const local = this.props.local;
    if (local.length <= 2) return local[0] + '***@' + this.props.domain;
    return local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] + '@' + this.props.domain;
  }
}
