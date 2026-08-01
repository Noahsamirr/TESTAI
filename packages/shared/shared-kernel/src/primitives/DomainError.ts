export class DomainError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string = 'DOMAIN_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

export class NotFoundError extends DomainError {
  constructor(entityName: string, id?: string) {
    super(`${entityName} not found${id ? `: ${id}` : ''}`, 'NOT_FOUND', { entityName, id });
  }
}

export class ValidationError extends DomainError {
  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`, 'VALIDATION_ERROR', { field, message });
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends DomainError {
  constructor(action: string, resource?: string) {
    super(
      `Forbidden: cannot ${action}${resource ? ` on ${resource}` : ''}`,
      'FORBIDDEN',
      { action, resource },
    );
  }
}

export class ConflictError extends DomainError {
  constructor(resource: string, reason: string) {
    super(`Conflict on ${resource}: ${reason}`, 'CONFLICT', { resource, reason });
  }
}
