/** Cấu hình module Invoices: endpoint + tùy chọn trạng thái hóa đơn. */

export const INVOICES_ENDPOINT = '/invoices';

export const INVOICE_STATUS_OPTIONS = [
  { value: 'issued', label: 'Đã phát hành' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
];
