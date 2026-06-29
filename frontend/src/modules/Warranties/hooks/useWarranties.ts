import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { WARRANTIES_ENDPOINT } from '../config/warrantyConfig';

export interface Warranty {
  id: number;
  code: string;
  order_id: number | null;
  product_name: string;
  user_id: number | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  claim_note: string | null;
  created_at: string | null;
}

/** Danh sách + phân trang bảo hành. */
export function useWarranties() {
  return useList<Warranty>(WARRANTIES_ENDPOINT);
}

/** Thao tác ghi của module Warranties. */
export const warrantyActions = {
  claim: (id: number, claim_note: string) =>
    apiClient.post(`${WARRANTIES_ENDPOINT}/${id}/claim`, { claim_note }),
  void: (id: number) => apiClient.post(`${WARRANTIES_ENDPOINT}/${id}/void`),
};
