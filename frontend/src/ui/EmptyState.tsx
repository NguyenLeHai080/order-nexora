import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** Tên icon bootstrap-icons (vd "inbox"). */
  icon?: string;
  title?: string;
  /** Mô tả phụ dưới tiêu đề. */
  description?: ReactNode;
  /** Nút hành động tùy chọn (vd "Thêm mới"). */
  action?: ReactNode;
}

/** Trạng thái rỗng dùng chung: icon + tiêu đề + mô tả + hành động. */
export default function EmptyState({
  icon = 'inbox',
  title = 'Chưa có dữ liệu',
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="ui-empty">
      <i className={`bi bi-${icon}`} />
      <div className="ui-empty-title">{title}</div>
      {description && <div className="mt-1">{description}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
