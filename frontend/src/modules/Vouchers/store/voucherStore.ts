import { createListStore } from '../../../core/createListStore';
import type { Voucher } from '../hooks/useVouchers';

/** Store UI cục bộ module Vouchers (modal thêm/sửa, xác nhận xóa). */
export const useVoucherStore = createListStore<Voucher>();
