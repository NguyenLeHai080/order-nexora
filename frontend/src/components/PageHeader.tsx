import type { ReactNode } from 'react';

// Tiêu đề trang + breadcrumb kiểu Velzon, kèm vùng nút hành động bên phải.
export default function PageHeader({
  title,
  breadcrumb,
  actions,
}: {
  title: string;
  breadcrumb?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="d-flex align-items-center justify-content-between mb-4">
      <div>
        <h4 className="page-title mb-1">{title}</h4>
        <div className="text-muted" style={{ fontSize: '0.8rem' }}>
          Order Nexora {breadcrumb ? `› ${breadcrumb}` : ''}
        </div>
      </div>
      {actions && <div className="d-flex gap-2">{actions}</div>}
    </div>
  );
}
