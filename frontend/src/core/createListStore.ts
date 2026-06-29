import { create, type StoreApi, type UseBoundStore } from 'zustand';

/**
 * State UI cục bộ cho một màn danh sách CRUD: chọn dòng (bulk), modal thêm/sửa,
 * item đang chờ xóa. Tách khỏi component để mỗi module có "store riêng".
 *
 * Dùng kèm `useList` (lo dữ liệu + query). `T` là kiểu của một dòng dữ liệu.
 */
export interface ListUiState<T> {
  // ----- chọn nhiều dòng (bulk action) -----
  selected: number[];
  toggle: (id: number) => void;
  toggleAll: (ids: number[]) => void;
  clearSelected: () => void;
  isSelected: (id: number) => boolean;

  // ----- modal thêm/sửa -----
  showForm: boolean;
  editing: T | null;
  openCreate: () => void;
  openEdit: (item: T) => void;
  closeForm: () => void;

  // ----- xác nhận xóa -----
  deleting: T | null;
  askDelete: (item: T) => void;
  cancelDelete: () => void;
}

/**
 * Tạo một zustand store quản lý state UI list cho module. Mỗi module gọi một lần:
 *
 *   export const useUserStore = createListStore<UserRow>();
 *
 * Component lấy state qua hook này thay vì tự khai báo nhiều useState.
 */
export function createListStore<T extends { id: number }>(): UseBoundStore<StoreApi<ListUiState<T>>> {
  return create<ListUiState<T>>((set, get) => ({
    selected: [],
    toggle: (id) =>
      set((s) => ({
        selected: s.selected.includes(id)
          ? s.selected.filter((x) => x !== id)
          : [...s.selected, id],
      })),
    toggleAll: (ids) =>
      set((s) => ({ selected: s.selected.length === ids.length ? [] : ids })),
    clearSelected: () => set({ selected: [] }),
    isSelected: (id) => get().selected.includes(id),

    showForm: false,
    editing: null,
    openCreate: () => set({ showForm: true, editing: null }),
    openEdit: (item) => set({ showForm: true, editing: item }),
    closeForm: () => set({ showForm: false, editing: null }),

    deleting: null,
    askDelete: (item) => set({ deleting: item }),
    cancelDelete: () => set({ deleting: null }),
  }));
}
