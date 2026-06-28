import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../core/apiClient';
import { USER_ENDPOINT } from '../config';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  balance: string;
  status: string;
}

interface PageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Custom hook xử lý logic gọi API danh sách user (phân trang + tìm kiếm).
// Mỗi module có hook riêng để tách logic khỏi giao diện.
export function useFetchUsers() {
  const [data, setData] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(USER_ENDPOINT, { params: { page, limit: 10, search } });
      setData(res.data.data);
      setMeta(res.data.meta);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  return { data, meta, loading, page, setPage, search, setSearch, refetch: fetchUsers };
}
