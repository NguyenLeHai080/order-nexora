import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { USERS_ENDPOINT } from '../config/userConfig';
import type { UserRow } from '../components/UserFormModal';

export interface UserFull extends UserRow {
  created_at: string | null;
}

export interface UserStats {
  total: number;
  active: number;
  locked: number;
}

/** Hook danh sách người dùng + thống kê. Gộp logic gọi API của module. */
export function useUsers() {
  const list = useList<UserFull>(USERS_ENDPOINT);
  const [stats, setStats] = useState<UserStats>();

  const loadStats = useCallback(async () => {
    try {
      const r = await apiClient.get(`${USERS_ENDPOINT}/stats`);
      setStats(r.data.data);
    } catch {
      /* bỏ qua nếu không có quyền */
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  /** Gọi lại cả danh sách lẫn thống kê sau khi thay đổi dữ liệu. */
  const refresh = useCallback(() => {
    void list.refetch();
    void loadStats();
  }, [list, loadStats]);

  return { ...list, stats, loadStats, refresh };
}

/** Các thao tác ghi của module Users (xóa, bulk, chỉnh số dư). */
export const userActions = {
  remove: (id: number) => apiClient.delete(`${USERS_ENDPOINT}/${id}`),
  bulkDelete: (ids: number[]) => apiClient.post(`${USERS_ENDPOINT}/bulk-delete`, { ids }),
  bulkStatus: (ids: number[], status: string) =>
    apiClient.patch(`${USERS_ENDPOINT}/bulk-status`, { ids, status }),
  adjustBalance: (id: number, amount: number, note: string | null) =>
    apiClient.post(`${USERS_ENDPOINT}/${id}/balance`, { amount, note }),
};
