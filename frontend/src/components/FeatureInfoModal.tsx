import { Modal } from 'react-bootstrap';
import { Button } from '../ui';
import { FEATURE_INFO } from './featureInfo';

interface Props {
  infoKey: string;
  show: boolean;
  onClose: () => void;
}

/**
 * Modal giới thiệu chức năng của một trang (nội dung lấy từ registry featureInfo).
 * Mở từ icon ⓘ cạnh tiêu đề ở PageHeader.
 */
export default function FeatureInfoModal({ infoKey, show, onClose }: Props) {
  const info = FEATURE_INFO[infoKey];
  if (!info) return null;

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">
          <i className="bi bi-info-circle me-2" />
          {info.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {info.flowStep && (
          <div className="badge bg-primary-subtle text-primary mb-3">
            <i className="bi bi-diagram-3 me-1" />
            {info.flowStep}
          </div>
        )}
        <p className="text-muted">{info.intro}</p>
        {info.sections.map((s) => (
          <div key={s.heading} className="mb-3">
            <h6 className="fw-semibold mb-1">{s.heading}</h6>
            <p className="text-muted mb-0">{s.body}</p>
          </div>
        ))}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onClose}>Đã hiểu</Button>
      </Modal.Footer>
    </Modal>
  );
}
