import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { ORGANIZATIONS_ENDPOINT } from '../config/organizationConfig';

export interface Org {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  parent_id: number | null;
  sort_order: number;
  depth: number;
  created_at: string | null;
}

export interface OrgTreeNode {
  id: number;
  name: string;
  slug: string;
  status: string;
  parent_id: number | null;
  children: OrgTreeNode[];
}

export interface OrgStats {
  total: number;
  active: number;
  inactive: number;
}

/** Danh sách + phân trang tổ chức. */
export function useOrganizations() {
  return useList<Org>(ORGANIZATIONS_ENDPOINT);
}

/** Dữ liệu phụ trợ: thống kê + danh sách phẳng để chọn tổ chức cha. */
export function useOrgAux() {
  const [stats, setStats] = useState<OrgStats>();
  const [options, setOptions] = useState<Org[]>([]);

  const load = useCallback(async () => {
    try {
      const [s, o] = await Promise.all([
        apiClient.get(`${ORGANIZATIONS_ENDPOINT}/stats`),
        apiClient.get(ORGANIZATIONS_ENDPOINT, { params: { limit: 100 } }),
      ]);
      setStats(s.data.data);
      setOptions(o.data.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { stats, options, reloadAux: load };
}

/** Cây tổ chức (nạp theo yêu cầu khi chuyển sang xem dạng cây). */
export function useOrgTree(enabled: boolean) {
  const [tree, setTree] = useState<OrgTreeNode[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await apiClient.get(`${ORGANIZATIONS_ENDPOINT}/tree`);
      setTree(r.data.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  return { tree, reloadTree: load };
}

/** Thao tác ghi dữ liệu tổ chức. */
export const orgActions = {
  create: (body: Record<string, unknown>) => apiClient.post(ORGANIZATIONS_ENDPOINT, body),
  update: (id: number, body: Record<string, unknown>) => apiClient.put(`${ORGANIZATIONS_ENDPOINT}/${id}`, body),
  remove: (id: number) => apiClient.delete(`${ORGANIZATIONS_ENDPOINT}/${id}`),
};
