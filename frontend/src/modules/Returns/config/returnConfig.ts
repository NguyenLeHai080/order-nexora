/** Cấu hình module Returns: endpoint + tùy chọn trạng thái + loại yêu cầu. */

export const RETURNS_ENDPOINT = '/returns';

export const RETURN_STATUS_OPTIONS = [
  { value: 'requested', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
  { value: 'completed', label: 'Hoàn tất' },
];

export const RETURN_KIND_OPTIONS = [
  { value: 'return', label: 'Trả hàng (hoàn tiền)' },
  { value: 'exchange', label: 'Đổi sản phẩm khác' },
];
