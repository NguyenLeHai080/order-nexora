import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { PRODUCTS_ENDPOINT } from '../config/productConfig';

export interface Product {
  id: number;
  name: string;
  name_en?: string | null;
  category_name?: string | null;
  base_price: string;
  regular_price?: string | null;
  provider_discount_percent?: string | null;
  delivery_type?: string | null;
  provider_quantity?: number | null;
  markup_percent: string;
  markup_amount: string;
  sale_price: string;
  stock_status: string;
  status: string;
  sold_count: number;
  quantity: number;
  low_stock_threshold?: number;
  warranty_days: number;
  supplier_id: number | null;
  supplier_name?: string | null;
  external_id?: string | null;
}

/** Danh sách + phân trang sản phẩm. */
export function useProducts() {
  return useList<Product>(PRODUCTS_ENDPOINT);
}

/** Thao tác ghi dữ liệu sản phẩm. */
export const productActions = {
  create: (body: Record<string, unknown>) => apiClient.post(PRODUCTS_ENDPOINT, body),
  update: (id: number, body: Record<string, unknown>) => apiClient.put(`${PRODUCTS_ENDPOINT}/${id}`, body),
  remove: (id: number) => apiClient.delete(`${PRODUCTS_ENDPOINT}/${id}`),
  /** Đồng bộ catalog từ nhà cung cấp (driver vdstore) -> Product. */
  syncCatalog: (supplierId: number) => apiClient.post(`/partner/${supplierId}/sync-catalog`),
};
