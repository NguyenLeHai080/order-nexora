import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { CATEGORIES_ENDPOINT } from '../config/categoryConfig';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  status: string;
  product_count: number;
  organization_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Danh sách + phân trang danh mục. */
export function useCategories() {
  return useList<Category>(CATEGORIES_ENDPOINT);
}

/** Thao tác ghi dữ liệu danh mục. */
export const categoryActions = {
  create: (body: Record<string, unknown>) => apiClient.post(CATEGORIES_ENDPOINT, body),
  update: (id: number, body: Record<string, unknown>) => apiClient.put(`${CATEGORIES_ENDPOINT}/${id}`, body),
  remove: (id: number) => apiClient.delete(`${CATEGORIES_ENDPOINT}/${id}`),
};
