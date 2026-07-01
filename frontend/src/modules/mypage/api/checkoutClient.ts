import { apiClient } from '../../../core/apiClient';
import { publicClient } from './publicClient';

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

// ─── Guest checkout (mua không cần đăng nhập, dùng publicClient — không auth) ──

/** Đơn khách vãng lai — góc nhìn khách (KHÔNG lộ giá vốn/lãi). */
export interface GuestOrder {
  id: number;
  code: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  total_amount: string;
  status: string;
  payment_status: string;
  paid_at: string | null;
  delivered_content: string | null;
  manual_fulfillment_required?: boolean;
  manual_contact_name?: string | null;
  manual_contact_url?: string | null;
  created_at?: string | null;
}

export interface GuestCheckoutResult {
  reference: string;
  lookup_token: string;
  total: string;
  qr_url: string | null;
  bank: { bank_name: string; account_number: string; account_holder: string } | null;
  orders: GuestOrder[];
}

export interface GuestContact {
  name: string;
  phone?: string;
  email?: string;
}

export interface GuestCartItem {
  productId: number;
  qty: number;
}

/** Đặt đơn khách vãng lai: tạo đơn awaiting_payment + nhận QR chuyển khoản. */
export async function placeGuestOrders(
  items: GuestCartItem[],
  contact: GuestContact,
): Promise<GuestCheckoutResult> {
  const res = await publicClient.post('/guest-orders', {
    items: items.map((it) => ({ product_id: it.productId, quantity: it.qty })),
    name: contact.name,
    phone: contact.phone || undefined,
    email: contact.email || undefined,
  });
  return res.data.data;
}

/** Tra cứu đơn khách vãng lai theo mã + token bí mật. */
export async function lookupGuestOrders(
  code: string,
  token: string,
): Promise<{ reference: string | null; orders: GuestOrder[] }> {
  const res = await publicClient.get('/orders/lookup', { params: { code, token } });
  return res.data.data;
}
