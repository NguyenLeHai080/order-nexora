import type { Permission } from '../hooks/useRoles';

export interface PermissionGroup {
  subject: string;
  permissions: Permission[];
}

/**
 * Nhóm quyền theo subject (phần trước dấu chấm trong "subject.action").
 * Vd: "users.index", "users.store" -> nhóm "users".
 */
export function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const map = new Map<string, Permission[]>();
  for (const p of permissions) {
    const subject = p.name.includes('.') ? p.name.split('.')[0] : 'khác';
    if (!map.has(subject)) map.set(subject, []);
    map.get(subject)!.push(p);
  }
  return Array.from(map.entries())
    .map(([subject, perms]) => ({ subject, permissions: perms }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

/** Phần action sau dấu chấm, để hiển thị nhãn cột. */
export function actionLabel(permissionName: string): string {
  const action = permissionName.includes('.') ? permissionName.split('.')[1] : permissionName;
  const map: Record<string, string> = {
    index: 'Xem',
    show: 'Chi tiết',
    store: 'Tạo',
    update: 'Sửa',
    destroy: 'Xóa',
  };
  return map[action] ?? action;
}
