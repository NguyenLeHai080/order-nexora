import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { LOG_ACTIVITIES_ENDPOINT } from '../config/logConfig';

export interface LogItem {
  id: number;
  description: string;
  user_name: string;
  route: string;
  method_type: string;
  status_code: number;
  ip_address: string;
  country: string;
  user_agent: string;
  request_data: unknown;
  created_at: string | null;
}

/** Danh sách + phân trang nhật ký hoạt động. */
export function useLogActivities() {
  return useList<LogItem>(LOG_ACTIVITIES_ENDPOINT);
}

/** Thao tác xóa log đơn lẻ / xóa toàn bộ. */
export const logActions = {
  remove: (id: number) => apiClient.delete(`${LOG_ACTIVITIES_ENDPOINT}/${id}`),
  clearAll: () => apiClient.post(`${LOG_ACTIVITIES_ENDPOINT}/clear`),
};
