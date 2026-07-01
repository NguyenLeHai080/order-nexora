import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore, isStaffRoles } from '../../../core/authStore';
import { logout as doLogout } from '../../Auth/hooks/useAuth';
import { useCartStore } from '../store/cartStore';
import SiteHeader from './layout/SiteHeader';
import SiteFooter from './layout/SiteFooter';
import SiteFloats, { SiteBackToTop } from './layout/SiteFloats';
import CartDrawer from './CartDrawer';
import AuthModal from './AuthModal';
import '../mypage.css';

interface ShellApi {
  /** Mở giỏ hàng (drawer). */
  openCart: () => void;
  /** Mở modal đăng nhập/đăng ký. */
  openAuth: (mode?: 'login' | 'register') => void;
  /** Đã đăng nhập chưa. */
  isLoggedIn: boolean;
}

const ShellContext = createContext<ShellApi | null>(null);

/** Truy cập API của shell (mở giỏ/mở auth) từ bất kỳ component con nào. */
export function useMyPage(): ShellApi {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useMyPage phải dùng bên trong <MyPageShell>.');
  return ctx;
}

/**
 * Khung chung của trang public (mypage): header (giỏ + đăng nhập) → nội dung →
 * footer + floats, kèm CartDrawer và AuthModal dùng chung. Chia sẻ state mở
 * giỏ/auth qua context để mọi trang/section cùng điều khiển. Bọc bằng `.mypage`
 * (scope CSS + Tailwind, preflight TẮT — không rò sang admin).
 */
export default function MyPageShell({ children }: { children: ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty, 0));

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isLoggedIn = Boolean(token);

  const api = useMemo<ShellApi>(
    () => ({
      openCart: () => setCartOpen(true),
      openAuth: (mode = 'login') => {
        setAuthMode(mode);
        setAuthOpen(true);
      },
      isLoggedIn,
    }),
    [isLoggedIn],
  );

  // ?login=1 (vd bị đá từ /admin về): tự mở popup đăng nhập rồi dọn param.
  useEffect(() => {
    if (searchParams.get('login') === '1') {
      if (!token) {
        setAuthMode('login');
        setAuthOpen(true);
      }
      const next = new URLSearchParams(searchParams);
      next.delete('login');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, token, setSearchParams]);

  // Sau khi đăng nhập/đăng ký thành công: nhân viên (admin/ctv) → vào /admin;
  // khách → ở lại landing (không navigate để không phá luồng mua hàng).
  const handleAuthSuccess = () => {
    const roles = useAuthStore.getState().roles;
    if (isStaffRoles(roles)) {
      navigate('/admin');
    }
  };

  const handleLogout = async () => {
    await doLogout();
  };

  return (
    <ShellContext.Provider value={api}>
      <div className="mypage">
        <SiteHeader
          cartCount={cartCount}
          onCartClick={() => setCartOpen(true)}
          onLoginClick={() => api.openAuth('login')}
          userName={user?.name ?? null}
          onLogout={handleLogout}
        />
        {children}
        <SiteFooter />
        <SiteFloats />
        <SiteBackToTop />

        <CartDrawer
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          isLoggedIn={isLoggedIn}
          onRequireLogin={() => {
            setCartOpen(false);
            api.openAuth('login');
          }}
        />
        <AuthModal
          show={authOpen}
          onClose={() => setAuthOpen(false)}
          initialMode={authMode}
          onSuccess={handleAuthSuccess}
        />
      </div>
    </ShellContext.Provider>
  );
}
