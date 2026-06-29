import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { PAYMENTS_BANKS_ENDPOINT, PAYMENTS_DEPOSITS_ENDPOINT } from '../config/paymentConfig';

export interface Bank {
  id: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  qr_image_url: string | null;
  status: string;
}

export interface Deposit {
  id: number;
  user_id: number;
  amount: string;
  reference_code: string;
  method: string;
  status: string;
  note: string | null;
  created_at: string | null;
}

/** Danh sách ngân hàng nhận tiền (không phân trang). */
export function useBanks() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get(PAYMENTS_BANKS_ENDPOINT);
      setBanks(r.data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { banks, loading, reload: load };
}

/** Danh sách + phân trang lịch sử nạp tiền. */
export function useDeposits() {
  return useList<Deposit>(PAYMENTS_DEPOSITS_ENDPOINT);
}

/** Thao tác ghi ngân hàng + xác nhận nạp tiền. */
export const paymentActions = {
  createBank: (body: Record<string, unknown>) => apiClient.post(PAYMENTS_BANKS_ENDPOINT, body),
  updateBank: (id: number, body: Record<string, unknown>) => apiClient.put(`${PAYMENTS_BANKS_ENDPOINT}/${id}`, body),
  removeBank: (id: number) => apiClient.delete(`${PAYMENTS_BANKS_ENDPOINT}/${id}`),
  confirmDeposit: (id: number, body: { status: string; note: string | null }) =>
    apiClient.post(`${PAYMENTS_DEPOSITS_ENDPOINT}/${id}/confirm`, body),
};
