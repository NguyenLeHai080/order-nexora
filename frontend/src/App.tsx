import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './core/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './modules/Auth/pages/LoginPage';
import DashboardPage from './modules/Dashboard/DashboardPage';
import UserListPage from './modules/UserManagement/pages/UserListPage';

// Khai báo route. Mỗi module nghiệp vụ tự đăng ký page của mình ở đây.
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
          <Route
            path="users"
            element={
              <ProtectedRoute permission="users.index">
                <UserListPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
