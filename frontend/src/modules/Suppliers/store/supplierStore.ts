import { createListStore } from '../../../core/createListStore';
import type { Supplier } from '../hooks/useSuppliers';

/** Store UI cục bộ của module Suppliers (chọn dòng, modal thêm/sửa, xóa). */
export const useSupplierStore = createListStore<Supplier>();
