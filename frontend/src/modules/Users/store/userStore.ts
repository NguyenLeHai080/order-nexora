import { createListStore } from '../../../core/createListStore';
import type { UserRow } from '../components/UserFormModal';

/**
 * Store UI cục bộ của module Users: chọn dòng (bulk), modal thêm/sửa, xóa.
 * Dữ liệu danh sách do hook useUsers (useList) quản lý riêng.
 */
export const useUserStore = createListStore<UserRow>();
