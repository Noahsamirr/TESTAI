import { AggregateRoot, EmailAddress, EntityId, type EntityProps } from '@testmind/shared-kernel';
import { type AuditInfo, createAuditInfo, touchAuditInfo } from '@testmind/shared-kernel';

export type UserStatus = 'pending' | 'active' | 'inactive' | 'suspended' | 'banned';

export type AuthProvider = 'email' | 'google' | 'github' | 'microsoft' | 'sso' | 'okta' | 'keycloak';

export type UserPreferences = {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    slack?: boolean;
    testFailure: boolean;
    aiSuggestions: boolean;
    weeklyDigest: boolean;
  };
  defaultFramework?: string;
  codeEditor: 'monaco' | 'prism' | 'plain';
};

export interface UserProps extends EntityProps {
  organizationId?: EntityId;
  tenantId?: EntityId;
  roleIds: EntityId[];
  email: EmailAddress;
  fullName: string;
  displayName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  status: UserStatus;
  authProviders: AuthProvider[];
  passwordHash?: string;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  emailVerifiedAt?: Date;
  mfaEnabled: boolean;
  mfaType?: 'totp' | 'sms' | 'email' | 'webauthn';
  preferences: UserPreferences;
  apiTokenCount: number;
  storageUsedBytes: number;
  audit: AuditInfo;
}

export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps) {
    super(props);
  }

  public static create(params: {
    email: EmailAddress;
    fullName: string;
    organizationId?: EntityId;
    tenantId?: EntityId;
    roleIds?: EntityId[];
    displayName?: string;
    authProvider?: AuthProvider;
    createdBy?: EntityId;
  }): User {
    const preferences: UserPreferences = {
      theme: 'system',
      language: 'en-US',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notifications: {
        email: true,
        push: true,
        testFailure: true,
        aiSuggestions: true,
        weeklyDigest: false,
      },
      codeEditor: 'monaco',
    };

    return new User({
      id: EntityId.generate(),
      organizationId: params.organizationId,
      tenantId: params.tenantId,
      roleIds: params.roleIds ?? [],
      email: params.email,
      fullName: params.fullName,
      displayName: params.displayName ?? params.fullName,
      status: 'pending',
      authProviders: params.authProvider ? [params.authProvider] : ['email'],
      failedLoginAttempts: 0,
      mfaEnabled: false,
      preferences,
      apiTokenCount: 0,
      storageUsedBytes: 0,
      audit: createAuditInfo(params.createdBy?.value, params.tenantId?.value),
    });
  }

  get organizationId(): EntityId | undefined {
    return this.props.organizationId;
  }

  get tenantId(): EntityId | undefined {
    return this.props.tenantId;
  }

  get roleIds(): EntityId[] {
    return [...this.props.roleIds];
  }

  get email(): EmailAddress {
    return this.props.email;
  }

  get fullName(): string {
    return this.props.fullName;
  }

  get displayName(): string {
    return this.props.displayName ?? this.props.fullName;
  }

  get avatarUrl(): string | undefined {
    return this.props.avatarUrl;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get authProviders(): AuthProvider[] {
    return [...this.props.authProviders];
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  get mfaEnabled(): boolean {
    return this.props.mfaEnabled;
  }

  get preferences(): UserPreferences {
    return { ...this.props.preferences };
  }

  get isActive(): boolean {
    return this.props.status === 'active' && !this.props.lockedUntil;
  }

  get isVerified(): boolean {
    return this.props.emailVerifiedAt !== undefined;
  }

  public activate(actorId?: EntityId): void {
    this.props.status = 'active';
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public deactivate(actorId?: EntityId): void {
    this.props.status = 'inactive';
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public suspend(actorId?: EntityId): void {
    this.props.status = 'suspended';
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public recordLogin(ip: string, provider: AuthProvider): void {
    this.props.lastLoginAt = new Date();
    this.props.lastLoginIp = ip;
    this.props.failedLoginAttempts = 0;
    if (!this.props.authProviders.includes(provider)) {
      this.props.authProviders.push(provider);
    }
    this.touch();
  }

  public recordFailedLogin(maxAttempts: number = 5, lockDurationMs: number = 30 * 60 * 1000): boolean {
    this.props.failedLoginAttempts++;
    if (this.props.failedLoginAttempts >= maxAttempts) {
      this.props.lockedUntil = new Date(Date.now() + lockDurationMs);
    }
    this.touch();
    return this.props.lockedUntil !== undefined;
  }

  public isLocked(): boolean {
    if (!this.props.lockedUntil) return false;
    if (this.props.lockedUntil.getTime() > Date.now()) return true;
    this.props.lockedUntil = undefined;
    this.props.failedLoginAttempts = 0;
    return false;
  }

  public verifyEmail(): void {
    this.props.emailVerifiedAt = new Date();
    if (this.props.status === 'pending') {
      this.props.status = 'active';
    }
    this.touch();
  }

  public enableMfa(type: 'totp' | 'sms' | 'email' | 'webauthn'): void {
    this.props.mfaEnabled = true;
    this.props.mfaType = type;
    this.touch();
  }

  public disableMfa(): void {
    this.props.mfaEnabled = false;
    this.props.mfaType = undefined;
    this.touch();
  }

  public setPasswordHash(hash: string): void {
    this.props.passwordHash = hash;
    this.touch();
  }

  get passwordHash(): string | undefined {
    return this.props.passwordHash;
  }

  public addRole(roleId: EntityId): void {
    if (!this.props.roleIds.some((r) => r.equals(roleId))) {
      this.props.roleIds.push(roleId);
      this.touch();
    }
  }

  public removeRole(roleId: EntityId): void {
    this.props.roleIds = this.props.roleIds.filter((r) => !r.equals(roleId));
    this.touch();
  }

  public updatePreferences(updates: Partial<UserPreferences>): void {
    this.props.preferences = {
      ...this.props.preferences,
      ...updates,
      notifications: {
        ...this.props.preferences.notifications,
        ...updates.notifications,
      },
    };
    this.touch();
  }

  public updateProfile(updates: {
    fullName?: string;
    displayName?: string;
    avatarUrl?: string;
    phoneNumber?: string;
  }): void {
    if (updates.fullName) this.props.fullName = updates.fullName;
    if (updates.displayName) this.props.displayName = updates.displayName;
    if (updates.avatarUrl) this.props.avatarUrl = updates.avatarUrl;
    if (updates.phoneNumber) this.props.phoneNumber = updates.phoneNumber;
    this.touch();
  }

  public incrementApiTokenCount(delta: number = 1): void {
    this.props.apiTokenCount = Math.max(0, this.props.apiTokenCount + delta);
    this.touch();
  }

  public updateStorageUsed(bytes: number): void {
    this.props.storageUsedBytes = Math.max(0, bytes);
    this.touch();
  }
}
