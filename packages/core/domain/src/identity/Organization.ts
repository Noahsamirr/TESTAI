import {
  AggregateRoot,
  EmailAddress,
  EntityId,
  createAuditInfo,
  touchAuditInfo,
  type AuditInfo,
  type EntityProps,
} from '@testmind/shared-kernel';

export type OrganizationPlan = 'free' | 'team' | 'enterprise';

export interface OrganizationSettings {
  allowSelfSignup: boolean;
  ssoRequired: boolean;
  defaultRole?: string;
  dataResidency?: string;
}

export interface OrganizationProps extends EntityProps {
  name: string;
  slug: string;
  ownerId: EntityId;
  billingEmail: EmailAddress;
  plan: OrganizationPlan;
  settings: OrganizationSettings;
  audit: AuditInfo;
}

export class Organization extends AggregateRoot<OrganizationProps> {
  private constructor(props: OrganizationProps) {
    super(props);
  }

  public static create(params: {
    name: string;
    slug: string;
    ownerId: EntityId;
    billingEmail: EmailAddress;
    plan?: OrganizationPlan;
    settings?: Partial<OrganizationSettings>;
    createdBy?: EntityId;
  }): Organization {
    return new Organization({
      id: EntityId.generate(),
      name: params.name,
      slug: params.slug,
      ownerId: params.ownerId,
      billingEmail: params.billingEmail,
      plan: params.plan ?? 'free',
      settings: {
        allowSelfSignup: true,
        ssoRequired: false,
        ...params.settings,
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

  public changePlan(plan: OrganizationPlan, actorId?: EntityId): void {
    this.props.plan = plan;
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public updateSettings(settings: Partial<OrganizationSettings>, actorId?: EntityId): void {
    this.props.settings = {
      ...this.props.settings,
      ...settings,
    };
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }
}
