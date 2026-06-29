import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { INVOICES_ENDPOINT } from '../config/invoiceConfig';

export interface Invoice {
  id: number;
  code: string;
  order_id: number | null;
  user_id: number | null;
  customer_name: string | null;
  customer_email: string | null;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  discount: string;
  total: string;
  status: string;
  issued_at: string | null;
  created_at: string | null;
}

/** Danh sách + phân trang hóa đơn. */
export function useInvoices() {
  return useList<Invoice>(INVOICES_ENDPOINT);
}

/** Lấy chi tiết một hóa đơn (để in). */
export const invoiceActions = {
  detail: (id: number) => apiClient.get(`${INVOICES_ENDPOINT}/${id}`),
};
