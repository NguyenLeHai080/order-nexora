/** Cấu hình module Inventory: endpoint + tùy chọn loại biến động kho. */

export const INVENTORY_ENDPOINT = '/inventory';

// Map sang StatusBadge (in|out|adjust|return) — dùng cho cột "Loại" của sổ kho.
export const MOVEMENT_TYPE_OPTIONS = [
  { value: 'in', label: 'Nhập' },
  { value: 'out', label: 'Xuất' },
  { value: 'adjust', label: 'Điều chỉnh' },
  { value: 'return', label: 'Hoàn kho' },
];

// Lọc trạng thái tồn ở tab "Tồn kho hiện tại".
export const STOCK_STATE_OPTIONS = [
  { value: 'in_stock', label: 'Còn hàng' },
  { value: 'out_of_stock', label: 'Hết hàng' },
  { value: 'low', label: 'Sắp hết' },
];
