import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../core/apiClient';
import { extractError } from '../../../core/useList';

export interface Role {
  id: number;
  name: string;
  description: string | null;
  permission_ids: number[];
  permissions: string[];
}

export interface Permission {
  id: number;
  name: string;
  description: string | null;
}

/** Nạp danh sách vai trò. */
export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiClient.get('/roles');
      setRoles(r.data.data ?? []);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { roles, loading, error, reload: load };
}

/** Nạp toàn bộ quyền (để tick chọn cho vai trò). */
export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    apiClient
      .get('/permissions')
      .then((r) => setPermissions(r.data.data ?? []))
      .catch(() => setPermissions([]));
  }, []);

  return permissions;
}

export async function saveRole(
  editing: Role | null,
  body: { name: string; description: string | null; permission_ids: number[] },
): Promise<void> {
  if (editing) await apiClient.put(`/roles/${editing.id}`, body);
  else await apiClient.post('/roles', body);
}

export async function deleteRole(id: number): Promise<void> {
  await apiClient.delete(`/roles/${id}`);
}
