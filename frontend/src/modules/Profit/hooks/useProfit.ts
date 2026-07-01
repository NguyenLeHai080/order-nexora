import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../core/apiClient';
import { PROFIT_BY_PRODUCT_ENDPOINT, PROFIT_SUMMARY_ENDPOINT } from '../config/profitConfig';

export interface ProfitSummary {
  revenue: string;
  cost: string;
  profit: string;
  supplier_payable: string;
  owner_profit: string;
  owner_wallet_user_id?: number | null;
  owner_wallet_balance?: string | null;
  margin_percent: number;
  order_count: number;
  // Dòng tiền sổ kho (tiền mặt) — gồm cả tiền nhập hàng tồn chưa bán.
  ledger_cash_in: string;
  ledger_cash_out: string;
  stock_in_cost: string;
  net_cashflow: string;
}

export interface ProfitByProduct {
  id: number; // = product_id (hoặc 0) — DataTable cần khóa duy nhất
  product_id: number | null;
  product_name: string;
  revenue: string;
  cost: string;
  profit: string;
  order_count: number;
}

export interface ProfitRange {
  from_date: string;
  to_date: string;
}

/**
 * Báo cáo lợi nhuận: tổng hợp + chi tiết theo sản phẩm, lọc theo khoảng ngày.
 * Lợi nhuận = doanh thu (khách trả) - giá vốn (giá nhà cung cấp), chỉ đơn success.
 */
export function useProfit(initial?: Partial<ProfitRange>) {
  const [range, setRange] = useState<ProfitRange>({
    from_date: initial?.from_date ?? '',
    to_date: initial?.to_date ?? '',
  });
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [byProduct, setByProduct] = useState<ProfitByProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (range.from_date) params.from_date = range.from_date;
    if (range.to_date) params.to_date = range.to_date;
    try {
      const [s, p] = await Promise.all([
        apiClient.get(PROFIT_SUMMARY_ENDPOINT, { params }),
        apiClient.get(PROFIT_BY_PRODUCT_ENDPOINT, { params: { ...params, limit: 50 } }),
      ]);
      setSummary(s.data.data ?? null);
      const rows: ProfitByProduct[] = (p.data.data ?? []).map((r: Omit<ProfitByProduct, 'id'>) => ({
        ...r,
        id: r.product_id ?? 0,
      }));
      setByProduct(rows);
    } catch {
      setSummary(null);
      setByProduct([]);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { range, setRange, summary, byProduct, loading, refetch: fetchData };
}
