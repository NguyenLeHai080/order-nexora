import { useCallback, useEffect, useState } from 'react';
import { apiClient } from './apiClient';

export interface PageMeta {
  current_page: number;
  from: number | null;
  to: number | null;
  per_page: number;
  last_page: number;
  total: number;
}

export interface ListQuery {
  page: number;
  limit: number;
  search: string;
  status: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  [key: string]: string | number | undefined;
}

const DEFAULT_QUERY: ListQuery = {
  page: 1,
  limit: 10,
  search: '',
  status: '',
  sort_order: 'desc',
};

/**
 * Hook danh sách dùng chung cho mọi màn CRUD: phân trang + tìm kiếm + lọc + sort.
 * Tự bỏ param rỗng trước khi gọi API. Trả `refetch` để gọi lại sau khi sửa dữ liệu.
 */
export function useList<T = unknown>(endpoint: string, initial?: Partial<ListQuery>) {
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<ListQuery>({ ...DEFAULT_QUERY, ...initial });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(query)) {
        if (v !== '' && v !== undefined && v !== null) params[k] = v;
      }
      const res = await apiClient.get(endpoint, { params });
      setData(res.data.data ?? []);
      setMeta(res.data.meta ?? null);
    } catch (err: unknown) {
      setError(extractError(err));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, query]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const setPage = (page: number) => setQuery((q) => ({ ...q, page }));
  const setSearch = (search: string) => setQuery((q) => ({ ...q, search, page: 1 }));
  const setStatus = (status: string) => setQuery((q) => ({ ...q, status, page: 1 }));
  const patchQuery = (patch: Partial<ListQuery>) => setQuery((q) => ({ ...q, ...patch, page: 1 }));

  return {
    data,
    meta,
    loading,
    error,
    query,
    setPage,
    setSearch,
    setStatus,
    patchQuery,
    refetch: fetchData,
  };
}

/** Lấy message lỗi từ response envelope của backend. */
export function extractError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'Đã có lỗi xảy ra.';
}
