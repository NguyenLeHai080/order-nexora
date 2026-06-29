import { create } from 'zustand';
import type { Order } from '../hooks/useOrders';

interface OrderUiState {
  /** Đơn đang xem chi tiết (null = đóng modal). */
  detail: Order | null;
  openDetail: (order: Order) => void;
  closeDetail: () => void;
}

/** Store UI cục bộ module Orders (chỉ quản modal chi tiết, không có CRUD form). */
export const useOrderStore = create<OrderUiState>((set) => ({
  detail: null,
  openDetail: (order) => set({ detail: order }),
  closeDetail: () => set({ detail: null }),
}));
