export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export function buildQueryString<T extends object>(params?: T): string {
  const source = (params || {}) as Record<string, QueryValue>;
  const searchParams = new URLSearchParams();
  Object.entries(source).forEach(([key, value]) => {
    if (value == null || value === '' || value === false) return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function buildQueryParamsKey<T extends object>(params: T | undefined, fallback = 'default'): string {
  const source = (params || {}) as Record<string, QueryValue>;
  const searchParams = new URLSearchParams();
  Object.entries(source).forEach(([key, value]) => {
    if (value == null || value === '' || value === false) return;
    searchParams.set(key, String(value));
  });
  return searchParams.toString() || fallback;
}
