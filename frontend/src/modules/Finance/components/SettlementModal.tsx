import { useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { formatCurrency } from '../../../core/format';
import { Button, TextInput, TextareaInput } from '../../../ui';
import { financeActions, type SupplierDebt } from '../hooks/useFinance';

interface Props {
  debt: SupplierDebt | null;
  onClose: () => void;
  onSaved: () => void;
}

// Modal ghi một lần tất toán (trả tiền) cho NCC — giảm công nợ outstanding.
export default function SettlementModal({ debt, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleEnter() {
    setAmount(debt?.outstanding ?? '');
    setNote('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!debt) return;
    setSaving(true);
    setError(null);
    try {
      await financeActions.createSettlement({
        supplier_id: debt.supplier_id,
        amount,
        note: note.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal show={!!debt} onHide={onClose} onEnter={handleEnter} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Ghi tất toán NCC</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <p>
            Nhà cung cấp: <strong>{debt?.supplier_name}</strong>
            <br />
            Còn nợ: <strong className="text-danger">{formatCurrency(debt?.outstanding)}</strong>
          </p>
          <Row className="g-3">
            <Col md={12}>
              <TextInput
                id="settle-amount"
                label="Số tiền trả"
                type="number"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                required
              />
            </Col>
            <Col md={12}>
              <TextareaInput
                id="settle-note"
                label="Ghi chú"
                rows={2}
                value={note}
                placeholder="Vd: Chuyển khoản đợt 1"
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" variant="primary" loading={saving}>Ghi tất toán</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
