/** Cấu hình module Payments: endpoint, tùy chọn trạng thái nạp tiền & kết quả xác nhận. */

export const PAYMENTS_BANKS_ENDPOINT = '/payments/banks';
export const PAYMENTS_DEPOSITS_ENDPOINT = '/payments/deposits';

export const DEPOSIT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'success', label: 'Thành công' },
  { value: 'failed', label: 'Thất bại' },
];

export const CONFIRM_RESULT_OPTIONS = [
  { value: 'success', label: 'Thành công (cộng tiền vào ví)' },
  { value: 'failed', label: 'Thất bại' },
];

export const BANK_STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Tạm ngưng' },
];
