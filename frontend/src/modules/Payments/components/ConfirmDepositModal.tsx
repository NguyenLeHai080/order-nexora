import { useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { formatCurrency } from '../../../core/format';
import { Button, SelectInput, TextareaInput } from '../../../ui';
import { paymentActions, type Deposit } from '../hooks/usePayments';
import { CONFIRM_RESULT_OPTIONS } from '../config/paymentConfig';

interface Props {
  deposit: Deposit | null;
  onClose: () => void;
  onSaved: () => void;
}

// Modal xác nhận nạp tiền thủ công (success/failed) — backend cộng tiền khi success.
export default function ConfirmDepositModal({ deposit, onClose, onSaved }: Props) {
  const [status, setStatus] = useState('success');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleEnter() {
    setStatus('success');
    setNote('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deposit) return;
    setSaving(true);
    setError(null);
    try {
      await paymentActions.confirmDeposit(deposit.id, { status, note: note || null });
      onSaved();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal show={!!deposit} onHide={onClose} onEnter={handleEnter} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Xác nhận nạp tiền</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <p>
            Mã: <strong className="font-monospace">{deposit?.reference_code}</strong> · Số tiền:{' '}
            <strong className="text-primary">{formatCurrency(deposit?.amount)}</strong>
          </p>
          <Row className="g-3">
            <Col md={12}>
              <SelectInput id="dep-status" label="Kết quả" value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                options={CONFIRM_RESULT_OPTIONS} />
            </Col>
            <Col md={12}>
              <TextareaInput id="dep-note" label="Ghi chú" rows={2} value={note}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)} />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" variant="success" loading={saving}>Xác nhận</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
