import { apiClient } from '../../../core/apiClient';

/**
 * API cần đăng nhập cho luồng mua hàng ở landing (đặt đơn + nạp ví VietQR).
 * Dùng `apiClient` (tự gắn Bearer + X-Organization-Id) vì các endpoint này yêu
 * cầu đăng nhập — khác với publicClient (ẩn danh) chỉ để xem sản phẩm.
 */

export interface PlacedOrder {
  id: number;
  code: string;
  product_name: string;
  total_amount: string;
  status: string;
  delivered_content: string | null;
  manual_fulfillment_required?: boolean;
  manual_contact_name?: string | null;
  manual_contact_url?: string | null;
  manual_qr_image_url?: string | null;
}

export interface DepositInfo {
  deposit_id: number;
  reference_code: string;
  amount: string;
  qr_url: string | null;
  status: string;
  bank: { bank_name: string; account_number: string; account_holder: string } | null;
}

/** Đặt 1 đơn (Order 1 sản phẩm/đơn). Trả đơn đã tạo hoặc ném lỗi axios. */
export async function placeOrder(productId: number, quantity: number): Promise<PlacedOrder> {
  const res = await apiClient.post('/orders', { product_id: productId, quantity });
  return res.data.data;
}

/** Tạo yêu cầu nạp ví qua VietQR (tự chọn ngân hàng mặc định ở backend). */
export async function createDeposit(amount: number): Promise<DepositInfo> {
  const res = await apiClient.post('/payments/deposits', { amount, method: 'qr_auto' });
  return res.data.data;
}

/** Số dư ví hiện tại của user đăng nhập (đọc từ /user nếu backend trả balance). */
export async function fetchMyBalance(): Promise<number | null> {
  try {
    const res = await apiClient.get('/user');
    const raw = res.data?.data?.user?.balance;
    return raw != null ? parseFloat(raw) : null;
  } catch {
    return null;
  }
}
