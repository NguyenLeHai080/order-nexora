/** Cấu hình module Products: endpoint, tùy chọn trạng thái & kho. */

export const PRODUCTS_ENDPOINT = '/products';

export const PRODUCT_STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Tạm ngưng' },
];

export const STOCK_STATUS_OPTIONS = [
  { value: 'in_stock', label: 'Còn hàng' },
  { value: 'out_of_stock', label: 'Hết hàng' },
];

// Nhãn kiểu giao hàng của nhà cung cấp (VD Store: STOCK_ITEM | SHARED_CONTENT | MANUAL).
export const DELIVERY_TYPE_LABELS: Record<string, string> = {
  STOCK_ITEM: 'Tự động (kho riêng)',
  SHARED_CONTENT: 'Tự động (dùng chung)',
  MANUAL: 'Thủ công',
};
