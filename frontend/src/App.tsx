import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute, { AdminGuard, CustomerRoute } from './core/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import HomePage from './modules/mypage/pages/HomePage';
import ProductDetailPage from './modules/mypage/pages/ProductDetailPage';
import ServicesPage from './modules/mypage/pages/ServicesPage';
import TipsPage from './modules/mypage/pages/TipsPage';
import NewsPage from './modules/mypage/pages/NewsPage';
import PolicyPage from './modules/mypage/pages/PolicyPage';
import ArticleDetailPage from './modules/mypage/pages/ArticleDetailPage';
import FaqPage from './modules/mypage/pages/FaqPage';
import OrderLookupPage from './modules/mypage/pages/OrderLookupPage';
import AccountPage from './modules/mypage/pages/AccountPage';
import DashboardPage from './modules/Dashboard/pages/DashboardPage';
import UserListPage from './modules/Users/pages/UserListPage';
import RoleListPage from './modules/Roles/pages/RoleListPage';
import OrganizationListPage from './modules/Organizations/pages/OrganizationListPage';
import ProductListPage from './modules/Products/pages/ProductListPage';
import CategoryListPage from './modules/Categories/pages/CategoryListPage';
import SupplierListPage from './modules/Suppliers/pages/SupplierListPage';
import OrderListPage from './modules/Orders/pages/OrderListPage';
import ProfitPage from './modules/Profit/pages/ProfitPage';
import PaymentPage from './modules/Payments/pages/PaymentPage';
import FinancePage from './modules/Finance/pages/FinancePage';
import VoucherListPage from './modules/Vouchers/pages/VoucherListPage';
import SettingPage from './modules/Settings/pages/SettingPage';
import LogActivityPage from './modules/LogActivities/pages/LogActivityPage';
import UiKitPage from './modules/UiKit/pages/UiKitPage';
import IntegrationsPage from './modules/Partner/pages/IntegrationsPage';
import InventoryListPage from './modules/Inventory/pages/InventoryListPage';
import InvoiceListPage from './modules/Invoices/pages/InvoiceListPage';
import WarrantyListPage from './modules/Warranties/pages/WarrantyListPage';
import ReturnListPage from './modules/Returns/pages/ReturnListPage';
import ArticleListPage from './modules/Content/pages/ArticleListPage';
import FaqListPage from './modules/Content/pages/FaqListPage';
import EngagementListPage from './modules/Engagement/pages/EngagementListPage';

/**
 * Khai báo route.
 * - `/` = landing (public). Không còn trang /login riêng — đăng nhập qua AuthModal.
 * - `/tai-khoan` = khu tài khoản khách (chỉ cần đăng nhập).
 * - `/admin/*` = backend quản trị, chỉ nhân viên (admin/ctv) qua AdminGuard;
 *   mỗi trang nghiệp vụ vẫn kiểm permission riêng.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public / landing */}
        <Route path="/" element={<HomePage />} />
        <Route path="/san-pham/:slug" element={<ProductDetailPage />} />
        <Route path="/dich-vu" element={<ServicesPage />} />
        <Route path="/danh-muc/thu-thuat" element={<TipsPage />} />
        <Route path="/danh-muc/tin-tuc" element={<NewsPage />} />
        <Route path="/danh-muc/chinh-sach" element={<PolicyPage />} />
        <Route path="/bai-viet/:slug" element={<ArticleDetailPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/tra-cuu-don" element={<OrderLookupPage />} />

        {/* Khu tài khoản khách (landing theme) */}
        <Route path="/tai-khoan" element={<CustomerRoute><AccountPage /></CustomerRoute>} />

        {/* Alias tương thích đường dẫn cũ */}
        <Route path="/landing" element={<Navigate to="/" replace />} />
        <Route path="/landing/san-pham/:slug" element={<Navigate to="/" replace />} />

        {/* Backend quản trị — chỉ admin/ctv */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<ProtectedRoute permission="users.index"><UserListPage /></ProtectedRoute>} />
          <Route path="roles" element={<ProtectedRoute permission="roles.index"><RoleListPage /></ProtectedRoute>} />
          <Route path="organizations" element={<ProtectedRoute permission="organizations.index"><OrganizationListPage /></ProtectedRoute>} />
          <Route path="products" element={<ProtectedRoute permission="products.index"><ProductListPage /></ProtectedRoute>} />
          <Route path="categories" element={<ProtectedRoute permission="categories.index"><CategoryListPage /></ProtectedRoute>} />
          <Route path="inventory" element={<ProtectedRoute permission="inventory.index"><InventoryListPage /></ProtectedRoute>} />
          <Route path="suppliers" element={<ProtectedRoute permission="suppliers.index"><SupplierListPage /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute permission="orders.index"><OrderListPage /></ProtectedRoute>} />
          <Route path="invoices" element={<ProtectedRoute permission="invoices.index"><InvoiceListPage /></ProtectedRoute>} />
          <Route path="warranties" element={<ProtectedRoute permission="warranties.index"><WarrantyListPage /></ProtectedRoute>} />
          <Route path="returns" element={<ProtectedRoute permission="returns.index"><ReturnListPage /></ProtectedRoute>} />
          <Route path="profit" element={<ProtectedRoute permission="orders.index"><ProfitPage /></ProtectedRoute>} />
          <Route path="payments" element={<ProtectedRoute permission="payments.index"><PaymentPage /></ProtectedRoute>} />
          <Route path="finance" element={<ProtectedRoute permission="finance.index"><FinancePage /></ProtectedRoute>} />
          <Route path="vouchers" element={<ProtectedRoute permission="vouchers.index"><VoucherListPage /></ProtectedRoute>} />
          <Route path="partner-webhooks" element={<Navigate to="/admin/integrations" replace />} />
          <Route path="integrations" element={<ProtectedRoute permission="partner.index"><IntegrationsPage /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute permission="settings.index"><SettingPage /></ProtectedRoute>} />
          <Route path="log-activities" element={<ProtectedRoute permission="log-activities.index"><LogActivityPage /></ProtectedRoute>} />
          <Route path="articles" element={<ProtectedRoute permission="articles.index"><ArticleListPage /></ProtectedRoute>} />
          <Route path="faqs" element={<ProtectedRoute permission="faqs.index"><FaqListPage /></ProtectedRoute>} />
          <Route path="engagements" element={<ProtectedRoute permission="engagements.index"><EngagementListPage /></ProtectedRoute>} />
          <Route path="ui-kit" element={<UiKitPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
