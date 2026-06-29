import { Modal } from 'react-bootstrap';
import type { LogItem } from '../hooks/useLogActivities';

interface Props {
  log: LogItem | null;
  onClose: () => void;
}

// Modal xem chi tiết một dòng nhật ký (chỉ đọc) + dữ liệu request dạng JSON.
export default function LogDetailModal({ log, onClose }: Props) {
  return (
    <Modal show={!!log} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">Chi tiết log #{log?.id}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {log && (
          <dl className="row mb-0">
            <dt className="col-3">Mô tả</dt>
            <dd className="col-9">{log.description}</dd>
            <dt className="col-3">Route</dt>
            <dd className="col-9 font-monospace">{log.method_type} {log.route}</dd>
            <dt className="col-3">Người dùng</dt>
            <dd className="col-9">{log.user_name} (#{log.id})</dd>
            <dt className="col-3">IP / Quốc gia</dt>
            <dd className="col-9">{log.ip_address} · {log.country || '-'}</dd>
            <dt className="col-3">User Agent</dt>
            <dd className="col-9 small text-muted">{log.user_agent}</dd>
            <dt className="col-3">Thời gian</dt>
            <dd className="col-9">{log.created_at ?? '-'}</dd>
            <dt className="col-12 mt-2">Dữ liệu request</dt>
            <dd className="col-12">
              <pre className="bg-light p-2 rounded mb-0" style={{ maxHeight: 240, overflow: 'auto' }}>
                {JSON.stringify(log.request_data, null, 2)}
              </pre>
            </dd>
          </dl>
        )}
      </Modal.Body>
    </Modal>
  );
}
