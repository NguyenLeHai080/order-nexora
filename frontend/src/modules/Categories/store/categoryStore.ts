import { createListStore } from '../../../core/createListStore';
import type { Category } from '../hooks/useCategories';

/** Store UI cục bộ module Categories (modal thêm/sửa, xác nhận xóa). */
export const useCategoryStore = createListStore<Category>();
