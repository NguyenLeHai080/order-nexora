import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../core/apiClient';
import { extractError } from '../../../core/useList';
import { MAINTENANCE_ENDPOINT, SETTINGS_ENDPOINT } from '../config/settingConfig';

export interface Setting {
  key: string;
  value: string;
  description: string | null;
}

export interface Toast {
  type: string;
  msg: string;
}

/** Nạp danh sách cấu hình + trạng thái bảo trì, kèm toast thông báo. */
export function useSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, m] = await Promise.all([
        apiClient.get(SETTINGS_ENDPOINT),
        apiClient.get(MAINTENANCE_ENDPOINT),
      ]);
      setSettings(s.data.data ?? []);
      setMaintenance(m.data.data?.enabled ?? false);
    } catch (err) {
      setToast({ type: 'danger', msg: extractError(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const notify = useCallback((type: string, msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const toggleMaintenance = useCallback(async () => {
    const next = !maintenance;
    try {
      await apiClient.post(MAINTENANCE_ENDPOINT, { enabled: next });
      setMaintenance(next);
      notify('success', next ? 'Đã bật chế độ bảo trì.' : 'Đã tắt chế độ bảo trì.');
    } catch (err) {
      notify('danger', extractError(err));
    }
  }, [maintenance, notify]);

  const saveSetting = useCallback(
    async (key: string, value: string, description: string | null) => {
      setSavingKey(key);
      try {
        await apiClient.put(SETTINGS_ENDPOINT, { key, value, description });
        notify('success', `Đã lưu "${key}".`);
        await load();
      } catch (err) {
        notify('danger', extractError(err));
      } finally {
        setSavingKey(null);
      }
    },
    [load, notify],
  );

  return { settings, maintenance, loading, savingKey, toast, toggleMaintenance, saveSetting };
}
