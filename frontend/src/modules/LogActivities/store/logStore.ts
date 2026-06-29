import { create } from 'zustand';
import type { LogItem } from '../hooks/useLogActivities';

interface LogUiState {
  /** Log đang xem chi tiết (null = đóng). */
  detail: LogItem | null;
  /** Log đang chờ xác nhận xóa (null = không). */
  deleting: LogItem | null;
  /** Bật hộp thoại xóa toàn bộ. */
  clearing: boolean;
  openDetail: (log: LogItem) => void;
  closeDetail: () => void;
  askDelete: (log: LogItem) => void;
  cancelDelete: () => void;
  askClear: () => void;
  cancelClear: () => void;
}

/** Store UI cục bộ module LogActivities (modal chi tiết + xác nhận xóa). */
export const useLogStore = create<LogUiState>((set) => ({
  detail: null,
  deleting: null,
  clearing: false,
  openDetail: (log) => set({ detail: log }),
  closeDetail: () => set({ detail: null }),
  askDelete: (log) => set({ deleting: log }),
  cancelDelete: () => set({ deleting: null }),
  askClear: () => set({ clearing: true }),
  cancelClear: () => set({ clearing: false }),
}));
