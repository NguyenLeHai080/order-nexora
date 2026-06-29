import { useState } from 'react';
import { Form, Modal } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { Button, TextareaInput } from '../../../ui';
import { warrantyActions, type Warranty } from '../hooks/useWarranties';

interface Props {
  warranty: Warranty | null;
  onClose: () => void;
  onSaved: () => void;
}

// Modal ghi nhận yêu cầu bảo hành (claim) cho một phiếu đang hiệu lực.
export default function WarrantyClaimModal({ warranty, onClose, onSaved }: Props) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!warranty) return;
    setSaving(true);
    setError(null);
    try {
      await warrantyActions.claim(warranty.id, note);
      onSaved();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal show={!!warranty} onHide={onClose} onEnter={() => { setNote(''); setError(null); }} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Ghi nhận bảo hành — {warranty?.code}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <p className="text-muted">Sản phẩm: <strong>{warranty?.product_name}</strong></p>
          <TextareaInput
            id="wr-note"
            label="Mô tả lỗi / yêu cầu"
            rows={4}
            value={note}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" variant="primary" loading={saving}>Ghi nhận</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
