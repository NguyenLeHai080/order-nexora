import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { VOUCHERS_ENDPOINT } from '../config/voucherConfig';

export interface Voucher {
  id: number;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: string;
  max_discount: string;
  usage_limit: number;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
}

/** Danh sách + phân trang voucher. */
export function useVouchers() {
  return useList<Voucher>(VOUCHERS_ENDPOINT);
}

/** Thao tác ghi dữ liệu voucher. */
export const voucherActions = {
  create: (body: Record<string, unknown>) => apiClient.post(VOUCHERS_ENDPOINT, body),
  update: (id: number, body: Record<string, unknown>) => apiClient.put(`${VOUCHERS_ENDPOINT}/${id}`, body),
  remove: (id: number) => apiClient.delete(`${VOUCHERS_ENDPOINT}/${id}`),
};
