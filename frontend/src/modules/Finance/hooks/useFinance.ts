import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import {
  FINANCE_CASH_ENTRIES_ENDPOINT,
  FINANCE_OVERVIEW_ENDPOINT,
  FINANCE_SETTLEMENTS_ENDPOINT,
  FINANCE_SUPPLIER_DEBT_ENDPOINT,
  FINANCE_WALLET_ENDPOINT,
  FINANCE_WITHDRAWALS_ENDPOINT,
} from '../config/financeConfig';

export interface FinanceOverview {
  owner_wallet_user_id: number | null;
  owner_wallet_balance: string | null;
  cash_income: string;
  cash_expense: string;
  cash_net: string;
  withdrawal_pending_amount: string;
  withdrawal_pending_count: number;
  supplier_outstanding: string;
  total_wallet_balance: string;
}

export interface WalletTxn {
  id: number;
  user_id: number;
  type: string;
  direction: string;
  amount: string;
  balance_after: string;
  ref_type: string | null;
  ref_id: number | null;
  note: string | null;
  actor_id: number | null;
  created_at: string | null;
}

export interface CashEntry {
  id: number;
  kind: string;
  amount: string;
  category: string | null;
  note: string | null;
  occurred_on: string;
  actor_id: number | null;
  created_at: string | null;
}

export interface Withdrawal {
  id: number;
  user_id: number;
  amount: string;
  status: string;
  bank_info: string | null;
  note: string | null;
  actor_id: number | null;
  processed_at: string | null;
  created_at: string | null;
}

export interface SupplierDebt {
  supplier_id: number;
  supplier_name: string;
  payable: string;
  settled: string;
  outstanding: string;
}

/** Số liệu tổng quan tài chính (không phân trang). */
export function useFinanceOverview() {
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get(FINANCE_OVERVIEW_ENDPOINT);
      setData(r.data.data ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, reload: load };
}

/** Sổ cái ví — phân trang + lọc user_id/type. */
export function useWalletLedger() {
  return useList<WalletTxn>(FINANCE_WALLET_ENDPOINT);
}

/** Phiếu thu/chi thủ công — phân trang + lọc kind. */
export function useCashEntries() {
  return useList<CashEntry>(FINANCE_CASH_ENTRIES_ENDPOINT);
}

/** Yêu cầu rút tiền — phân trang + lọc status. */
export function useWithdrawals() {
  return useList<Withdrawal>(FINANCE_WITHDRAWALS_ENDPOINT);
}

/** Công nợ phải trả từng NCC (không phân trang). */
export function useSupplierDebt() {
  const [data, setData] = useState<SupplierDebt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get(FINANCE_SUPPLIER_DEBT_ENDPOINT);
      setData(r.data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, reload: load };
}

/** Thao tác ghi dữ liệu tài chính. */
export const financeActions = {
  createCashEntry: (body: Record<string, unknown>) =>
    apiClient.post(FINANCE_CASH_ENTRIES_ENDPOINT, body),
  updateCashEntry: (id: number, body: Record<string, unknown>) =>
    apiClient.put(`${FINANCE_CASH_ENTRIES_ENDPOINT}/${id}`, body),
  deleteCashEntry: (id: number) => apiClient.delete(`${FINANCE_CASH_ENTRIES_ENDPOINT}/${id}`),
  createWithdrawal: (body: Record<string, unknown>) =>
    apiClient.post(FINANCE_WITHDRAWALS_ENDPOINT, body),
  payWithdrawal: (id: number) => apiClient.post(`${FINANCE_WITHDRAWALS_ENDPOINT}/${id}/pay`),
  rejectWithdrawal: (id: number, body: { note: string | null }) =>
    apiClient.post(`${FINANCE_WITHDRAWALS_ENDPOINT}/${id}/reject`, body),
  createSettlement: (body: Record<string, unknown>) =>
    apiClient.post(FINANCE_SETTLEMENTS_ENDPOINT, body),
};
