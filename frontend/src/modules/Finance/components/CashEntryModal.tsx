import { useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { Button, SelectInput, TextInput, TextareaInput } from '../../../ui';
import { financeActions, type CashEntry } from '../hooks/useFinance';
import { CASH_KIND_OPTIONS } from '../config/financeConfig';

interface Props {
  entry: CashEntry | null; // null = tạo mới; có giá trị = sửa
  show: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Modal thêm/sửa phiếu thu/chi thủ công.
export default function CashEntryModal({ entry, show, onClose, onSaved }: Props) {
  const [kind, setKind] = useState('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [occurredOn, setOccurredOn] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleEnter() {
    setKind(entry?.kind ?? 'income');
    setAmount(entry?.amount ?? '');
    setCategory(entry?.category ?? '');
    setOccurredOn(entry?.occurred_on ?? new Date().toISOString().slice(0, 10));
    setNote(entry?.note ?? '');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      kind,
      amount,
      category: category.trim() || null,
      occurred_on: occurredOn,
      note: note.trim() || null,
    };
    try {
      if (entry) {
        await financeActions.updateCashEntry(entry.id, body);
      } else {
        await financeActions.createCashEntry(body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal show={show} onHide={onClose} onEnter={handleEnter} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">{entry ? 'Sửa phiếu thu/chi' : 'Thêm phiếu thu/chi'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row className="g-3">
            <Col md={6}>
              <SelectInput
                id="cash-kind"
                label="Loại phiếu"
                value={kind}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setKind(e.target.value)}
                options={CASH_KIND_OPTIONS}
              />
            </Col>
            <Col md={6}>
              <TextInput
                id="cash-amount"
                label="Số tiền"
                type="number"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                required
              />
            </Col>
            <Col md={6}>
              <TextInput
                id="cash-category"
                label="Hạng mục"
                value={category}
                placeholder="Vd: Thuê mặt bằng, Marketing…"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)}
              />
            </Col>
            <Col md={6}>
              <TextInput
                id="cash-date"
                label="Ngày phát sinh"
                type="date"
                value={occurredOn}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOccurredOn(e.target.value)}
                required
              />
            </Col>
            <Col md={12}>
              <TextareaInput
                id="cash-note"
                label="Ghi chú"
                rows={2}
                value={note}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" variant="primary" loading={saving}>Lưu</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
