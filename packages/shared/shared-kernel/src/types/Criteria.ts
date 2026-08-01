import type { JSONObject } from './Common';
import type { SortCriteria } from './Sorting';
import type { PaginationParams, CursorPaginationParams } from './Pagination';

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'between'
  | 'isNull'
  | 'isNotNull'
  | 'regex'
  | 'raw';

export type LogicalOperator = 'AND' | 'OR' | 'NOT';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: unknown;
  values?: unknown[];
}

export interface FilterGroup {
  operator: LogicalOperator;
  conditions: Array<FilterCondition | FilterGroup>;
}

export type WhereClause = FilterCondition | FilterGroup;

export interface Criteria<S extends string = string> {
  where?: WhereClause;
  sort?: SortCriteria<S>;
  pagination?: PaginationParams;
  cursorPagination?: CursorPaginationParams;
  include?: string[];
  select?: string[];
  params?: JSONObject;
}

export function eq(field: string, value: unknown): FilterCondition {
  return { field, operator: 'eq', value };
}

export function neq(field: string, value: unknown): FilterCondition {
  return { field, operator: 'neq', value };
}

export function gt(field: string, value: unknown): FilterCondition {
  return { field, operator: 'gt', value };
}

export function gte(field: string, value: unknown): FilterCondition {
  return { field, operator: 'gte', value };
}

export function lt(field: string, value: unknown): FilterCondition {
  return { field, operator: 'lt', value };
}

export function lte(field: string, value: unknown): FilterCondition {
  return { field, operator: 'lte', value };
}

export function isIn(field: string, values: unknown[]): FilterCondition {
  return { field, operator: 'in', values };
}

export function contains(field: string, value: string): FilterCondition {
  return { field, operator: 'contains', value };
}

export function and(...conditions: Array<FilterCondition | FilterGroup>): FilterGroup {
  return { operator: 'AND', conditions };
}

export function or(...conditions: Array<FilterCondition | FilterGroup>): FilterGroup {
  return { operator: 'OR', conditions };
}

export function not(condition: FilterCondition | FilterGroup): FilterGroup {
  return { operator: 'NOT', conditions: [condition] };
}
