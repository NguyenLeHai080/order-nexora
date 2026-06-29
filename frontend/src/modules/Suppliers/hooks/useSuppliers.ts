import { useList } from '../../../core/useList';
import { apiClient } from '../../../core/apiClient';
import { SUPPLIERS_ENDPOINT } from '../config/supplierConfig';

export interface Supplier {
  id: number;
  name: string;
  driver: string;
  api_endpoint: string | null;
  environment: string;
  status: string;
  note: string | null;
  created_at: string | null;
  has_api_key_test?: boolean;
  has_api_key_live?: boolean;
  has_webhook_secret_test?: boolean;
  has_webhook_secret_live?: boolean;
}

/** Hook danh sách nhà cung cấp. */
export function useSuppliers() {
  return useList<Supplier>(SUPPLIERS_ENDPOINT);
}

/** Thao tác ghi của module Suppliers. */
export const supplierActions = {
  create: (body: Record<string, unknown>) => apiClient.post(SUPPLIERS_ENDPOINT, body),
  update: (id: number, body: Record<string, unknown>) =>
    apiClient.put(`${SUPPLIERS_ENDPOINT}/${id}`, body),
  remove: (id: number) => apiClient.delete(`${SUPPLIERS_ENDPOINT}/${id}`),
};
