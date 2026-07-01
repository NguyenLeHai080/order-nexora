/** Cấu hình module Orders: endpoint, tùy chọn trạng thái đơn. */

export const ORDERS_ENDPOINT = '/orders';

export const ORDER_STATUS_OPTIONS = [
  { value: 'awaiting_payment', label: 'Chờ thanh toán' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'success', label: 'Thành công' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'cancelled', label: 'Đã hủy' },
];
