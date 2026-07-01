import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { ENGAGEMENTS_ENDPOINT } from '../config/engagementConfig';

export interface Engagement {
  id: number;
  kind: string;
  target_type: string;
  target_id: number | null;
  rating: number | null;
  title: string | null;
  content: string;
  author_name: string;
  author_email: string | null;
  user_id: number | null;
  is_verified_purchase: boolean;
  status: string;
  admin_reply: string | null;
  admin_reply_at: string | null;
  admin_reply_by: number | null;
  organization_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Danh sách + phân trang tương tác. `kind` lọc theo tab (rỗng = tất cả). */
export function useEngagements(kind?: string) {
  return useList<Engagement>(ENGAGEMENTS_ENDPOINT, kind ? { kind } : undefined);
}

/** Thao tác quản lý tương tác. */
export const engagementActions = {
  approve: (id: number) => apiClient.patch(`${ENGAGEMENTS_ENDPOINT}/${id}/approve`),
  reject: (id: number) => apiClient.patch(`${ENGAGEMENTS_ENDPOINT}/${id}/reject`),
  reply: (id: number, admin_reply: string) => apiClient.patch(`${ENGAGEMENTS_ENDPOINT}/${id}/reply`, { admin_reply }),
  remove: (id: number) => apiClient.delete(`${ENGAGEMENTS_ENDPOINT}/${id}`),
};
