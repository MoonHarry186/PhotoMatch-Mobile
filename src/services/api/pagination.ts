export type CursorPage<T> = { items: T[]; nextCursor?: string | null };
export type NumberedPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export function nextCursor<T>(page: CursorPage<T>): string | undefined {
  return page.nextCursor ?? undefined;
}

export function nextPage<T>(page: NumberedPage<T>): number | undefined {
  const consumed = page.page * page.pageSize;
  return consumed < page.total ? page.page + 1 : undefined;
}

export function serverFiltersOnly<T extends object>(filters: T): Readonly<T> {
  return Object.freeze({ ...filters });
}
