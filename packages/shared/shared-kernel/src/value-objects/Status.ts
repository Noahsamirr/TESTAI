import { ValueObject, type ValueObjectProps } from './ValueObject';
import { DomainError } from '../primitives/DomainError';

export type ExecutionStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'paused'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'timeout'
  | 'flaky';

export type LifecycleStatus =
  | 'draft'
  | 'active'
  | 'archived'
  | 'deleted'
  | 'deprecated';

export type IssueStatus =
  | 'open'
  | 'investigating'
  | 'in_progress'
  | 'resolved'
  | 'verified'
  | 'closed'
  | 'reopened';

interface StatusProps extends ValueObjectProps {
  status: ExecutionStatus | LifecycleStatus | IssueStatus;
}

export class Status<T extends ExecutionStatus | LifecycleStatus | IssueStatus> extends ValueObject<StatusProps> {
  private constructor(props: StatusProps) {
    super(props);
  }

  public static createExecution(status: ExecutionStatus): Status<ExecutionStatus> {
    return new Status({ status });
  }

  public static createLifecycle(status: LifecycleStatus): Status<LifecycleStatus> {
    return new Status({ status });
  }

  public static createIssue(status: IssueStatus): Status<IssueStatus> {
    return new Status({ status });
  }

  public static executePending(): Status<ExecutionStatus> {
    return new Status({ status: 'pending' });
  }

  public static executeRunning(): Status<ExecutionStatus> {
    return new Status({ status: 'running' });
  }

  public static executePassed(): Status<ExecutionStatus> {
    return new Status({ status: 'passed' });
  }

  public static executeFailed(): Status<ExecutionStatus> {
    return new Status({ status: 'failed' });
  }

  public get status(): T {
    return this.props.status as T;
  }

  public isTerminal(): boolean {
    const terminal = new Set(['passed', 'failed', 'skipped', 'cancelled', 'timeout', 'flaky']);
    return terminal.has(this.props.status);
  }

  public isActive(): boolean {
    const active = new Set(['queued', 'running', 'paused']);
    return active.has(this.props.status);
  }

  public canTransitionTo(newStatus: Status<T>): boolean {
    const transitions: Record<string, Set<string>> = {
      pending: new Set(['queued', 'cancelled', 'running']),
      queued: new Set(['running', 'cancelled', 'pending']),
      running: new Set(['paused', 'passed', 'failed', 'skipped', 'cancelled', 'timeout', 'flaky']),
      paused: new Set(['running', 'cancelled']),
    };
    const allowed = transitions[this.props.status];
    if (!allowed) return false;
    return allowed.has(newStatus.status as string);
  }

  public transitionTo(newStatus: Status<T>): Status<T> {
    if (!this.canTransitionTo(newStatus)) {
      throw new DomainError(
        `Invalid status transition: ${this.props.status} → ${newStatus.status}`,
        'INVALID_STATUS_TRANSITION',
      );
    }
    return new Status({ status: newStatus.status });
  }

  public toString(): string {
    return this.props.status;
  }
}
