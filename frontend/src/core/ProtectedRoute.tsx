import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '../core/authStore';

// Chặn truy cập khi chưa đăng nhập; có thể yêu cầu thêm permission cụ thể.
export default function ProtectedRoute({
  children,
  permission,
}: {
  children: ReactNode;
  permission?: string;
}) {
  const { token, hasPermission } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (permission && !hasPermission(permission)) {
    return <div style={{ padding: 24 }}>Bạn không có quyền truy cập trang này.</div>;
  }
  return <>{children}</>;
}
