import {
  Entity,
  EntityId,
  createAuditInfo,
  touchAuditInfo,
  type AuditInfo,
  type EntityProps,
} from '@testmind/shared-kernel';

export type PermissionScope = 'global' | 'tenant' | 'organization' | 'project' | 'own';

export interface PermissionProps extends EntityProps {
  resource: string;
  action: string;
  scope: PermissionScope;
  description?: string;
  conditions?: Record<string, unknown>;
  audit: AuditInfo;
}

export class Permission extends Entity<PermissionProps> {
  private constructor(props: PermissionProps) {
    super(props);
  }

  public static create(params: {
    resource: string;
    action: string;
    scope?: PermissionScope;
    description?: string;
    conditions?: Record<string, unknown>;
    createdBy?: EntityId;
  }): Permission {
    return new Permission({
      id: EntityId.generate(),
      resource: params.resource,
      action: params.action,
      scope: params.scope ?? 'organization',
      description: params.description,
      conditions: params.conditions,
      audit: createAuditInfo(params.createdBy?.value),
    });
  }

  get key(): string {
    return `${this.props.resource}:${this.props.action}:${this.props.scope}`;
  }

  public matches(resource: string, action: string, scope?: PermissionScope): boolean {
    return (
      this.props.resource === resource &&
      this.props.action === action &&
      (scope === undefined || this.props.scope === scope)
    );
  }

  public updateDescription(description?: string, actorId?: EntityId): void {
    this.props.description = description;
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }
}
