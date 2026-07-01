import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../core/authStore';
import { logout } from '../modules/Auth/hooks/useAuth';

interface MenuItem {
  to: string;
  label: string;
  icon: string;
  // Quyền cần có để thấy menu. Bỏ trống = luôn hiện.
  can?: { action: string; subject: string };
}

// Cấu hình menu sidebar. Ẩn/hiện theo quyền (abilities).
const MENU: { section: string; items: MenuItem[] }[] = [
  {
    section: 'Tổng quan',
    items: [{ to: '/admin', label: 'Dashboard', icon: 'bi-speedometer2' }],
  },
  {
    section: 'Quản lý kho hàng',
    items: [
      { to: '/admin/products', label: 'Sản phẩm & Kho', icon: 'bi-box-seam', can: { action: 'index', subject: 'Product' } },
      { to: '/admin/categories', label: 'Danh mục sản phẩm', icon: 'bi-tags', can: { action: 'index', subject: 'Categorie' } },
      { to: '/admin/inventory', label: 'Tồn kho (sổ kho)', icon: 'bi-clipboard-data', can: { action: 'index', subject: 'Inventory' } },
      { to: '/admin/suppliers', label: 'Nhà cung cấp kho', icon: 'bi-truck', can: { action: 'index', subject: 'Supplier' } },
      { to: '/admin/integrations', label: 'NCC & Tích hợp API', icon: 'bi-plugin', can: { action: 'index', subject: 'Partner' } },
      { to: '/admin/profit', label: 'Lợi nhuận', icon: 'bi-graph-up-arrow', can: { action: 'index', subject: 'Order' } },
    ],
  },
  {
    section: 'Bán hàng',
    items: [
      { to: '/admin/orders', label: 'Đơn hàng', icon: 'bi-bag-check', can: { action: 'index', subject: 'Order' } },
      { to: '/admin/invoices', label: 'Hóa đơn', icon: 'bi-receipt', can: { action: 'index', subject: 'Invoice' } },
      { to: '/admin/warranties', label: 'Bảo hành', icon: 'bi-shield-check', can: { action: 'index', subject: 'Warrantie' } },
      { to: '/admin/returns', label: 'Đổi/Trả hàng', icon: 'bi-arrow-left-right', can: { action: 'index', subject: 'Return' } },
      { to: '/admin/vouchers', label: 'Mã giảm giá', icon: 'bi-ticket-perforated', can: { action: 'index', subject: 'Voucher' } },
    ],
  },
  {
    section: 'Tài chính',
    items: [
      { to: '/admin/payments', label: 'Thanh toán & Nạp tiền', icon: 'bi-credit-card', can: { action: 'index', subject: 'Payment' } },
    ],
  },
  {
    section: 'Nội dung',
    items: [
      { to: '/admin/articles', label: 'Bài viết', icon: 'bi-file-earmark-text', can: { action: 'index', subject: 'Article' } },
      { to: '/admin/faqs', label: 'Câu hỏi thường gặp', icon: 'bi-question-circle', can: { action: 'index', subject: 'Faq' } },
      { to: '/admin/engagements', label: 'Tương tác landing', icon: 'bi-chat-heart', can: { action: 'index', subject: 'Engagement' } },
    ],
  },
  {
    section: 'Hệ thống',
    items: [
      { to: '/admin/users', label: 'Người dùng', icon: 'bi-people', can: { action: 'index', subject: 'User' } },
      { to: '/admin/roles', label: 'Vai trò & Phân quyền', icon: 'bi-shield-lock', can: { action: 'index', subject: 'Role' } },
      { to: '/admin/organizations', label: 'Tổ chức', icon: 'bi-diagram-3', can: { action: 'index', subject: 'Organization' } },
      { to: '/admin/log-activities', label: 'Nhật ký', icon: 'bi-clock-history', can: { action: 'index', subject: 'Log-activity' } },
      { to: '/admin/settings', label: 'Cài đặt', icon: 'bi-gear', can: { action: 'index', subject: 'Setting' } },
      { to: '/admin/ui-kit', label: 'UI Kit', icon: 'bi-palette' },
    ],
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, roles, can } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="app-wrapper">
      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="app-brand">
          ORDER<span>NEXORA</span>
        </div>
        <div className="app-menu">
          {MENU.map((group) => {
            const visible = group.items.filter((it) => !it.can || can(it.can.action, it.can.subject));
            if (visible.length === 0) return null;
            return (
              <div key={group.section}>
                <div className="app-menu-label">{group.section}</div>
                {visible.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.to === '/admin'}
                    className={({ isActive }) => `app-menu-link ${isActive ? 'active' : ''}`}
                  >
                    <i className={`bi ${it.icon}`} />
                    <span>{it.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </div>
      </aside>

      <div className={`app-main ${collapsed ? 'full' : ''}`}>
        <header className="app-topbar">
          <button className="btn btn-light btn-sm" onClick={() => setCollapsed((c) => !c)}>
            <i className="bi bi-list fs-5" />
          </button>
          <Dropdown align="end">
            <Dropdown.Toggle variant="light" className="d-flex align-items-center gap-2 border-0">
              <span
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                style={{ width: 34, height: 34 }}
              >
                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
              </span>
              <span className="text-start d-none d-sm-block">
                <div className="fw-semibold lh-1">{user?.name}</div>
                <small className="text-muted">{roles.join(', ') || 'Người dùng'}</small>
              </span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Header>Đã đăng nhập với</Dropdown.Header>
              <Dropdown.ItemText className="fw-semibold">{user?.name}</Dropdown.ItemText>
              <Dropdown.Divider />
              <Dropdown.Item as={Link} to="/admin/settings">
                <i className="bi bi-gear me-2" />
                Cài đặt
              </Dropdown.Item>
              <Dropdown.Item onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2" />
                Đăng xuất
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </header>
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
