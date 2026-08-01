import { ValueObject, type ValueObjectProps } from './ValueObject';
import { DomainError } from '../primitives/DomainError';

interface ConfidenceScoreProps extends ValueObjectProps {
  score: number;
  sources?: string[];
  modelVersion?: string;
}

export class ConfidenceScore extends ValueObject<ConfidenceScoreProps> {
  private constructor(props: ConfidenceScoreProps) {
    super(props);
  }

  public static create(
    score: number,
    sources?: string[],
    modelVersion?: string,
  ): ConfidenceScore {
    if (!Number.isFinite(score)) {
      throw new DomainError('Confidence score must be a finite number', 'INVALID_CONFIDENCE');
    }
    if (score < 0 || score > 1) {
      throw new DomainError(
        `Confidence score must be between 0 and 1, got ${score}`,
        'CONFIDENCE_OUT_OF_RANGE',
      );
    }
    return new ConfidenceScore({ score, sources, modelVersion });
  }

  public static high(sources?: string[], modelVersion?: string): ConfidenceScore {
    return ConfidenceScore.create(0.9, sources, modelVersion);
  }

  public static medium(sources?: string[], modelVersion?: string): ConfidenceScore {
    return ConfidenceScore.create(0.6, sources, modelVersion);
  }

  public static low(sources?: string[], modelVersion?: string): ConfidenceScore {
    return ConfidenceScore.create(0.3, sources, modelVersion);
  }

  get score(): number {
    return this.props.score;
  }

  get percentage(): number {
    return this.props.score * 100;
  }

  get sources(): string[] | undefined {
    return this.props.sources;
  }

  get level(): 'high' | 'medium' | 'low' {
    if (this.props.score >= 0.75) return 'high';
    if (this.props.score >= 0.4) return 'medium';
    return 'low';
  }

  public meetsThreshold(threshold: number): boolean {
    return this.props.score >= threshold;
  }

  public combineWith(other: ConfidenceScore, weight = 0.5): ConfidenceScore {
    if (weight < 0 || weight > 1) {
      throw new DomainError('Weight must be between 0 and 1', 'INVALID_WEIGHT');
    }
    const combined = this.props.score * weight + other.score * (1 - weight);
    const sources = [...(this.props.sources ?? []), ...(other.sources ?? [])];
    return ConfidenceScore.create(combined, sources.length > 0 ? sources : undefined);
  }

  public format(): string {
    return `${(this.props.score * 100).toFixed(1)}%`;
  }
}
