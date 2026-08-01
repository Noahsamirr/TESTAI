import type { Page, CursorPage } from './Common';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

export interface CursorPaginationParams<C = string> {
  cursor?: C;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 1000;

export function normalizePagination(params: PaginationParams): Required<Pick<PaginationParams, 'page' | 'pageSize'>> {
  const page = Math.max(1, Math.floor(params.page ?? DEFAULT_PAGE));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(params.pageSize ?? DEFAULT_PAGE_SIZE)));
  return { page, pageSize };
}

export function getOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function createPage<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Page<T> {
  const totalPages = Math.ceil(total / pageSize);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function createCursorPage<T, C = string>(
  items: T[],
  limit: number,
  cursors: { next?: C; prev?: C },
): CursorPage<T, C> {
  return {
    items: items.slice(0, limit),
    hasNext: items.length > limit,
    hasPrev: cursors.prev !== undefined,
    nextCursor: items.length > limit ? cursors.next : undefined,
    prevCursor: cursors.prev,
  };
}
