import { Modal } from 'react-bootstrap';
import { useState } from 'react';
import { Button } from '../ui';

// Hộp thoại xác nhận dùng chung cho hành động xóa/nguy hiểm.
// Lắp từ UI kit Button (có sẵn trạng thái loading).
export default function ConfirmDialog({
  show,
  title = 'Xác nhận',
  message,
  confirmLabel = 'Xác nhận',
  variant = 'danger',
  onConfirm,
  onClose,
}: {
  show: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  variant?: 'primary' | 'danger' | 'warning' | 'success';
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onClose} disabled={loading}>
          Hủy
        </Button>
        <Button variant={variant} onClick={handleConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
