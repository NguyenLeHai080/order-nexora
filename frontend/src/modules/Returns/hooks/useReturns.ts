import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { RETURNS_ENDPOINT } from '../config/returnConfig';

export interface ReturnRequest {
  id: number;
  code: string;
  order_id: number | null;
  user_id: number | null;
  kind: string;
  reason: string | null;
  status: string;
  refund_amount: string;
  exchange_product_id: number | null;
  resolution_note: string | null;
  created_at: string | null;
}

/** Danh sách + phân trang yêu cầu đổi/trả. */
export function useReturns() {
  return useList<ReturnRequest>(RETURNS_ENDPOINT);
}

/** Thao tác ghi của module Returns. */
export const returnActions = {
  create: (body: { order_id: number; kind: string; reason?: string; exchange_product_id?: number | null }) =>
    apiClient.post(RETURNS_ENDPOINT, body),
  approve: (id: number) => apiClient.post(`${RETURNS_ENDPOINT}/${id}/approve`),
  reject: (id: number, resolution_note?: string) =>
    apiClient.post(`${RETURNS_ENDPOINT}/${id}/reject`, { resolution_note }),
  complete: (id: number) => apiClient.post(`${RETURNS_ENDPOINT}/${id}/complete`),
};
