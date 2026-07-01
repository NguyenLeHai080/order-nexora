import { useCallback, useEffect, useState, type ReactNode } from 'react';
import MyPageShell from '../components/MyPageShell';
import PageHeader from '../components/layout/PageHeader';
import Tabs from '../components/common/Tabs';
import { useAuthStore } from '../../../core/authStore';
import { formatCurrency, formatDateTime } from '../../../core/format';
import { createDeposit, type DepositInfo } from '../api/checkoutClient';
import {
  cancelMyOrder,
  fetchMyAccount,
  fetchMyDeposits,
  fetchMyInvoices,
  fetchMyOrders,
  fetchMyReturns,
  fetchMyWarranties,
  updateMyProfile,
  type MyDeposit,
  type MyInvoice,
  type MyOrder,
  type MyProfile,
  type MyReturn,
  type MyWarranty,
} from '../api/accountClient';

/** Lấy message lỗi gọn từ response axios. */
function errMessage(e: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại.'): string {
  const anyE = e as { response?: { data?: { message?: string } } };
  return anyE?.response?.data?.message || fallback;
}

/* ---------- Badge trạng thái ---------- */

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  processing: { label: 'Đang xử lý', cls: 'tw-bg-amber-100 tw-text-amber-700' },
  success: { label: 'Hoàn tất', cls: 'tw-bg-green-100 tw-text-green-700' },
  failed: { label: 'Thất bại', cls: 'tw-bg-red-100 tw-text-red-600' },
  cancelled: { label: 'Đã hủy', cls: 'tw-bg-neutral-200 tw-text-neutral-600' },
};

function StatusBadge({ status, map }: { status: string; map?: Record<string, { label: string; cls: string }> }) {
  const m = (map ?? ORDER_STATUS)[status] ?? { label: status, cls: 'tw-bg-neutral-100 tw-text-neutral-600' };
  return (
    <span className={`tw-inline-block tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-[11.5px] tw-font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

/* ---------- Khối trạng thái tải/rỗng dùng chung ---------- */

function AsyncBlock({
  loading,
  error,
  empty,
  emptyText,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="tw-flex tw-items-center tw-justify-center tw-py-16 tw-text-neutral-400">
        <i className="bi bi-arrow-repeat tw-mr-2 tw-animate-spin tw-text-2xl tw-text-gold-dark" /> Đang tải…
      </div>
    );
  if (error)
    return <p className="tw-rounded-lg tw-bg-red-50 tw-px-4 tw-py-3 tw-text-[13.5px] tw-text-red-600">{error}</p>;
  if (empty)
    return (
      <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-16 tw-text-center tw-text-neutral-400">
        <i className="bi bi-inbox tw-mb-2 tw-text-4xl tw-text-gold/50" />
        <p className="tw-text-[14px]">{emptyText}</p>
      </div>
    );
  return <>{children}</>;
}

/* ---------- Tab: Đơn hàng ---------- */

function OrdersTab() {
  const [items, setItems] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await fetchMyOrders();
      setItems(items);
    } catch (e) {
      setError(errMessage(e, 'Không tải được đơn hàng.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (id: number) => {
    setBusy(id);
    try {
      const updated = await cancelMyOrder(id);
      setItems((prev) => prev.map((o) => (o.id === id ? { ...o, status: updated.status } : o)));
    } catch (e) {
      setError(errMessage(e, 'Không hủy được đơn.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AsyncBlock loading={loading} error={error} empty={items.length === 0} emptyText="Bạn chưa có đơn hàng nào.">
      <ul className="tw-flex tw-flex-col tw-gap-3">
        {items.map((o) => {
          const expanded = open === o.id;
          return (
            <li key={o.id} className="tw-overflow-hidden tw-rounded-xl tw-border tw-border-neutral-200 tw-bg-white tw-shadow-sm">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : o.id)}
                className="tw-flex tw-w-full tw-items-center tw-gap-3 tw-px-4 tw-py-3 tw-text-left hover:tw-bg-neutral-50"
              >
                <div className="tw-flex-1">
                  <p className="tw-text-[13.5px] tw-font-semibold tw-text-ink">{o.product_name}</p>
                  <p className="tw-mt-0.5 tw-text-[12px] tw-text-neutral-400">
                    #{o.code} · {formatDateTime(o.created_at)} · SL {o.quantity}
                  </p>
                </div>
                <span className="tw-text-[13.5px] tw-font-bold tw-text-gold-dark">{formatCurrency(o.total_amount)}</span>
                <StatusBadge status={o.status} />
                <i className={`bi bi-chevron-${expanded ? 'up' : 'down'} tw-text-[11px] tw-text-neutral-400`} />
              </button>

              {expanded && (
                <div className="tw-border-t tw-border-neutral-100 tw-bg-neutral-50/60 tw-px-4 tw-py-3">
                  <div className="tw-mb-2 tw-flex tw-flex-wrap tw-gap-x-6 tw-gap-y-1 tw-text-[12.5px] tw-text-neutral-500">
                    <span>Đơn giá: <b className="tw-text-ink">{formatCurrency(o.unit_price)}</b></span>
                    <span>Số lượng: <b className="tw-text-ink">{o.quantity}</b></span>
                    <span>Tổng: <b className="tw-text-gold-dark">{formatCurrency(o.total_amount)}</b></span>
                  </div>

                  {o.manual_fulfillment_required ? (
                    <div className="tw-rounded-lg tw-bg-gold/10 tw-p-3 tw-text-[12.5px] tw-text-neutral-700">
                      <p className="tw-mb-1 tw-font-semibold tw-text-gold-dark">Đơn cần xử lý thủ công</p>
                      <p>Nhân viên sẽ cấp phát &amp; liên hệ bàn giao.</p>
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
                      {o.manual_qr_image_url && (
                        <img src={o.manual_qr_image_url} alt="QR" className="tw-mt-2 tw-h-40 tw-w-40 tw-rounded-lg tw-border tw-border-neutral-200 tw-bg-white tw-object-contain tw-p-1" />
                      )}
                    </div>
                  ) : o.delivered_content ? (
                    <div>
                      <p className="tw-mb-1 tw-text-[12px] tw-font-semibold tw-text-neutral-500">Nội dung bàn giao</p>
                      <pre className="tw-whitespace-pre-wrap tw-break-words tw-rounded-lg tw-bg-white tw-border tw-border-neutral-200 tw-p-3 tw-text-[12.5px] tw-text-green-700">
                        {o.delivered_content}
                      </pre>
                    </div>
                  ) : (
                    <p className="tw-text-[12.5px] tw-text-neutral-500">
                      {o.status === 'processing'
                        ? 'Đơn đang được xử lý. Nội dung bàn giao sẽ hiển thị tại đây khi hoàn tất.'
                        : 'Chưa có nội dung bàn giao.'}
                    </p>
                  )}

                  {o.status === 'processing' && (
                    <button
                      type="button"
                      onClick={() => cancel(o.id)}
                      disabled={busy === o.id}
                      className="tw-mt-3 tw-rounded-full tw-border tw-border-red-200 tw-px-4 tw-py-1.5 tw-text-[12.5px] tw-font-semibold tw-text-red-600 hover:tw-bg-red-50 disabled:tw-opacity-50"
                    >
                      {busy === o.id ? 'Đang hủy…' : 'Hủy đơn'}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </AsyncBlock>
  );
}

/* ---------- Tab: Ví & Nạp tiền ---------- */

function WalletTab() {
  const [balance, setBalance] = useState<number | null>(null);
  const [items, setItems] = useState<MyDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [deposit, setDeposit] = useState<DepositInfo | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [acc, dep] = await Promise.all([fetchMyAccount(), fetchMyDeposits()]);
      setBalance(acc.balance);
      setItems(dep.items);
    } catch (e) {
      setError(errMessage(e, 'Không tải được thông tin ví.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startTopup = async () => {
    const value = Math.max(1000, Math.ceil((parseFloat(amount) || 0) / 1000) * 1000);
    if (value < 1000) return;
    setCreating(true);
    setError(null);
    try {
      const d = await createDeposit(value);
      setDeposit(d);
      void load();
    } catch (e) {
      setError(errMessage(e, 'Không tạo được mã nạp.'));
    } finally {
      setCreating(false);
    }
  };

  const DEPOSIT_STATUS: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Chờ chuyển khoản', cls: 'tw-bg-amber-100 tw-text-amber-700' },
    success: { label: 'Đã cộng ví', cls: 'tw-bg-green-100 tw-text-green-700' },
    failed: { label: 'Thất bại', cls: 'tw-bg-red-100 tw-text-red-600' },
  };

  return (
    <div className="tw-flex tw-flex-col tw-gap-6">
      {/* Số dư */}
      <div className="tw-rounded-2xl tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-p-5 tw-text-black tw-shadow-[0_6px_20px_rgba(201,164,76,0.35)]">
        <p className="tw-text-[13px] tw-font-semibold tw-opacity-80">Số dư ví hiện tại</p>
        <p className="tw-mt-1 tw-text-[30px] tw-font-extrabold">
          {loading ? '…' : formatCurrency(balance ?? 0)}
        </p>
      </div>

      {/* Nạp thêm */}
      <div className="tw-rounded-xl tw-border tw-border-neutral-200 tw-bg-white tw-p-4">
        <p className="tw-mb-2 tw-text-[14px] tw-font-bold tw-text-ink">Nạp thêm tiền vào ví</p>
        {!deposit ? (
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
            <input
              type="number"
              min={1000}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Nhập số tiền (đ)"
              className="tw-w-48 tw-rounded-lg tw-border tw-border-neutral-300 tw-px-3 tw-py-2 tw-text-[14px] tw-outline-none focus:tw-border-gold"
            />
            <button
              type="button"
              onClick={startTopup}
              disabled={creating || !amount}
              className="tw-rounded-full tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-px-5 tw-py-2 tw-text-[13.5px] tw-font-bold tw-text-black tw-shadow-sm hover:-tw-translate-y-px disabled:tw-cursor-not-allowed disabled:tw-opacity-60"
            >
              {creating ? 'Đang tạo…' : 'Tạo mã nạp VietQR'}
            </button>
          </div>
        ) : (
          <div className="tw-rounded-xl tw-border tw-border-neutral-200 tw-bg-neutral-50 tw-p-4 tw-text-center">
            {deposit.qr_url && (
              <img src={deposit.qr_url} alt="VietQR" className="tw-mx-auto tw-mb-3 tw-h-56 tw-w-56 tw-rounded-lg tw-border tw-border-neutral-200 tw-bg-white tw-object-contain tw-p-1" />
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
            <p className="tw-text-[12px] tw-text-neutral-400">Sau khi chuyển khoản, ví sẽ được cộng tiền tự động trong giây lát.</p>
            <button onClick={() => setDeposit(null)} className="tw-mt-3 tw-text-[13px] tw-text-neutral-400 hover:tw-text-gold-dark">
              ← Nạp số tiền khác
            </button>
          </div>
        )}
        {error && <p className="tw-mt-3 tw-rounded-lg tw-bg-red-50 tw-px-3 tw-py-2 tw-text-[13px] tw-text-red-600">{error}</p>}
      </div>

      {/* Lịch sử nạp */}
      <div>
        <p className="tw-mb-2 tw-text-[14px] tw-font-bold tw-text-ink">Lịch sử nạp tiền</p>
        <AsyncBlock loading={loading} error={null} empty={items.length === 0} emptyText="Chưa có giao dịch nạp nào.">
          <ul className="tw-flex tw-flex-col tw-gap-2">
            {items.map((d) => (
              <li key={d.id} className="tw-flex tw-items-center tw-gap-3 tw-rounded-lg tw-border tw-border-neutral-200 tw-bg-white tw-px-4 tw-py-2.5">
                <div className="tw-flex-1">
                  <p className="tw-text-[13px] tw-font-mono tw-text-neutral-600">{d.reference_code ?? `#${d.id}`}</p>
                  <p className="tw-text-[12px] tw-text-neutral-400">{formatDateTime(d.created_at)}</p>
                </div>
                <span className="tw-text-[13.5px] tw-font-bold tw-text-gold-dark">{formatCurrency(d.amount)}</span>
                <StatusBadge status={d.status} map={DEPOSIT_STATUS} />
              </li>
            ))}
          </ul>
        </AsyncBlock>
      </div>
    </div>
  );
}

/* ---------- Tab: Hóa đơn ---------- */

function InvoicesTab() {
  const [items, setItems] = useState<MyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { items } = await fetchMyInvoices();
        setItems(items);
      } catch (e) {
        setError(errMessage(e, 'Không tải được hóa đơn.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AsyncBlock loading={loading} error={error} empty={items.length === 0} emptyText="Chưa có hóa đơn nào.">
      <div className="tw-overflow-x-auto">
        <table className="tw-w-full tw-text-[13px]">
          <thead>
            <tr className="tw-border-b tw-border-neutral-200 tw-text-left tw-text-neutral-500">
              <th className="tw-py-2 tw-pr-3 tw-font-semibold">Mã</th>
              <th className="tw-py-2 tw-pr-3 tw-font-semibold">Sản phẩm</th>
              <th className="tw-py-2 tw-pr-3 tw-font-semibold">SL</th>
              <th className="tw-py-2 tw-pr-3 tw-font-semibold">Tổng</th>
              <th className="tw-py-2 tw-pr-3 tw-font-semibold">Ngày</th>
              <th className="tw-py-2 tw-font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map((iv) => (
              <tr key={iv.id} className="tw-border-b tw-border-neutral-100">
                <td className="tw-py-2.5 tw-pr-3 tw-font-mono tw-text-neutral-600">{iv.code}</td>
                <td className="tw-py-2.5 tw-pr-3 tw-text-ink">{iv.product_name}</td>
                <td className="tw-py-2.5 tw-pr-3">{iv.quantity}</td>
                <td className="tw-py-2.5 tw-pr-3 tw-font-bold tw-text-gold-dark">{formatCurrency(iv.total)}</td>
                <td className="tw-py-2.5 tw-pr-3 tw-text-neutral-500">{formatDateTime(iv.issued_at ?? iv.created_at)}</td>
                <td className="tw-py-2.5">{iv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AsyncBlock>
  );
}

/* ---------- Tab: Bảo hành ---------- */

function WarrantiesTab() {
  const [items, setItems] = useState<MyWarranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { items } = await fetchMyWarranties();
        setItems(items);
      } catch (e) {
        setError(errMessage(e, 'Không tải được bảo hành.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AsyncBlock loading={loading} error={error} empty={items.length === 0} emptyText="Chưa có yêu cầu bảo hành nào.">
      <ul className="tw-flex tw-flex-col tw-gap-2">
        {items.map((w) => (
          <li key={w.id} className="tw-flex tw-items-center tw-gap-3 tw-rounded-lg tw-border tw-border-neutral-200 tw-bg-white tw-px-4 tw-py-3">
            <div className="tw-flex-1">
              <p className="tw-text-[13.5px] tw-font-semibold tw-text-ink">{w.product_name ?? w.code ?? `#${w.id}`}</p>
              <p className="tw-text-[12px] tw-text-neutral-400">{formatDateTime(w.created_at)}</p>
            </div>
            <span className="tw-rounded-full tw-bg-neutral-100 tw-px-2.5 tw-py-0.5 tw-text-[11.5px] tw-font-semibold tw-text-neutral-600">{w.status}</span>
          </li>
        ))}
      </ul>
    </AsyncBlock>
  );
}

/* ---------- Tab: Đổi/Trả ---------- */

function ReturnsTab() {
  const [items, setItems] = useState<MyReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { items } = await fetchMyReturns();
        setItems(items);
      } catch (e) {
        setError(errMessage(e, 'Không tải được yêu cầu đổi/trả.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AsyncBlock loading={loading} error={error} empty={items.length === 0} emptyText="Chưa có yêu cầu đổi/trả nào.">
      <ul className="tw-flex tw-flex-col tw-gap-2">
        {items.map((r) => (
          <li key={r.id} className="tw-flex tw-items-center tw-gap-3 tw-rounded-lg tw-border tw-border-neutral-200 tw-bg-white tw-px-4 tw-py-3">
            <div className="tw-flex-1">
              <p className="tw-text-[13.5px] tw-font-semibold tw-text-ink">Yêu cầu #{r.id}</p>
              <p className="tw-text-[12px] tw-text-neutral-400">{formatDateTime(r.created_at)}</p>
            </div>
            <span className="tw-rounded-full tw-bg-neutral-100 tw-px-2.5 tw-py-0.5 tw-text-[11.5px] tw-font-semibold tw-text-neutral-600">{r.status}</span>
          </li>
        ))}
      </ul>
    </AsyncBlock>
  );
}

/* ---------- Tab: Hồ sơ ---------- */

function ProfileTab() {
  const setSession = useAuthStore((s) => s.setSession);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const acc = await fetchMyAccount();
        setProfile(acc.profile);
        setName(acc.profile.name);
        setEmail(acc.profile.email);
        setUserName(acc.profile.user_name ?? '');
      } catch (e) {
        setMsg({ ok: false, text: errMessage(e, 'Không tải được hồ sơ.') });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const payload: Record<string, string> = {};
      if (name.trim() && name !== profile?.name) payload.name = name.trim();
      if (email.trim() && email !== profile?.email) payload.email = email.trim();
      if (userName.trim() && userName !== (profile?.user_name ?? '')) payload.user_name = userName.trim();
      if (password) payload.password = password;
      if (Object.keys(payload).length === 0) {
        setMsg({ ok: false, text: 'Chưa có thay đổi nào.' });
        return;
      }
      const updated = await updateMyProfile(payload);
      setProfile(updated);
      setPassword('');
      // Đồng bộ tên hiển thị trên header.
      setSession({ user: { id: updated.id, name: updated.name } });
      setMsg({ ok: true, text: 'Đã cập nhật hồ sơ.' });
    } catch (e) {
      setMsg({ ok: false, text: errMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="tw-flex tw-items-center tw-justify-center tw-py-16 tw-text-neutral-400">
        <i className="bi bi-arrow-repeat tw-mr-2 tw-animate-spin tw-text-2xl tw-text-gold-dark" /> Đang tải…
      </div>
    );

  const field = 'tw-w-full tw-rounded-lg tw-border tw-border-neutral-300 tw-px-3 tw-py-2.5 tw-text-[14px] tw-outline-none focus:tw-border-gold';
  const label = 'tw-mb-1 tw-block tw-text-[12.5px] tw-font-semibold tw-text-neutral-600';

  return (
    <form onSubmit={save} className="tw-mx-auto tw-max-w-[520px] tw-flex tw-flex-col tw-gap-4">
      <div>
        <label className={label}>Họ tên</label>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className={label}>Email</label>
        <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className={label}>Tên đăng nhập</label>
        <input className={field} value={userName} onChange={(e) => setUserName(e.target.value)} />
      </div>
      <div>
        <label className={label}>Mật khẩu mới <span className="tw-font-normal tw-text-neutral-400">(để trống nếu không đổi)</span></label>
        <input type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" minLength={6} />
      </div>

      {msg && (
        <p className={`tw-rounded-lg tw-px-3 tw-py-2 tw-text-[13px] ${msg.ok ? 'tw-bg-green-50 tw-text-green-700' : 'tw-bg-red-50 tw-text-red-600'}`}>
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="tw-rounded-full tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-py-3 tw-text-[14px] tw-font-bold tw-text-black tw-shadow-[0_4px_14px_rgba(201,164,76,0.4)] hover:-tw-translate-y-px disabled:tw-cursor-not-allowed disabled:tw-opacity-60"
      >
        {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
      </button>
    </form>
  );
}

/* ---------- Trang tài khoản ---------- */

export default function AccountPage() {
  return (
    <MyPageShell>
      <PageHeader
        title="Tài khoản của tôi"
        intro="Quản lý đơn hàng, ví, hóa đơn, bảo hành và thông tin cá nhân của bạn."
        breadcrumb={[{ label: 'Tài khoản' }]}
      />
      <section className="tw-mx-auto tw-max-w-container tw-px-5 tw-py-10">
        <Tabs
          tabs={[
            { key: 'orders', label: 'Đơn hàng', render: () => <OrdersTab /> },
            { key: 'wallet', label: 'Ví & Nạp tiền', render: () => <WalletTab /> },
            { key: 'invoices', label: 'Hóa đơn', render: () => <InvoicesTab /> },
            { key: 'warranties', label: 'Bảo hành', render: () => <WarrantiesTab /> },
            { key: 'returns', label: 'Đổi/Trả', render: () => <ReturnsTab /> },
            { key: 'profile', label: 'Hồ sơ', render: () => <ProfileTab /> },
          ]}
        />
      </section>
    </MyPageShell>
  );
}
