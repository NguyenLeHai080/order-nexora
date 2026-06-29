import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './core/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './modules/Auth/pages/LoginPage';
import DashboardPage from './modules/Dashboard/pages/DashboardPage';
import UserListPage from './modules/Users/pages/UserListPage';
import RoleListPage from './modules/Roles/pages/RoleListPage';
import OrganizationListPage from './modules/Organizations/pages/OrganizationListPage';
import ProductListPage from './modules/Products/pages/ProductListPage';
import SupplierListPage from './modules/Suppliers/pages/SupplierListPage';
import OrderListPage from './modules/Orders/pages/OrderListPage';
import ProfitPage from './modules/Profit/pages/ProfitPage';
import PaymentPage from './modules/Payments/pages/PaymentPage';
import VoucherListPage from './modules/Vouchers/pages/VoucherListPage';
import SettingPage from './modules/Settings/pages/SettingPage';
import LogActivityPage from './modules/LogActivities/pages/LogActivityPage';
import UiKitPage from './modules/UiKit/pages/UiKitPage';
import IntegrationsPage from './modules/Partner/pages/IntegrationsPage';
import InventoryListPage from './modules/Inventory/pages/InventoryListPage';
import InvoiceListPage from './modules/Invoices/pages/InvoiceListPage';
import WarrantyListPage from './modules/Warranties/pages/WarrantyListPage';
import ReturnListPage from './modules/Returns/pages/ReturnListPage';

// Khai báo route. Mỗi trang nghiệp vụ được bảo vệ bằng permission tương ứng.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<ProtectedRoute permission="users.index"><UserListPage /></ProtectedRoute>} />
          <Route path="roles" element={<ProtectedRoute permission="roles.index"><RoleListPage /></ProtectedRoute>} />
          <Route path="organizations" element={<ProtectedRoute permission="organizations.index"><OrganizationListPage /></ProtectedRoute>} />
          <Route path="products" element={<ProtectedRoute permission="products.index"><ProductListPage /></ProtectedRoute>} />
          <Route path="inventory" element={<ProtectedRoute permission="inventory.index"><InventoryListPage /></ProtectedRoute>} />
          <Route path="suppliers" element={<ProtectedRoute permission="suppliers.index"><SupplierListPage /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute permission="orders.index"><OrderListPage /></ProtectedRoute>} />
          <Route path="invoices" element={<ProtectedRoute permission="invoices.index"><InvoiceListPage /></ProtectedRoute>} />
          <Route path="warranties" element={<ProtectedRoute permission="warranties.index"><WarrantyListPage /></ProtectedRoute>} />
          <Route path="returns" element={<ProtectedRoute permission="returns.index"><ReturnListPage /></ProtectedRoute>} />
          <Route path="profit" element={<ProtectedRoute permission="orders.index"><ProfitPage /></ProtectedRoute>} />
          <Route path="payments" element={<ProtectedRoute permission="payments.index"><PaymentPage /></ProtectedRoute>} />
          <Route path="vouchers" element={<ProtectedRoute permission="vouchers.index"><VoucherListPage /></ProtectedRoute>} />
          <Route path="partner-webhooks" element={<Navigate to="/integrations" replace />} />
          <Route path="integrations" element={<ProtectedRoute permission="partner.index"><IntegrationsPage /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute permission="settings.index"><SettingPage /></ProtectedRoute>} />
          <Route path="log-activities" element={<ProtectedRoute permission="log-activities.index"><LogActivityPage /></ProtectedRoute>} />
          <Route path="ui-kit" element={<UiKitPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
