import { apiClient } from '../../../core/apiClient';

/**
 * API cho khu "Tài khoản của tôi" trên landing (đều cần đăng nhập — dùng
 * `apiClient` tự gắn Bearer). Chỉ gọi các endpoint /me an toàn (không lộ giá vốn)
 * và tự-cập-nhật hồ sơ. Tách khỏi checkoutClient cho gọn theo chức năng.
 */

/** Đơn hàng góc nhìn khách (KHÔNG có giá vốn/lãi — khớp OrderCustomerOut backend). */
export interface MyOrder {
  id: number;
  code: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  total_amount: string;
  fulfillment_type: string | null;
  manual_fulfillment_required: boolean;
  manual_contact_name: string | null;
  manual_contact_url: string | null;
  manual_qr_image_url: string | null;
  status: string;
  delivered_content: string | null;
  created_at: string | null;
}

export interface MyInvoice {
  id: number;
  code: string;
  product_name: string;
  quantity: number;
  total: string;
  status: string;
  issued_at: string | null;
  created_at: string | null;
}

export interface MyWarranty {
  id: number;
  code?: string;
  product_name?: string;
  status: string;
  created_at: string | null;
  [k: string]: unknown;
}

export interface MyReturn {
  id: number;
  status: string;
  created_at: string | null;
  [k: string]: unknown;
}

export interface MyDeposit {
  id: number;
  reference_code?: string;
  amount: string;
  status: string;
  created_at: string | null;
  [k: string]: unknown;
}

export interface MyProfile {
  id: number;
  name: string;
  email: string;
  user_name: string | null;
}

export interface ProfileUpdatePayload {
  name?: string;
  email?: string;
  user_name?: string;
  password?: string;
}

interface Paged<T> {
  items: T[];
  total: number;
}

async function paged<T>(url: string, params: Record<string, unknown> = {}): Promise<Paged<T>> {
  const res = await apiClient.get(url, { params });
  return { items: res.data.data ?? [], total: res.data.meta?.total ?? 0 };
}

export const fetchMyOrders = (status?: string) =>
  paged<MyOrder>('/orders/me', { limit: 100, ...(status ? { status } : {}) });

export async function fetchMyOrder(id: number): Promise<MyOrder> {
  const res = await apiClient.get(`/orders/${id}`);
  return res.data.data;
}

export async function cancelMyOrder(id: number): Promise<MyOrder> {
  const res = await apiClient.post(`/orders/${id}/cancel`);
  return res.data.data;
}

export const fetchMyInvoices = () => paged<MyInvoice>('/invoices/me', { limit: 100 });
export const fetchMyWarranties = () => paged<MyWarranty>('/warranties/me', { limit: 100 });
export const fetchMyReturns = () => paged<MyReturn>('/returns/me', { limit: 100 });
export const fetchMyDeposits = () => paged<MyDeposit>('/payments/deposits/me', { limit: 100 });

/** Hồ sơ + số dư hiện tại (đọc từ GET /user — balance ở cấp data). */
export async function fetchMyAccount(): Promise<{ profile: MyProfile; balance: number | null; roles: string[] }> {
  const res = await apiClient.get('/user');
  const d = res.data?.data ?? {};
  return {
    profile: {
      id: d.user?.id,
      name: d.user?.name ?? '',
      email: d.user?.email ?? '',
      user_name: d.user?.user_name ?? null,
    },
    balance: d.balance != null ? parseFloat(d.balance) : null,
    roles: d.roles ?? [],
  };
}

/** Tự cập nhật hồ sơ (name/email/user_name/password). Trả hồ sơ mới. */
export async function updateMyProfile(payload: ProfileUpdatePayload): Promise<MyProfile> {
  const res = await apiClient.patch('/user', payload);
  return res.data.data;
}
