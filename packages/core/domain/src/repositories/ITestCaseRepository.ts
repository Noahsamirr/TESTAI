import type { Criteria, EntityId, Page } from '@testmind/shared-kernel';

import type { TestCase } from '../testing/TestCase';

export interface ITestCaseRepository {
  findById(id: EntityId): Promise<TestCase | null>;
  findBySuiteId(suiteId: EntityId): Promise<TestCase[]>;
  findMany(criteria?: Criteria): Promise<Page<TestCase>>;
  save(testCase: TestCase): Promise<void>;
  delete(id: EntityId): Promise<void>;
}
