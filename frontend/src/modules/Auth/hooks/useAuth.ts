import { apiClient } from '../../../core/apiClient';
import { useAuthStore } from '../../../core/authStore';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: { id: number; name: string };
  available_organizations: { id: number; name: string }[];
  current_organization_id: number | null;
  roles: string[];
  permissions: string[];
  abilities: { action: string; subject: string }[];
}

// Gọi API đăng nhập rồi nạp phiên vào store.
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post('/auth/login', { email, password });
  const data: LoginResponse = res.data.data;
  useAuthStore.getState().setSession({
    token: data.access_token,
    user: data.user,
    organizationId: data.current_organization_id,
    availableOrganizations: data.available_organizations,
    roles: data.roles,
    permissions: data.permissions,
    abilities: data.abilities,
  });
  return data;
}

// Chuyển tổ chức làm việc và cập nhật lại quyền theo tổ chức mới.
export async function switchOrganization(organizationId: number): Promise<void> {
  const res = await apiClient.post('/auth/switch-organization', { organization_id: organizationId });
  const data = res.data.data;
  useAuthStore.getState().setSession({
    organizationId: data.current_organization_id,
    roles: data.roles,
    permissions: data.permissions,
    abilities: data.abilities,
  });
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    useAuthStore.getState().logout();
  }
}
