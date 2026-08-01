import {
  AggregateRoot,
  EntityId,
  createAuditInfo,
  touchAuditInfo,
  type AuditInfo,
  type EntityProps,
} from '@testmind/shared-kernel';

export type TestSuiteStatus = 'draft' | 'active' | 'archived';

export interface TestSuiteProps extends EntityProps {
  name: string;
  description?: string;
  module?: string;
  testCaseIds: EntityId[];
  tags: string[];
  ownerId?: EntityId;
  status: TestSuiteStatus;
  audit: AuditInfo;
}

export class TestSuite extends AggregateRoot<TestSuiteProps> {
  private constructor(props: TestSuiteProps) {
    super(props);
  }

  public static create(params: {
    name: string;
    description?: string;
    module?: string;
    ownerId?: EntityId;
    tags?: string[];
    createdBy?: EntityId;
  }): TestSuite {
    return new TestSuite({
      id: EntityId.generate(),
      name: params.name,
      description: params.description,
      module: params.module,
      testCaseIds: [],
      tags: params.tags ?? [],
      ownerId: params.ownerId,
      status: 'draft',
      audit: createAuditInfo(params.createdBy?.value),
    });
  }

  public addTestCase(testCaseId: EntityId, actorId?: EntityId): void {
    if (!this.props.testCaseIds.some((id) => id.equals(testCaseId))) {
      this.props.testCaseIds.push(testCaseId);
      this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
      this.touch();
    }
  }

  public removeTestCase(testCaseId: EntityId, actorId?: EntityId): void {
    this.props.testCaseIds = this.props.testCaseIds.filter((id) => !id.equals(testCaseId));
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public publish(actorId?: EntityId): void {
    this.props.status = 'active';
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }

  public archive(actorId?: EntityId): void {
    this.props.status = 'archived';
    this.props.audit = touchAuditInfo(this.props.audit, actorId?.value);
    this.touch();
  }
}
