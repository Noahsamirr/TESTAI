export type SortDirection = 'asc' | 'desc';

export interface SortBy<K extends string = string> {
  field: K;
  direction: SortDirection;
}

export type SortCriteria<K extends string = string> = Array<SortBy<K>>;

export function createSort<K extends string>(
  field: K,
  direction: SortDirection = 'asc',
): SortBy<K> {
  return { field, direction };
}

export function parseSortString<K extends string = string>(sort: string): SortCriteria<K> {
  if (!sort) return [];
  return sort.split(',').map((part) => {
    const trimmed = part.trim();
    const isDesc = trimmed.startsWith('-');
    const field = (isDesc ? trimmed.slice(1) : trimmed) as K;
    return createSort<K>(field, isDesc ? 'desc' : 'asc');
  });
}

export function sortStringify<K extends string>(criteria: SortCriteria<K>): string {
  return criteria.map((s) => (s.direction === 'desc' ? `-${s.field}` : s.field)).join(',');
}
