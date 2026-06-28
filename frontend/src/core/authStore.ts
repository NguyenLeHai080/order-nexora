import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Ability {
  action: string;
  subject: string;
}

export interface OrganizationBrief {
  id: number;
  name: string;
}

interface AuthState {
  token: string | null;
  user: { id: number; name: string } | null;
  organizationId: number | null;
  availableOrganizations: OrganizationBrief[];
  roles: string[];
  permissions: string[];
  abilities: Ability[];

  setSession: (data: Partial<AuthState>) => void;
  setOrganization: (id: number) => void;
  logout: () => void;
  can: (action: string, subject: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

// Lưu phiên đăng nhập vào localStorage để refresh trang không mất.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      organizationId: null,
      availableOrganizations: [],
      roles: [],
      permissions: [],
      abilities: [],

      setSession: (data) => set((state) => ({ ...state, ...data })),
      setOrganization: (id) => set({ organizationId: id }),
      logout: () =>
        set({
          token: null,
          user: null,
          organizationId: null,
          availableOrganizations: [],
          roles: [],
          permissions: [],
          abilities: [],
        }),

      // Kiểm tra quyền theo abilities (giống CASL). Admin có toàn quyền.
      can: (action, subject) => {
        const { roles, abilities } = get();
        if (roles.includes('admin')) return true;
        return abilities.some((a) => a.action === action && a.subject === subject);
      },
      hasPermission: (permission) => {
        const { roles, permissions } = get();
        if (roles.includes('admin')) return true;
        return permissions.includes(permission);
      },
    }),
    { name: 'order-nexora-auth' },
  ),
);
