import type { Criteria, EntityId, Page } from '@testmind/shared-kernel';

import type { TestSuite } from '../testing/TestSuite';

export interface ITestSuiteRepository {
  findById(id: EntityId): Promise<TestSuite | null>;
  findMany(criteria?: Criteria): Promise<Page<TestSuite>>;
  save(testSuite: TestSuite): Promise<void>;
  delete(id: EntityId): Promise<void>;
}
