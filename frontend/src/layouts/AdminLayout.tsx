import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../core/authStore';
import { logout } from '../modules/Auth/authApi';

// Layout Admin: sidebar điều hướng + vùng nội dung. Menu ẩn/hiện theo quyền.
export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, can } = useAuthStore();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <aside style={{ width: 220, background: '#1f2937', color: '#fff', padding: 16 }}>
        <h2 style={{ fontSize: 18 }}>Order Nexora</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <Link to="/" style={{ color: '#e5e7eb' }}>Tổng quan</Link>
          {can('index', 'User') && <Link to="/users" style={{ color: '#e5e7eb' }}>Người dùng</Link>}
          {can('index', 'Product') && <Link to="/products" style={{ color: '#e5e7eb' }}>Sản phẩm</Link>}
          {can('index', 'Order') && <Link to="/orders" style={{ color: '#e5e7eb' }}>Đơn hàng</Link>}
          {can('index', 'Payment') && <Link to="/payments" style={{ color: '#e5e7eb' }}>Thanh toán</Link>}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <span>Xin chào, {user?.name}</span>
          <button onClick={handleLogout}>Đăng xuất</button>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
