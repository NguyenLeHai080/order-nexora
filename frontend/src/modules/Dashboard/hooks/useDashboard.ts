import { useEffect, useState } from 'react';
import { apiClient } from '../../../core/apiClient';
import { useAuthStore } from '../../../core/authStore';

export interface LeaderRow {
  user_id: number;
  user_name: string;
  total_spent: string;
  order_count: number;
}

export interface OrderRow {
  id: number;
  code: string;
  product_name: string;
  total_amount: string;
  status: string;
  created_at: string | null;
}

export interface UserStats {
  total: number;
  active: number;
  locked: number;
}

export interface DashboardData {
  loading: boolean;
  userStats?: UserStats;
  orderTotal: number;
  productTotal: number;
  revenue: number;
  supplierPayable: number;
  ownerProfit: number;
  ownerWalletBalance: number;
  leaders: LeaderRow[];
  recent: OrderRow[];
}

/**
 * Tổng hợp số liệu dashboard từ các endpoint stats có sẵn.
 * Bỏ qua phần không có quyền (mỗi nhánh tự kiểm tra ability).
 */
export function useDashboard(): DashboardData {
  const { can } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats>();
  const [orderTotal, setOrderTotal] = useState(0);
  const [productTotal, setProductTotal] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [supplierPayable, setSupplierPayable] = useState(0);
  const [ownerProfit, setOwnerProfit] = useState(0);
  const [ownerWalletBalance, setOwnerWalletBalance] = useState(0);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [recent, setRecent] = useState<OrderRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const tasks: Promise<void>[] = [];

      if (can('index', 'User')) {
        tasks.push(apiClient.get('/users/stats').then((r) => setUserStats(r.data.data)).catch(() => {}));
      }
      if (can('index', 'Product')) {
        tasks.push(
          apiClient
            .get('/products', { params: { limit: 1 } })
            .then((r) => setProductTotal(r.data.meta?.total ?? 0))
            .catch(() => {}),
        );
      }
      if (can('index', 'Order')) {
        tasks.push(
          apiClient
            .get('/orders/profit-summary')
            .then((r) => {
              const d = r.data.data ?? {};
              setRevenue(parseFloat(d.revenue || '0'));
              setSupplierPayable(parseFloat(d.supplier_payable || '0'));
              setOwnerProfit(parseFloat(d.owner_profit || d.profit || '0'));
              setOwnerWalletBalance(parseFloat(d.owner_wallet_balance || '0'));
              setOrderTotal(d.order_count ?? 0);
            })
            .catch(() => {}),
        );
        tasks.push(
          apiClient
            .get('/orders', { params: { limit: 5, status: 'success' } })
            .then((r) => {
              setRecent(r.data.data ?? []);
            })
            .catch(() => {}),
        );
        tasks.push(
          apiClient
            .get('/orders/leaderboard', { params: { limit: 7 } })
            .then((r) => setLeaders(r.data.data ?? []))
            .catch(() => {}),
        );
      }

      await Promise.all(tasks);
      setLoading(false);
    }
    void load();
  }, [can]);

  return {
    loading,
    userStats,
    orderTotal,
    productTotal,
    revenue,
    supplierPayable,
    ownerProfit,
    ownerWalletBalance,
    leaders,
    recent,
  };
}
