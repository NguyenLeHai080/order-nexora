import { createListStore } from '../../../core/createListStore';
import type { Product } from '../hooks/useProducts';

/** Store UI cục bộ module Products (modal thêm/sửa, xác nhận xóa). */
export const useProductStore = createListStore<Product>();
