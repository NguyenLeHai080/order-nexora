// Khai báo hằng số, cột bảng, endpoint riêng cho module UserManagement.
export const USER_ENDPOINT = '/users';

export const USER_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Tên' },
  { key: 'email', label: 'Email' },
  { key: 'balance', label: 'Số dư' },
  { key: 'status', label: 'Trạng thái' },
] as const;

export const USER_STATUS = {
  active: 'Hoạt động',
  locked: 'Khóa',
} as const;
