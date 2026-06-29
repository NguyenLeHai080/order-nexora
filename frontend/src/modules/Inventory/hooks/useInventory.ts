import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { INVENTORY_ENDPOINT } from '../config/inventoryConfig';

export interface StockMovement {
  id: number;
  product_id: number | null;
  product_name: string;
  type: string;
  quantity_delta: number;
  balance_after: number;
  tracks_stock: boolean;
  unit_cost: string | null;
  unit_price: string | null;
  cash_in: string;
  cash_out: string;
  reason: string | null;
  note: string | null;
  ref_type: string | null;
  ref_id: number | null;
  user_id: number | null;
  created_at: string | null;
}

export interface StockRow {
  product_id: number;
  name: string;
  category_name: string | null;
  supplier_name: string | null;
  manages_local: boolean;
  quantity: number;
  local_quantity: number;
  provider_quantity: number | null;
  stock_status: string;
  low_stock_threshold: number;
  is_low: boolean;
}

export interface InventorySummary {
  total: number;
  in_stock: number;
  out_of_stock: number;
  low_stock: number;
}

export interface CashflowSummary {
  cash_in: string;
  cash_out: string;
  profit: string;
  stock_in_cost: string;
  revenue: string;
  movement_count: number;
}

/** Danh sách + phân trang sổ kho (có thể lọc product_id/type qua patchQuery). */
export function useStockMovements() {
  return useList<StockMovement>(`${INVENTORY_ENDPOINT}/movements`);
}

/** Danh sách + phân trang tồn kho hiện tại (lọc search/state qua patchQuery). */
export function useStock() {
  return useList<StockRow>(`${INVENTORY_ENDPOINT}/stock`);
}

/** Thẻ tổng quan kho (tổng/còn/hết/sắp hết). */
export function useInventorySummary() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);

  const load = useCallback(() => {
    apiClient
      .get(`${INVENTORY_ENDPOINT}/summary`)
      .then((r) => setSummary(r.data.data ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { summary, refetchSummary: load };
}

/** Thẻ thu/chi/lợi nhuận sổ kho (lọc theo khoảng ngày tùy chọn). */
export function useCashflow(dateFrom?: string, dateTo?: string) {
  const [cashflow, setCashflow] = useState<CashflowSummary | null>(null);

  const load = useCallback(() => {
    const params: Record<string, string> = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    apiClient
      .get(`${INVENTORY_ENDPOINT}/cashflow`, { params })
      .then((r) => setCashflow(r.data.data ?? null))
      .catch(() => {});
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  return { cashflow, refetchCashflow: load };
}

/** Thao tác ghi của module Inventory. */
export const inventoryActions = {
  stockIn: (body: { product_id: number; quantity: number; reason?: string; note?: string }) =>
    apiClient.post(`${INVENTORY_ENDPOINT}/stock-in`, body),
  adjust: (body: { product_id: number; quantity_delta: number; reason?: string; note?: string }) =>
    apiClient.post(`${INVENTORY_ENDPOINT}/adjust`, body),
};
