import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore, isStaffRoles } from '../core/authStore';

// Chặn truy cập khi chưa đăng nhập; có thể yêu cầu thêm permission cụ thể.
// Không còn trang /login riêng — chưa đăng nhập thì về landing (/) và tự mở popup.
export default function ProtectedRoute({
  children,
  permission,
}: {
  children: ReactNode;
  permission?: string;
}) {
  const { token, hasPermission } = useAuthStore();

  if (!token) {
    return <Navigate to="/?login=1" replace />;
  }
  if (permission && !hasPermission(permission)) {
    return <div style={{ padding: 24 }}>Bạn không có quyền truy cập trang này.</div>;
  }
  return <>{children}</>;
}

/**
 * Cổng vào backend /admin: bắt buộc đăng nhập + là nhân viên (admin/ctv).
 * - Chưa đăng nhập → về landing, tự mở popup đăng nhập.
 * - Đã đăng nhập nhưng là khách → đá về khu tài khoản khách (/tai-khoan).
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { token, roles } = useAuthStore();
  if (!token) {
    return <Navigate to="/?login=1" replace />;
  }
  if (!isStaffRoles(roles)) {
    return <Navigate to="/tai-khoan" replace />;
  }
  return <>{children}</>;
}

/** Khu "Tài khoản của tôi" (landing) — chỉ cần đăng nhập, không phân biệt role. */
export function CustomerRoute({ children }: { children: ReactNode }) {
  const { token } = useAuthStore();
  if (!token) {
    return <Navigate to="/?login=1" replace />;
  }
  return <>{children}</>;
}
