import {
  AggregateRoot,
  EntityId,
  createAuditInfo,
  touchAuditInfo,
  type AuditInfo,
  type EntityProps,
} from '@testmind/shared-kernel';

export interface RoleProps extends EntityProps {
  organizationId?: EntityId;
  tenantId?: EntityId;
  name: string;
  description?: string;
  permissionIds: EntityId[];
  isSystem: boolean;
  audit: AuditInfo;
}

export class Role extends AggregateRoot<RoleProps> {
  private constructor(props: RoleProps) {
    super(props);
  }

  public static create(params: {
    name: string;
    description?: string;
    permissionIds?: EntityId[];
    organizationId?: EntityId;
    tenantId?: EntityId;
    isSystem?: boolean;
    createdBy?: EntityId;
  }): Role {
    return new Role({
      id: EntityId.generate(),
      organizationId: params.organizationId,
      tenantId: params.tenantId,
      name: params.name,
      description: params.description,
      permissionIds: params.permissionIds ?? [],
      isSystem: params.isSystem ?? false,
      audit: createAuditInfo(params.createdBy?.value, params.tenantId?.value),
    });
  }

  get name(): string {
    return this.props.name;
  }

  get permissionIds(): EntityId[] {
    return [...this.props.permissionIds];
  }

  public rename(name: string, actorId?: EntityId): void {
    this.props.name = name;
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public updateDescription(description?: string, actorId?: EntityId): void {
    this.props.description = description;
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public addPermission(permissionId: EntityId, actorId?: EntityId): void {
    if (!this.props.permissionIds.some((id) => id.equals(permissionId))) {
      this.props.permissionIds.push(permissionId);
      this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
      this.touch();
    }
  }

  public removePermission(permissionId: EntityId, actorId?: EntityId): void {
    this.props.permissionIds = this.props.permissionIds.filter((id) => !id.equals(permissionId));
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }
}
