import { useEffect, useState } from 'react';
import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { ORDERS_ENDPOINT } from '../config/orderConfig';

export interface Order {
  id: number;
  code: string;
  user_id: number;
  product_name: string;
  unit_price: string;
  quantity: number;
  total_amount: string;
  status: string;
  delivered_content: string | null;
  created_at: string | null;
}

export interface Leader {
  user_id: number;
  user_name: string;
  total_spent: string;
  order_count: number;
}

/** Danh sách + phân trang đơn hàng. */
export function useOrders() {
  return useList<Order>(ORDERS_ENDPOINT);
}

/** Thao tác ghi của module Orders. */
export const orderActions = {
  /** Hủy đơn (hoàn ví + hồi kho nếu là sản phẩm tự quản kho). */
  cancel: (id: number) => apiClient.post(`${ORDERS_ENDPOINT}/${id}/cancel`),
};

/** Bảng xếp hạng khách hàng theo chi tiêu. */
export function useLeaderboard(limit = 20) {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get(`${ORDERS_ENDPOINT}/leaderboard`, { params: { limit } })
      .then((r) => setLeaders(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  return { leaders, loading };
}
