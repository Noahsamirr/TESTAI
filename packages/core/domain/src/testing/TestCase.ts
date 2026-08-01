import {
  AggregateRoot,
  EntityId,
  Priority,
  createAuditInfo,
  touchAuditInfo,
  type AuditInfo,
  type EntityProps,
} from '@testmind/shared-kernel';

import { TestStep } from './TestStep';

export type TestCaseType =
  | 'e2e'
  | 'integration'
  | 'unit'
  | 'smoke'
  | 'regression'
  | 'performance'
  | 'security'
  | 'accessibility'
  | 'visual'
  | 'mobile'
  | 'api';

export type AutomationStatus = 'automatable' | 'manual' | 'partially_automatable' | 'blocked';

export interface TestCaseProps extends EntityProps {
  suiteId?: EntityId;
  title: string;
  description?: string;
  type: TestCaseType;
  priority: Priority;
  preconditions: string[];
  steps: TestStep[];
  expectedOutcome: string;
  tags: string[];
  automationStatus: AutomationStatus;
  estimatedDurationMs?: number;
  module?: string;
  coverageArea?: string;
  requirementIds: EntityId[];
  audit: AuditInfo;
}

export class TestCase extends AggregateRoot<TestCaseProps> {
  private constructor(props: TestCaseProps) {
    super(props);
  }

  public static create(params: {
    title: string;
    description?: string;
    type: TestCaseType;
    priority?: Priority;
    preconditions?: string[];
    steps?: TestStep[];
    expectedOutcome: string;
    tags?: string[];
    automationStatus?: AutomationStatus;
    estimatedDurationMs?: number;
    module?: string;
    coverageArea?: string;
    requirementIds?: EntityId[];
    createdBy?: EntityId;
  }): TestCase {
    return new TestCase({
      id: EntityId.generate(),
      title: params.title,
      description: params.description,
      type: params.type,
      priority: params.priority ?? Priority.medium(),
      preconditions: params.preconditions ?? [],
      steps: params.steps ?? [],
      expectedOutcome: params.expectedOutcome,
      tags: params.tags ?? [],
      automationStatus: params.automationStatus ?? 'automatable',
      estimatedDurationMs: params.estimatedDurationMs,
      module: params.module,
      coverageArea: params.coverageArea,
      requirementIds: params.requirementIds ?? [],
      audit: createAuditInfo(params.createdBy?.value),
    });
  }

  public addPrecondition(precondition: string, actorId?: EntityId): void {
    this.props.preconditions.push(precondition);
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public addStep(step: TestStep, actorId?: EntityId): void {
    this.props.steps.push(step);
    this.props.steps.sort((a, b) => a.stepNumber - b.stepNumber);
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public replaceSteps(steps: TestStep[], actorId?: EntityId): void {
    this.props.steps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public addTag(tag: string, actorId?: EntityId): void {
    if (!this.props.tags.includes(tag)) {
      this.props.tags.push(tag);
      this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
      this.touch();
    }
  }

  public markAutomationStatus(status: AutomationStatus, actorId?: EntityId): void {
    this.props.automationStatus = status;
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }
}
