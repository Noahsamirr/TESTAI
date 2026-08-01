import type { ISO8601Date, UserId, TenantId, JSONObject } from './Common';

export interface AuditInfo {
  createdBy?: UserId;
  createdAt: ISO8601Date;
  updatedBy?: UserId;
  updatedAt: ISO8601Date;
  deletedBy?: UserId;
  deletedAt?: ISO8601Date;
  tenantId?: TenantId;
}

export interface Auditable {
  audit: AuditInfo;
}

export interface AuditLogEntry {
  id: string;
  timestamp: ISO8601Date;
  actorId?: UserId;
  actorType: 'user' | 'system' | 'service' | 'ai';
  action: string;
  resourceType: string;
  resourceId?: string;
  tenantId?: TenantId;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  changes?: {
    before?: JSONObject;
    after?: JSONObject;
  };
  metadata?: JSONObject;
  status: 'success' | 'failure' | 'pending';
  failureReason?: string;
}

export interface ChangeTracker<T> {
  original: T;
  current: T;
  changes: Partial<T>;
  hasChanges(): boolean;
  getChangedFields(): (keyof T)[];
  commit(): void;
  rollback(): void;
}

export function createAuditInfo(createdBy?: UserId, tenantId?: TenantId): AuditInfo {
  const now = new Date().toISOString();
  return {
    createdBy,
    createdAt: now,
    updatedBy: createdBy,
    updatedAt: now,
    tenantId,
  };
}

export function touchAuditInfo(audit: AuditInfo, updatedBy?: UserId): AuditInfo {
  return {
    ...audit,
    updatedBy,
    updatedAt: new Date().toISOString(),
  };
}
