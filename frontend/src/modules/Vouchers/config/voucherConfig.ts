/** Cấu hình module Vouchers: endpoint, tùy chọn loại giảm & trạng thái. */

export const VOUCHERS_ENDPOINT = '/vouchers';

export const DISCOUNT_TYPE_OPTIONS = [
  { value: 'amount', label: 'Số tiền cố định' },
  { value: 'percent', label: 'Phần trăm' },
];

export const VOUCHER_STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Tạm ngưng' },
];
