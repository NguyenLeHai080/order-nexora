import { useEffect, useState } from 'react';
import { login, register } from '../../Auth/hooks/useAuth';
import NexoraLogo from './NexoraLogo';

interface Props {
  show: boolean;
  onClose: () => void;
  /** Tab mở mặc định. */
  initialMode?: 'login' | 'register';
  /** Gọi khi đăng nhập/đăng ký thành công (đóng modal, tiếp tục checkout...). */
  onSuccess?: () => void;
}

type Mode = 'login' | 'register';

/** Lấy thông báo lỗi gọn từ response axios. */
function errMessage(e: unknown): string {
  const anyE = e as { response?: { data?: { message?: string } } };
  return anyE?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
}

/**
 * Modal đăng nhập / đăng ký cho mypage — dựng bằng Tailwind (THEME SÁNG + gold,
 * prefix tw-), KHÔNG dùng react-bootstrap (preflight Tailwind đang tắt, tránh lệ
 * thuộc reset Bootstrap). Đăng nhập gọi useAuth.login; đăng ký gọi useAuth.register.
 */
export default function AuthModal({ show, onClose, initialMode = 'login', onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset khi mở lại.
  useEffect(() => {
    if (show) {
      setMode(initialMode);
      setError(null);
      setLoading(false);
    }
  }, [show, initialMode]);

  useEffect(() => {
    document.body.style.overflow = show ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        if (name.trim().length < 1) throw new Error('Vui lòng nhập họ tên.');
        if (password.length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự.');
        await register(name.trim(), email.trim(), password);
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error && !(e as { response?: unknown }).response ? e.message : errMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="tw-fixed tw-inset-0 tw-z-[120] tw-flex tw-items-center tw-justify-center tw-bg-black/70 tw-p-4"
      onClick={onClose}
    >
      <div
        className="tw-relative tw-w-full tw-max-w-[420px] tw-overflow-hidden tw-rounded-2xl tw-bg-white tw-text-ink tw-shadow-2xl tw-ring-1 tw-ring-gold/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="tw-flex tw-flex-col tw-items-center tw-gap-2 tw-border-b tw-border-neutral-200 tw-bg-gradient-to-b tw-from-gold/10 tw-to-transparent tw-px-6 tw-pt-7 tw-pb-5">
          <NexoraLogo size={34} tagline dark />
          <p className="tw-text-[13px] tw-text-neutral-500">
            {mode === 'login' ? 'Đăng nhập để mua hàng & quản lý đơn' : 'Tạo tài khoản NexoraTech miễn phí'}
          </p>
        </div>

        {/* Tabs */}
        <div className="tw-flex tw-border-b tw-border-neutral-200">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`tw-flex-1 tw-py-3 tw-text-[14px] tw-font-bold tw-transition-colors ${
                mode === m ? 'tw-border-b-2 tw-border-gold tw-text-gold-dark' : 'tw-text-neutral-400 hover:tw-text-ink'
              }`}
            >
              {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} className="tw-px-6 tw-py-6">
          {mode === 'register' && (
            <label className="tw-mb-3 tw-block">
              <span className="tw-mb-1 tw-block tw-text-[13px] tw-text-neutral-600">Họ tên</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="tw-w-full tw-rounded-lg tw-border tw-border-neutral-300 tw-bg-neutral-50 tw-px-3.5 tw-py-2.5 tw-text-[14px] tw-text-ink tw-outline-none tw-transition-colors placeholder:tw-text-neutral-400 focus:tw-border-gold focus:tw-bg-white"
                placeholder="Nguyễn Văn A"
              />
            </label>
          )}

          <label className="tw-mb-3 tw-block">
            <span className="tw-mb-1 tw-block tw-text-[13px] tw-text-neutral-600">
              {mode === 'login' ? 'Email hoặc tên đăng nhập' : 'Email'}
            </span>
            <input
              type={mode === 'login' ? 'text' : 'email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'username' : 'email'}
              className="tw-w-full tw-rounded-lg tw-border tw-border-neutral-300 tw-bg-neutral-50 tw-px-3.5 tw-py-2.5 tw-text-[14px] tw-text-ink tw-outline-none tw-transition-colors placeholder:tw-text-neutral-400 focus:tw-border-gold focus:tw-bg-white"
              placeholder="ban@email.com"
            />
          </label>

          <label className="tw-mb-1 tw-block">
            <span className="tw-mb-1 tw-block tw-text-[13px] tw-text-neutral-600">Mật khẩu</span>
            <div className="tw-relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 6 : undefined}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="tw-w-full tw-rounded-lg tw-border tw-border-neutral-300 tw-bg-neutral-50 tw-px-3.5 tw-py-2.5 tw-pr-10 tw-text-[14px] tw-text-ink tw-outline-none tw-transition-colors placeholder:tw-text-neutral-400 focus:tw-border-gold focus:tw-bg-white"
                placeholder={mode === 'register' ? 'Tối thiểu 6 ký tự' : '••••••••'}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="tw-absolute tw-right-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-neutral-400 hover:tw-text-gold-dark"
                aria-label="Hiện/ẩn mật khẩu"
              >
                <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
          </label>

          {error && (
            <p className="tw-mt-3 tw-rounded-lg tw-bg-red-50 tw-px-3 tw-py-2 tw-text-[13px] tw-text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="tw-mt-5 tw-w-full tw-rounded-full tw-bg-gradient-to-r tw-from-gold-light tw-to-gold tw-py-3.5 tw-text-[14px] tw-font-bold tw-uppercase tw-text-black tw-shadow-[0_4px_16px_rgba(201,164,76,0.45)] tw-transition-all hover:-tw-translate-y-px hover:tw-shadow-[0_7px_24px_rgba(201,164,76,0.6)] active:tw-translate-y-0 disabled:tw-cursor-not-allowed disabled:tw-opacity-60 disabled:tw-shadow-none"
          >
            {loading ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>

          <p className="tw-mt-4 tw-text-center tw-text-[13px] tw-text-neutral-500">
            {mode === 'login' ? (
              <>
                Chưa có tài khoản?{' '}
                <button type="button" onClick={() => setMode('register')} className="tw-font-semibold tw-text-gold-dark hover:tw-underline">
                  Đăng ký ngay
                </button>
              </>
            ) : (
              <>
                Đã có tài khoản?{' '}
                <button type="button" onClick={() => setMode('login')} className="tw-font-semibold tw-text-gold-dark hover:tw-underline">
                  Đăng nhập
                </button>
              </>
            )}
          </p>
        </form>

        <button
          type="button"
          onClick={onClose}
          className="tw-absolute tw-right-3 tw-top-3 tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-full tw-text-neutral-400 tw-transition-colors hover:tw-bg-neutral-100 hover:tw-text-ink"
          aria-label="Đóng"
        >
          <i className="bi bi-x-lg" />
        </button>
      </div>
    </div>
  );
}
