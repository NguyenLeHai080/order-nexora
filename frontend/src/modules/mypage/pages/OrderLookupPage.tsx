import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatCurrency } from '../../../core/format';
import MyPageShell from '../components/MyPageShell';
import PageHeader from '../components/layout/PageHeader';
import { lookupGuestOrders, type GuestOrder } from '../api/checkoutClient';

/** Nhãn + màu badge theo trạng thái đơn (góc nhìn khách). */
function statusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case 'awaiting_payment':
      return { label: 'Chờ thanh toán', cls: 'tw-bg-amber-100 tw-text-amber-700' };
    case 'processing':
      return { label: 'Đang xử lý', cls: 'tw-bg-blue-100 tw-text-blue-700' };
    case 'success':
      return { label: 'Hoàn tất', cls: 'tw-bg-green-100 tw-text-green-700' };
    case 'failed':
      return { label: 'Thất bại', cls: 'tw-bg-red-100 tw-text-red-700' };
    case 'cancelled':
      return { label: 'Đã hủy', cls: 'tw-bg-neutral-200 tw-text-neutral-600' };
    default:
      return { label: status, cls: 'tw-bg-neutral-100 tw-text-neutral-600' };
  }
}

/** Hướng dẫn ngắn theo trạng thái. */
function statusHint(status: string): string {
  switch (status) {
    case 'awaiting_payment':
      return 'Đơn chưa nhận được thanh toán. Vui lòng chuyển khoản theo mã đã cấp; đơn sẽ tự động chuyển sang xử lý sau khi tiền vào.';
    case 'processing':
      return 'Đã nhận thanh toán. Chúng tôi đang xử lý và sẽ cập nhật kết quả sớm nhất.';
    case 'success':
      return 'Đơn đã hoàn tất. Thông tin bàn giao hiển thị bên dưới.';
    case 'failed':
      return 'Đơn xử lý không thành công. Vui lòng liên hệ hỗ trợ để được hoàn tiền.';
    default:
      return '';
  }
}

/** Đơn guest đã lưu ở máy khách (để quay lại tra cứu mà không cần nhớ token). */
interface SavedGuestOrder {
  code: string;
  token: string;
  at: number;
}

/** Đọc danh sách đơn guest đã lưu trong localStorage (mới nhất trước). */
function readSavedOrders(): SavedGuestOrder[] {
  try {
    const raw = JSON.parse(localStorage.getItem('nexora-guest-orders') || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((o) => o && typeof o.code === 'string' && typeof o.token === 'string');
  } catch {
    return [];
  }
}

/**
 * Trang tra cứu đơn khách vãng lai (route `/tra-cuu-don`).
 * Nhập mã đơn/mã thanh toán + token (tự điền từ query khi bấm link trong email/QR).
 * Không cần đăng nhập; dữ liệu qua publicClient, KHÔNG lộ giá vốn/lãi.
 */
export default function OrderLookupPage() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') || '');
  const [token, setToken] = useState(params.get('token') || '');
  const [orders, setOrders] = useState<GuestOrder[] | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedGuestOrder[]>([]);

  const doLookup = async (c: string, t: string) => {
    if (!c.trim() || !t.trim()) {
      setError('Vui lòng nhập mã đơn và mã tra cứu.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await lookupGuestOrders(c.trim(), t.trim());
      setOrders(res.orders);
      setReference(res.reference);
    } catch {
      setOrders(null);
      setError('Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã và mã tra cứu.');
    } finally {
      setLoading(false);
    }
  };

  // Tự tra cứu khi mở từ link có sẵn code + token. Đồng thời nạp đơn đã lưu ở máy.
  useEffect(() => {
    setSaved(readSavedOrders());
    const c = params.get('code');
    const t = params.get('token');
    if (c && t) {
      void doLookup(c, t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bấm 1 đơn đã lưu → điền mã + token rồi tra cứu ngay.
  const lookupSaved = (s: SavedGuestOrder) => {
    setCode(s.code);
    setToken(s.token);
    void doLookup(s.code, s.token);
  };

  return (
    <MyPageShell>
      <PageHeader
        title="Tra cứu đơn hàng"
        intro="Nhập mã đơn và mã tra cứu (đã gửi khi bạn đặt hàng) để xem trạng thái và thông tin bàn giao."
        breadcrumb={[{ label: 'Tra cứu đơn' }]}
      />

      <section className="mp-section">
        <div className="mp-container tw-max-w-[720px]">
          {/* Form tra cứu */}
          <div className="tw-mb-8 tw-rounded-2xl tw-border tw-border-neutral-200 tw-bg-white tw-p-5">
            <div className="tw-grid tw-gap-3 sm:tw-grid-cols-2">
              <div>
                <label className="tw-mb-1 tw-block tw-text-[13px] tw-font-semibold tw-text-ink">Mã đơn / mã thanh toán</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="OD-GUEST-XXXXXXXX"
                  className="tw-w-full tw-rounded-lg tw-border tw-border-neutral-300 tw-px-3 tw-py-2.5 tw-text-[14px] tw-outline-none focus:tw-border-gold"
                />
              </div>
              <div>
                <label className="tw-mb-1 tw-block tw-text-[13px] tw-font-semibold tw-text-ink">Mã tra cứu</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Dán mã từ link tra cứu"
                  className="tw-w-full tw-rounded-lg tw-border tw-border-neutral-300 tw-px-3 tw-py-2.5 tw-text-[14px] tw-outline-none focus:tw-border-gold"
                />
              </div>
            </div>
            {error && (
              <p className="tw-mt-3 tw-rounded-lg tw-bg-red-50 tw-px-3 tw-py-2 tw-text-[13px] tw-text-red-600">{error}</p>
            )}
            <button
              type="button"
              onClick={() => doLookup(code, token)}
              disabled={loading}
              className="tw-mt-4 tw-w-full tw-rounded-full tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-py-3 tw-text-[14px] tw-font-bold tw-text-black tw-transition-all hover:-tw-translate-y-px disabled:tw-cursor-not-allowed disabled:tw-opacity-60 sm:tw-w-auto sm:tw-px-10"
            >
              {loading ? 'Đang tra cứu…' : 'Tra cứu'}
            </button>
          </div>

          {/* Đơn đã đặt gần đây trên máy này — bấm để tra cứu nhanh (không cần nhớ token). */}
          {saved.length > 0 && !orders && (
            <div className="tw-mb-8">
              <p className="tw-mb-2 tw-text-[13px] tw-font-semibold tw-text-neutral-500">Đơn đã đặt gần đây</p>
              <div className="tw-flex tw-flex-wrap tw-gap-2">
                {saved.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => lookupSaved(s)}
                    className="tw-rounded-full tw-border tw-border-neutral-300 tw-bg-white tw-px-3 tw-py-1.5 tw-font-mono tw-text-[12.5px] tw-font-semibold tw-text-gold-dark tw-transition-colors hover:tw-border-gold hover:tw-bg-gold/10"
                  >
                    {s.code}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kết quả */}
          {orders && orders.length > 0 && (
            <div>
              {reference && (
                <p className="tw-mb-3 tw-text-[13.5px] tw-text-neutral-500">
                  Mã thanh toán: <span className="tw-font-mono tw-font-bold tw-text-gold-dark">{reference}</span>
                </p>
              )}
              <ul className="tw-flex tw-flex-col tw-gap-4">
                {orders.map((o) => {
                  const badge = statusBadge(o.status);
                  return (
                    <li key={o.id} className="tw-rounded-2xl tw-border tw-border-neutral-200 tw-bg-white tw-p-4 tw-shadow-sm">
                      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
                        <div>
                          <span className="tw-text-[14.5px] tw-font-bold tw-text-ink">{o.product_name}</span>
                          <span className="tw-ml-2 tw-text-[12.5px] tw-text-neutral-400">#{o.code}</span>
                        </div>
                        <span className={`tw-rounded-full tw-px-2.5 tw-py-[3px] tw-text-[12px] tw-font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="tw-mt-1.5 tw-flex tw-items-center tw-gap-3 tw-text-[13px] tw-text-neutral-500">
                        <span>SL: {o.quantity}</span>
                        <span className="tw-font-semibold tw-text-gold-dark">{formatCurrency(parseFloat(o.total_amount))}</span>
                      </div>
                      {statusHint(o.status) && (
                        <p className="tw-mt-2 tw-rounded-lg tw-bg-neutral-50 tw-px-3 tw-py-2 tw-text-[12.5px] tw-text-neutral-600">
                          {statusHint(o.status)}
                        </p>
                      )}
                      {o.status === 'success' && o.delivered_content && (
                        <pre className="tw-mt-2 tw-whitespace-pre-wrap tw-break-words tw-rounded-lg tw-bg-green-50 tw-p-3 tw-text-[12.5px] tw-text-green-700">
                          {o.delivered_content}
                        </pre>
                      )}
                      {o.manual_fulfillment_required && o.manual_contact_url && (
                        <a
                          href={o.manual_contact_url}
                          target="_blank"
                          rel="noreferrer"
                          className="tw-mt-2 tw-inline-block tw-text-[13px] tw-font-semibold tw-text-gold-dark hover:tw-underline"
                        >
                          Liên hệ {o.manual_contact_name || 'hỗ trợ'} →
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>
    </MyPageShell>
  );
}
