/** Cấu hình module Users: endpoint API + hằng số dùng trong module. */

export const USERS_ENDPOINT = '/users';

/** Tùy chọn lọc trạng thái cho thanh công cụ danh sách. */
export const USER_STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
];

/** Nhãn trạng thái hiển thị. */
export const USER_STATUS_LABEL: Record<string, string> = {
  active: 'Hoạt động',
  locked: 'Đã khóa',
};
