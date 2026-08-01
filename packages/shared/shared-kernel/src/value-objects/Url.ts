import { ValueObject, type ValueObjectProps } from './ValueObject';
import { DomainError } from '../primitives/DomainError';

interface UrlProps extends ValueObjectProps {
  protocol: string;
  hostname: string;
  port?: number;
  pathname: string;
  search: string;
  hash: string;
}

export class Url extends ValueObject<UrlProps> {
  private constructor(props: UrlProps) {
    super(props);
  }

  public static create(url: string): Url {
    try {
      const parsed = new URL(url);
      return new Url({
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : undefined,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
      });
    } catch {
      throw new DomainError(`Invalid URL: ${url}`, 'INVALID_URL');
    }
  }

  get protocol(): string {
    return this.props.protocol;
  }

  get hostname(): string {
    return this.props.hostname;
  }

  get port(): number | undefined {
    return this.props.port;
  }

  get pathname(): string {
    return this.props.pathname;
  }

  public isHttp(): boolean {
    return this.props.protocol === 'http:' || this.props.protocol === 'https:';
  }

  public isSecure(): boolean {
    return this.props.protocol === 'https:' || this.props.protocol === 'wss:';
  }

  public toString(): string {
    let url = `${this.props.protocol}//${this.props.hostname}`;
    if (this.props.port) url += `:${this.props.port}`;
    url += this.props.pathname;
    url += this.props.search;
    url += this.props.hash;
    return url;
  }
}
