/** Cấu hình module Warranties: endpoint + tùy chọn trạng thái bảo hành. */

export const WARRANTIES_ENDPOINT = '/warranties';

export const WARRANTY_STATUS_OPTIONS = [
  { value: 'active', label: 'Đang hiệu lực' },
  { value: 'expired', label: 'Hết hạn' },
  { value: 'claimed', label: 'Đã ghi nhận' },
  { value: 'void', label: 'Vô hiệu' },
];
