import { create } from 'zustand';
import { createListStore } from '../../../core/createListStore';
import type { Bank, Deposit } from '../hooks/usePayments';

/** Store UI cho tab ngân hàng (modal thêm/sửa, xác nhận xóa). */
export const useBankStore = createListStore<Bank>();

interface DepositUiState {
  /** Phiếu nạp đang chờ xác nhận (null = đóng modal). */
  confirming: Deposit | null;
  askConfirm: (deposit: Deposit) => void;
  cancelConfirm: () => void;
}

/** Store UI cho tab nạp tiền (chỉ quản modal xác nhận). */
export const useDepositStore = create<DepositUiState>((set) => ({
  confirming: null,
  askConfirm: (deposit) => set({ confirming: deposit }),
  cancelConfirm: () => set({ confirming: null }),
}));
