import { ValueObject, type ValueObjectProps } from './ValueObject';
import { DomainError } from '../primitives/DomainError';

const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export type ReleaseType = 'major' | 'minor' | 'patch' | 'prerelease';

interface VersionProps extends ValueObjectProps {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

export class Version extends ValueObject<VersionProps> {
  private constructor(props: VersionProps) {
    super(props);
  }

  public static create(version: string): Version {
    const match = version.match(SEMVER_REGEX);
    if (!match) {
      throw new DomainError(`Invalid semver version: ${version}`, 'INVALID_VERSION');
    }
    const [, major, minor, patch, prerelease, build] = match as [
      string,
      string,
      string,
      string,
      string | undefined,
      string | undefined,
    ];
    return new Version({
      major: parseInt(major, 10),
      minor: parseInt(minor, 10),
      patch: parseInt(patch, 10),
      prerelease,
      build,
    });
  }

  public static initial(): Version {
    return new Version({ major: 0, minor: 1, patch: 0 });
  }

  get major(): number {
    return this.props.major;
  }

  get minor(): number {
    return this.props.minor;
  }

  get patch(): number {
    return this.props.patch;
  }

  get prerelease(): string | undefined {
    return this.props.prerelease;
  }

  get build(): string | undefined {
    return this.props.build;
  }

  public bump(type: ReleaseType, prereleaseId?: string): Version {
    switch (type) {
      case 'major':
        return new Version({ major: this.props.major + 1, minor: 0, patch: 0 });
      case 'minor':
        return new Version({
          major: this.props.major,
          minor: this.props.minor + 1,
          patch: 0,
        });
      case 'patch':
        return new Version({
          major: this.props.major,
          minor: this.props.minor,
          patch: this.props.patch + 1,
        });
      case 'prerelease':
        return new Version({
          major: this.props.major,
          minor: this.props.minor,
          patch: this.props.patch,
          prerelease: prereleaseId ?? 'alpha.1',
        });
    }
  }

  public isGreaterThan(other: Version): boolean {
    if (this.props.major !== other.major) return this.props.major > other.major;
    if (this.props.minor !== other.minor) return this.props.minor > other.minor;
    if (this.props.patch !== other.patch) return this.props.patch > other.patch;
    if (this.props.prerelease && !other.prerelease) return false;
    if (!this.props.prerelease && other.prerelease) return true;
    return false;
  }

  public isLessThan(other: Version): boolean {
    return other.isGreaterThan(this);
  }

  public toString(): string {
    let version = `${this.props.major}.${this.props.minor}.${this.props.patch}`;
    if (this.props.prerelease) version += `-${this.props.prerelease}`;
    if (this.props.build) version += `+${this.props.build}`;
    return version;
  }
}
