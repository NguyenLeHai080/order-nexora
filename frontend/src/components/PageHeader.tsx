import { useState, type ReactNode } from 'react';
import FeatureInfoModal from './FeatureInfoModal';

// Tiêu đề trang + breadcrumb kiểu Velzon, kèm vùng nút hành động bên phải.
// Truyền `infoKey` để hiện icon ⓘ mở modal giới thiệu chức năng.
export default function PageHeader({
  title,
  breadcrumb,
  actions,
  infoKey,
}: {
  title: string;
  breadcrumb?: string;
  actions?: ReactNode;
  infoKey?: string;
}) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="d-flex align-items-center justify-content-between mb-4">
      <div>
        <h4 className="page-title mb-1 d-flex align-items-center gap-2">
          {title}
          {infoKey && (
            <button
              type="button"
              className="btn btn-link p-0 text-primary lh-1"
              title="Giới thiệu chức năng"
              onClick={() => setShowInfo(true)}
            >
              <i className="bi bi-info-circle fs-6" />
            </button>
          )}
        </h4>
        <div className="text-muted" style={{ fontSize: '0.8rem' }}>
          Order Nexora {breadcrumb ? `› ${breadcrumb}` : ''}
        </div>
      </div>
      {actions && <div className="d-flex gap-2">{actions}</div>}
      {infoKey && <FeatureInfoModal infoKey={infoKey} show={showInfo} onClose={() => setShowInfo(false)} />}
    </div>
  );
}
