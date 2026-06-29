import { createListStore } from '../../../core/createListStore';
import type { Role } from '../hooks/useRoles';

/** Store UI cục bộ của module Roles (modal thêm/sửa, xóa). */
export const useRoleStore = createListStore<Role>();
