import { Badge } from 'react-bootstrap';

// Map trạng thái backend -> màu + nhãn tiếng Việt.
const MAP: Record<string, { bg: string; label: string }> = {
  active: { bg: 'success-subtle', label: 'Hoạt động' },
  inactive: { bg: 'secondary-subtle', label: 'Tạm ngưng' },
  locked: { bg: 'danger-subtle', label: 'Đã khóa' },
  pending: { bg: 'warning-subtle', label: 'Chờ xử lý' },
  processing: { bg: 'info-subtle', label: 'Đang xử lý' },
  success: { bg: 'success-subtle', label: 'Thành công' },
  failed: { bg: 'danger-subtle', label: 'Thất bại' },
  cancelled: { bg: 'secondary-subtle', label: 'Đã hủy' },
  in_stock: { bg: 'success-subtle', label: 'Còn hàng' },
  out_of_stock: { bg: 'danger-subtle', label: 'Hết hàng' },
  // Hóa đơn
  issued: { bg: 'info-subtle', label: 'Đã phát hành' },
  paid: { bg: 'success-subtle', label: 'Đã thanh toán' },
  refunded: { bg: 'warning-subtle', label: 'Đã hoàn tiền' },
  // Bảo hành
  expired: { bg: 'secondary-subtle', label: 'Hết hạn' },
  claimed: { bg: 'info-subtle', label: 'Đã ghi nhận' },
  void: { bg: 'secondary-subtle', label: 'Vô hiệu' },
  // Đổi/trả
  requested: { bg: 'warning-subtle', label: 'Chờ duyệt' },
  approved: { bg: 'info-subtle', label: 'Đã duyệt' },
  rejected: { bg: 'danger-subtle', label: 'Từ chối' },
  completed: { bg: 'success-subtle', label: 'Hoàn tất' },
  // Sổ kho
  in: { bg: 'success-subtle', label: 'Nhập' },
  out: { bg: 'danger-subtle', label: 'Xuất' },
  adjust: { bg: 'info-subtle', label: 'Điều chỉnh' },
  return: { bg: 'warning-subtle', label: 'Hoàn kho' },
};

const TEXT: Record<string, string> = {
  'success-subtle': 'text-success',
  'secondary-subtle': 'text-secondary',
  'danger-subtle': 'text-danger',
  'warning-subtle': 'text-warning',
  'info-subtle': 'text-info',
};

export default function StatusBadge({ status }: { status: string }) {
  const item = MAP[status] ?? { bg: 'secondary-subtle', label: status };
  return (
    <Badge bg={item.bg} className={`${TEXT[item.bg] ?? 'text-secondary'} fw-medium`}>
      {item.label}
    </Badge>
  );
}
