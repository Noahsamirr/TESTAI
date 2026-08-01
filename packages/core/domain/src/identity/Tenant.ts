import {
  AggregateRoot,
  EntityId,
  createAuditInfo,
  touchAuditInfo,
  type AuditInfo,
  type EntityProps,
} from '@testmind/shared-kernel';

export type TenantStatus = 'active' | 'suspended' | 'archived';

export interface TenantConfiguration {
  defaultLocale: string;
  defaultTimezone: string;
  allowedEnvironments: string[];
  featureFlags: Record<string, boolean>;
}

export interface TenantProps extends EntityProps {
  organizationId: EntityId;
  name: string;
  slug: string;
  region: string;
  status: TenantStatus;
  configuration: TenantConfiguration;
  audit: AuditInfo;
}

export class Tenant extends AggregateRoot<TenantProps> {
  private constructor(props: TenantProps) {
    super(props);
  }

  public static create(params: {
    organizationId: EntityId;
    name: string;
    slug: string;
    region: string;
    configuration?: Partial<TenantConfiguration>;
    createdBy?: EntityId;
  }): Tenant {
    return new Tenant({
      id: EntityId.generate(),
      organizationId: params.organizationId,
      name: params.name,
      slug: params.slug,
      region: params.region,
      status: 'active',
      configuration: {
        defaultLocale: 'en-US',
        defaultTimezone: 'UTC',
        allowedEnvironments: ['dev', 'qa', 'staging', 'production'],
        featureFlags: {},
        ...params.configuration,
      },
      audit: createAuditInfo(params.createdBy?.value),
    });
  }

  public rename(name: string, slug: string, actorId?: EntityId): void {
    this.props.name = name;
    this.props.slug = slug;
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public updateRegion(region: string, actorId?: EntityId): void {
    this.props.region = region;
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public setStatus(status: TenantStatus, actorId?: EntityId): void {
    this.props.status = status;
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public enableFeature(flag: string, actorId?: EntityId): void {
    this.props.configuration.featureFlags[flag] = true;
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public disableFeature(flag: string, actorId?: EntityId): void {
    this.props.configuration.featureFlags[flag] = false;
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }
}
