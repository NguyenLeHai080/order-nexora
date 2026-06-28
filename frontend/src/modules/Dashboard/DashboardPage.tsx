import { useAuthStore } from '../../core/authStore';

// Trang tổng quan đơn giản.
export default function DashboardPage() {
  const { user, roles, organizationId } = useAuthStore();
  return (
    <div>
      <h1>Tổng quan</h1>
      <p>Người dùng: {user?.name}</p>
      <p>Vai trò: {roles.join(', ') || 'N/A'}</p>
      <p>Tổ chức đang làm việc: {organizationId ?? 'Chưa chọn'}</p>
    </div>
  );
}
