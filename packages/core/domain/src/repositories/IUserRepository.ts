import type { Criteria, EntityId, Page } from '@testmind/shared-kernel';

import type { User } from '../identity/User';

export interface IUserRepository {
  findById(id: EntityId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(criteria?: Criteria): Promise<Page<User>>;
  save(user: User): Promise<void>;
  delete(id: EntityId): Promise<void>;
}
