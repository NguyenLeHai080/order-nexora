import { useState } from 'react';
import { formatCurrency, resolveAsset } from '../../../core/format';
import { useCartStore } from '../store/cartStore';
import {
  createDeposit,
  placeGuestOrders,
  placeOrder,
  type DepositInfo,
  type GuestCheckoutResult,
  type PlacedOrder,
} from '../api/checkoutClient';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Đã đăng nhập chưa — quyết định cho checkout hay mở AuthModal. */
  isLoggedIn: boolean;
  /** Yêu cầu đăng nhập (mở AuthModal) khi khách bấm thanh toán mà chưa login. */
  onRequireLogin: () => void;
}

type View = 'cart' | 'processing' | 'done' | 'topup' | 'guest-contact' | 'guest-qr';

/** Lấy message lỗi gọn từ response axios. */
function errMessage(e: unknown): string {
  const anyE = e as { response?: { data?: { message?: string } } };
  return anyE?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
}

/** Có phải lỗi thiếu số dư ví không (để dẫn sang nạp tiền). */
function isInsufficientBalance(e: unknown): boolean {
  const msg = errMessage(e).toLowerCase();
  return msg.includes('số dư') || msg.includes('nạp');
}

/**
 * Giỏ hàng trượt phải (Tailwind, THEME SÁNG + gold). Checkout đặt đơn THẬT:
 * lặp `POST /orders` cho từng dòng (Order 1 sản phẩm/đơn). Nếu ví không đủ tiền
 * → chuyển sang màn nạp VietQR (tạo deposit + hiện QR). Tự dựng bằng Tailwind
 * (prefix tw-), không lệ thuộc Bootstrap (preflight đang tắt).
 */
export default function CartDrawer({ open, onClose, isLoggedIn, onRequireLogin }: Props) {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const total = useCartStore((s) => s.total());

  const [view, setView] = useState<View>('cart');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PlacedOrder[]>([]);
  const [deposit, setDeposit] = useState<DepositInfo | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);
  // Guest checkout (chưa đăng nhập): thông tin liên hệ + kết quả QR.
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestResult, setGuestResult] = useState<GuestCheckoutResult | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);

  const resetToCart = () => {
    setView('cart');
    setError(null);
    setResults([]);
    setDeposit(null);
    setGuestResult(null);
  };

  const handleClose = () => {
    onClose();
    // Giữ kết quả vài giây? Đơn giản: reset sau khi đóng.
    if (view === 'done') {
      setTimeout(resetToCart, 250);
    }
  };

  const checkout = async () => {
    if (items.length === 0) return;
    if (!isLoggedIn) {
      // Khách vãng lai: sang bước nhập liên hệ (không bắt đăng nhập nữa).
      setError(null);
      setView('guest-contact');
      return;
    }
    setView('processing');
    setError(null);

    const placed: PlacedOrder[] = [];
    try {
      // Order 1 sản phẩm/đơn → lặp từng dòng. Lỗi 1 dòng thì dừng & báo.
      for (const it of items) {
        const order = await placeOrder(it.productId, it.qty);
        placed.push(order);
      }
      setResults(placed);
      clear();
      setView('done');
    } catch (e) {
      if (isInsufficientBalance(e)) {
        // Gợi ý nạp đúng số tiền còn thiếu (làm tròn lên 1.000đ).
        setResults(placed);
        setView('topup');
      } else {
        setResults(placed);
        setError(errMessage(e));
        setView('cart');
      }
    }
  };

  const submitGuestCheckout = async () => {
    if (!guestName.trim()) {
      setError('Vui lòng nhập họ tên.');
      return;
    }
    if (!guestPhone.trim() && !guestEmail.trim()) {
      setError('Vui lòng nhập số điện thoại hoặc email để nhận thông báo đơn hàng.');
      return;
    }
    setGuestLoading(true);
    setError(null);
    try {
      const result = await placeGuestOrders(
        items.map((it) => ({ productId: it.productId, qty: it.qty })),
        { name: guestName.trim(), phone: guestPhone.trim(), email: guestEmail.trim() },
      );
      setGuestResult(result);
      // Lưu link tra cứu để khách quay lại (kể cả khi đóng trình duyệt).
      try {
        const saved = JSON.parse(localStorage.getItem('nexora-guest-orders') || '[]');
        saved.unshift({ code: result.reference, token: result.lookup_token, at: Date.now() });
        localStorage.setItem('nexora-guest-orders', JSON.stringify(saved.slice(0, 20)));
      } catch {
        /* ignore quota/parse errors */
      }
      clear();
      setView('guest-qr');
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setGuestLoading(false);
    }
  };

  const startTopup = async () => {
    setTopupLoading(true);
    setError(null);
    try {
      // Nạp đúng tổng giỏ (làm tròn nghìn lên cho gọn).
      const amount = Math.max(1000, Math.ceil(total / 1000) * 1000);
      const d = await createDeposit(amount);
      setDeposit(d);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setTopupLoading(false);
    }
  };

  return (
    <div
      className={`tw-fixed tw-inset-0 tw-z-[110] tw-transition-opacity ${
        open ? 'tw-visible tw-opacity-100' : 'tw-invisible tw-opacity-0'
      }`}
      onClick={handleClose}
    >
      <div className="tw-absolute tw-inset-0 tw-bg-black/40" />
      <aside
        className={`tw-absolute tw-right-0 tw-top-0 tw-flex tw-h-full tw-w-[420px] tw-max-w-[92%] tw-flex-col tw-bg-white tw-text-ink tw-shadow-2xl tw-transition-transform ${
          open ? 'tw-translate-x-0' : 'tw-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-neutral-200 tw-px-5 tw-py-4">
          <h3 className="tw-flex tw-items-center tw-gap-2 tw-text-[16px] tw-font-bold tw-text-ink">
            <i className="bi bi-bag tw-text-gold-dark" />
            {view === 'done'
              ? 'Đặt hàng thành công'
              : view === 'topup'
                ? 'Nạp ví thanh toán'
                : view === 'guest-contact'
                  ? 'Thông tin nhận đơn'
                  : view === 'guest-qr'
                    ? 'Quét mã thanh toán'
                    : 'Giỏ hàng'}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-full tw-text-neutral-400 hover:tw-bg-neutral-100 hover:tw-text-ink"
            aria-label="Đóng"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Body */}
        <div className="tw-flex-1 tw-overflow-y-auto tw-px-5 tw-py-4">
          {view === 'cart' && (
            <>
              {error && (
                <p className="tw-mb-3 tw-rounded-lg tw-bg-red-50 tw-px-3 tw-py-2 tw-text-[13px] tw-text-red-600">{error}</p>
              )}
              {items.length === 0 ? (
                <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-20 tw-text-center tw-text-neutral-400">
                  <i className="bi bi-cart-x tw-mb-3 tw-text-5xl tw-text-gold/50" />
                  <p>Giỏ hàng trống.</p>
                  <button onClick={handleClose} className="tw-mt-3 tw-text-[13.5px] tw-font-semibold tw-text-gold-dark hover:tw-underline">
                    Tiếp tục mua sắm
                  </button>
                </div>
              ) : (
                <ul className="tw-flex tw-flex-col tw-gap-3">
                  {items.map((it) => {
                    const img = resolveAsset(it.image);
                    return (
                      <li key={it.productId} className="tw-flex tw-gap-3 tw-rounded-xl tw-border tw-border-neutral-200 tw-bg-white tw-p-3 tw-shadow-sm">
                        <div className="tw-h-16 tw-w-16 tw-shrink-0 tw-overflow-hidden tw-rounded-lg tw-bg-neutral-100">
                          {img ? (
                            <img src={img} alt={it.name} className="tw-h-full tw-w-full tw-object-cover" />
                          ) : (
                            <span className="tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center tw-text-gold/50">
                              <i className="bi bi-box-seam tw-text-2xl" />
                            </span>
                          )}
                        </div>
                        <div className="tw-flex tw-flex-1 tw-flex-col">
                          <span className="tw-line-clamp-2 tw-text-[13.5px] tw-font-semibold tw-leading-snug tw-text-ink">{it.name}</span>
                          <span className="tw-mt-0.5 tw-text-[13px] tw-font-bold tw-text-gold-dark">{formatCurrency(it.price)}</span>
                          <div className="tw-mt-auto tw-flex tw-items-center tw-gap-2">
                            <div className="tw-flex tw-items-center tw-rounded-lg tw-border tw-border-neutral-200">
                              <button
                                type="button"
                                onClick={() => setQty(it.productId, it.qty - 1)}
                                className="tw-px-2.5 tw-py-1 tw-text-neutral-500 hover:tw-text-gold-dark"
                                aria-label="Giảm"
                              >
                                <i className="bi bi-dash" />
                              </button>
                              <span className="tw-min-w-[28px] tw-text-center tw-text-[13px] tw-text-ink">{it.qty}</span>
                              <button
                                type="button"
                                onClick={() => setQty(it.productId, it.qty + 1)}
                                className="tw-px-2.5 tw-py-1 tw-text-neutral-500 hover:tw-text-gold-dark"
                                aria-label="Tăng"
                              >
                                <i className="bi bi-plus" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => remove(it.productId)}
                              className="tw-ml-auto tw-text-[12px] tw-text-neutral-400 hover:tw-text-red-500"
                            >
                              <i className="bi bi-trash3 tw-mr-1" />Xóa
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          {view === 'processing' && (
            <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-24 tw-text-center tw-text-neutral-500">
              <i className="bi bi-arrow-repeat tw-mb-3 tw-animate-spin tw-text-4xl tw-text-gold-dark" />
              <p>Đang xử lý đơn hàng…</p>
            </div>
          )}

          {view === 'done' && (
            <div className="tw-py-4">
              <div className="tw-mb-4 tw-flex tw-flex-col tw-items-center tw-text-center">
                <i className="bi bi-check-circle-fill tw-mb-2 tw-text-5xl tw-text-green-500" />
                <p className="tw-text-[14px] tw-text-neutral-600">
                  Đã tạo {results.length} đơn hàng. Cảm ơn bạn đã mua sắm tại NexoraTech!
                </p>
              </div>
              <ul className="tw-flex tw-flex-col tw-gap-3">
                {results.map((o) => (
                  <li key={o.id} className="tw-rounded-xl tw-border tw-border-neutral-200 tw-bg-white tw-p-3.5 tw-shadow-sm">
                    <div className="tw-flex tw-items-center tw-justify-between">
                      <span className="tw-text-[13.5px] tw-font-semibold tw-text-ink">{o.product_name}</span>
                      <span className="tw-text-[12px] tw-text-gold-dark">#{o.code}</span>
                    </div>
                    {o.manual_fulfillment_required ? (
                      <div className="tw-mt-2 tw-rounded-lg tw-bg-gold/10 tw-p-2.5 tw-text-[12.5px] tw-text-neutral-700">
                        <p className="tw-mb-1 tw-font-semibold tw-text-gold-dark">Đơn cần xử lý thủ công</p>
                        <p>Nhân viên sẽ cấp phát & liên hệ bàn giao.</p>
                        {o.manual_contact_url && (
                          <a
                            href={o.manual_contact_url}
                            target="_blank"
                            rel="noreferrer"
                            className="tw-mt-1 tw-inline-block tw-font-semibold tw-text-gold-dark hover:tw-underline"
                          >
                            Liên hệ {o.manual_contact_name || 'hỗ trợ'} →
                          </a>
                        )}
                      </div>
                    ) : o.delivered_content ? (
                      <pre className="tw-mt-2 tw-whitespace-pre-wrap tw-break-words tw-rounded-lg tw-bg-neutral-100 tw-p-2.5 tw-text-[12.5px] tw-text-green-700">
                        {o.delivered_content}
                      </pre>
                    ) : (
                      <p className="tw-mt-2 tw-text-[12.5px] tw-text-neutral-500">
                        Đơn đang xử lý — xem chi tiết trong “Đơn hàng của tôi”.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <a
                href="/tai-khoan"
                className="tw-mt-4 tw-block tw-rounded-lg tw-border tw-border-gold/60 tw-py-2.5 tw-text-center tw-text-[13.5px] tw-font-semibold tw-text-gold-dark hover:tw-bg-gold/10"
              >
                Xem đơn hàng của tôi
              </a>
            </div>
          )}

          {view === 'topup' && (
            <div className="tw-py-2">
              <p className="tw-mb-3 tw-rounded-lg tw-bg-amber-50 tw-px-3 tw-py-2.5 tw-text-[13px] tw-text-amber-700">
                Số dư ví chưa đủ để thanh toán {formatCurrency(total)}. Vui lòng nạp thêm để hoàn tất đơn.
              </p>

              {!deposit ? (
                <button
                  type="button"
                  onClick={startTopup}
                  disabled={topupLoading}
                  className="tw-w-full tw-rounded-full tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-py-3 tw-text-[14px] tw-font-bold tw-text-black tw-shadow-[0_4px_14px_rgba(201,164,76,0.4)] tw-transition-all hover:-tw-translate-y-px hover:tw-shadow-[0_6px_20px_rgba(201,164,76,0.55)] disabled:tw-cursor-not-allowed disabled:tw-opacity-60 disabled:tw-shadow-none"
                >
                  {topupLoading ? 'Đang tạo mã nạp…' : `Tạo mã nạp ${formatCurrency(Math.max(1000, Math.ceil(total / 1000) * 1000))}`}
                </button>
              ) : (
                <div className="tw-rounded-xl tw-border tw-border-neutral-200 tw-bg-neutral-50 tw-p-4 tw-text-center">
                  {deposit.qr_url && (
                    <img
                      src={deposit.qr_url}
                      alt="VietQR"
                      className="tw-mx-auto tw-mb-3 tw-h-56 tw-w-56 tw-rounded-lg tw-border tw-border-neutral-200 tw-bg-white tw-object-contain tw-p-1"
                    />
                  )}
                  <p className="tw-text-[13px] tw-text-neutral-500">Số tiền</p>
                  <p className="tw-mb-2 tw-text-[18px] tw-font-extrabold tw-text-gold-dark">{formatCurrency(deposit.amount)}</p>
                  {deposit.bank && (
                    <div className="tw-mb-2 tw-text-[12.5px] tw-text-neutral-600">
                      <p>{deposit.bank.bank_name} — {deposit.bank.account_number}</p>
                      <p>{deposit.bank.account_holder}</p>
                    </div>
                  )}
                  <p className="tw-text-[12.5px] tw-text-neutral-500">Nội dung chuyển khoản</p>
                  <p className="tw-mb-3 tw-break-all tw-font-mono tw-text-[13px] tw-font-bold tw-text-gold-dark">{deposit.reference_code}</p>
                  <p className="tw-text-[12px] tw-text-neutral-400">
                    Sau khi chuyển khoản, ví sẽ được cộng tiền tự động trong giây lát. Bạn quay lại bấm thanh toán để
                    hoàn tất đơn.
                  </p>
                </div>
              )}
              {error && (
                <p className="tw-mt-3 tw-rounded-lg tw-bg-red-50 tw-px-3 tw-py-2 tw-text-[13px] tw-text-red-600">{error}</p>
              )}
              <button onClick={resetToCart} className="tw-mt-3 tw-w-full tw-text-[13px] tw-text-neutral-400 hover:tw-text-gold-dark">
                ← Quay lại giỏ hàng
              </button>
            </div>
          )}

          {view === 'guest-contact' && (
            <div className="tw-py-2">
              <p className="tw-mb-4 tw-rounded-lg tw-bg-gold/10 tw-px-3 tw-py-2.5 tw-text-[13px] tw-text-neutral-700">
                Nhập thông tin để nhận thông báo & tra cứu đơn. Bạn sẽ chuyển khoản qua QR ở bước kế tiếp.
              </p>
              <label className="tw-mb-1 tw-block tw-text-[13px] tw-font-semibold tw-text-ink">Họ tên *</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="tw-mb-3 tw-w-full tw-rounded-lg tw-border tw-border-neutral-300 tw-px-3 tw-py-2.5 tw-text-[14px] tw-outline-none focus:tw-border-gold"
              />
              <label className="tw-mb-1 tw-block tw-text-[13px] tw-font-semibold tw-text-ink">Số điện thoại</label>
              <input
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="09xx xxx xxx"
                className="tw-mb-3 tw-w-full tw-rounded-lg tw-border tw-border-neutral-300 tw-px-3 tw-py-2.5 tw-text-[14px] tw-outline-none focus:tw-border-gold"
              />
              <label className="tw-mb-1 tw-block tw-text-[13px] tw-font-semibold tw-text-ink">Email</label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="ban@email.com"
                className="tw-mb-1 tw-w-full tw-rounded-lg tw-border tw-border-neutral-300 tw-px-3 tw-py-2.5 tw-text-[14px] tw-outline-none focus:tw-border-gold"
              />
              <p className="tw-mb-4 tw-text-[12px] tw-text-neutral-400">Cần ít nhất số điện thoại hoặc email.</p>
              {error && (
                <p className="tw-mb-3 tw-rounded-lg tw-bg-red-50 tw-px-3 tw-py-2 tw-text-[13px] tw-text-red-600">{error}</p>
              )}
              <button
                type="button"
                onClick={submitGuestCheckout}
                disabled={guestLoading}
                className="tw-w-full tw-rounded-full tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-py-3 tw-text-[14px] tw-font-bold tw-text-black tw-shadow-[0_4px_14px_rgba(201,164,76,0.4)] tw-transition-all hover:-tw-translate-y-px disabled:tw-cursor-not-allowed disabled:tw-opacity-60"
              >
                {guestLoading ? 'Đang tạo đơn…' : `Tiếp tục · ${formatCurrency(total)}`}
              </button>
              <button
                type="button"
                onClick={onRequireLogin}
                className="tw-mt-3 tw-w-full tw-text-[13px] tw-text-neutral-500 hover:tw-text-gold-dark"
              >
                Đã có tài khoản? Đăng nhập để thanh toán bằng ví
              </button>
              <button onClick={resetToCart} className="tw-mt-1 tw-w-full tw-text-[13px] tw-text-neutral-400 hover:tw-text-gold-dark">
                ← Quay lại giỏ hàng
              </button>
            </div>
          )}

          {view === 'guest-qr' && guestResult && (
            <div className="tw-py-2">
              <div className="tw-rounded-xl tw-border tw-border-neutral-200 tw-bg-neutral-50 tw-p-4 tw-text-center">
                {guestResult.qr_url ? (
                  <img
                    src={guestResult.qr_url}
                    alt="VietQR"
                    className="tw-mx-auto tw-mb-3 tw-h-56 tw-w-56 tw-rounded-lg tw-border tw-border-neutral-200 tw-bg-white tw-object-contain tw-p-1"
                  />
                ) : (
                  <p className="tw-mb-3 tw-text-[13px] tw-text-amber-600">
                    Chưa cấu hình tài khoản nhận tiền. Vui lòng liên hệ hỗ trợ để thanh toán.
                  </p>
                )}
                <p className="tw-text-[13px] tw-text-neutral-500">Số tiền</p>
                <p className="tw-mb-2 tw-text-[18px] tw-font-extrabold tw-text-gold-dark">
                  {formatCurrency(parseFloat(guestResult.total))}
                </p>
                {guestResult.bank && (
                  <div className="tw-mb-2 tw-text-[12.5px] tw-text-neutral-600">
                    <p>{guestResult.bank.bank_name} — {guestResult.bank.account_number}</p>
                    <p>{guestResult.bank.account_holder}</p>
                  </div>
                )}
                <p className="tw-text-[12.5px] tw-text-neutral-500">Nội dung chuyển khoản</p>
                <p className="tw-mb-3 tw-break-all tw-font-mono tw-text-[13px] tw-font-bold tw-text-gold-dark">
                  {guestResult.reference}
                </p>
                <p className="tw-text-[12px] tw-text-neutral-400">
                  Sau khi chuyển khoản, đơn sẽ được xác nhận và xử lý. Theo dõi kết quả tại trang tra cứu bên dưới.
                </p>
              </div>
              <a
                href={`/tra-cuu-don?code=${encodeURIComponent(guestResult.reference)}&token=${encodeURIComponent(guestResult.lookup_token)}`}
                className="tw-mt-4 tw-block tw-rounded-lg tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-py-2.5 tw-text-center tw-text-[13.5px] tw-font-bold tw-text-black hover:-tw-translate-y-px"
              >
                Theo dõi đơn hàng →
              </a>
              <button onClick={resetToCart} className="tw-mt-3 tw-w-full tw-text-[13px] tw-text-neutral-400 hover:tw-text-gold-dark">
                ← Về giỏ hàng
              </button>
            </div>
          )}
        </div>

        {/* Footer — chỉ ở màn giỏ */}
        {view === 'cart' && items.length > 0 && (
          <div className="tw-border-t tw-border-neutral-200 tw-px-5 tw-py-4">
            <div className="tw-mb-3 tw-flex tw-items-center tw-justify-between">
              <span className="tw-text-[14px] tw-text-neutral-500">Tổng cộng</span>
              <span className="tw-text-[20px] tw-font-extrabold tw-text-gold-dark">{formatCurrency(total)}</span>
            </div>
            <button
              type="button"
              onClick={checkout}
              className="tw-w-full tw-rounded-full tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-py-3.5 tw-text-[14px] tw-font-bold tw-uppercase tw-text-black tw-shadow-[0_4px_16px_rgba(201,164,76,0.45)] tw-transition-all hover:-tw-translate-y-px hover:tw-shadow-[0_7px_24px_rgba(201,164,76,0.6)] active:tw-translate-y-0"
            >
              Thanh toán
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
