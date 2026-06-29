import { useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import { apiClient } from '../../../core/apiClient';
import { extractError } from '../../../core/useList';
import { formatCurrency } from '../../../core/format';
import type { UserRow } from './UserFormModal';

interface Props {
  show: boolean;
  user: UserRow | null;
  onClose: () => void;
  onSaved: () => void;
}

// Modal cộng/trừ số dư ví. amount > 0 là cộng, < 0 là trừ (theo backend).
export default function BalanceModal({ show, user, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<'add' | 'subtract'>('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleEnter() {
    setMode('add');
    setAmount('');
    setNote('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const value = Math.abs(parseFloat(amount || '0'));
      const signed = mode === 'subtract' ? -value : value;
      await apiClient.post(`/users/${user.id}/balance`, { amount: signed, note: note || null });
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
          <Modal.Title className="fs-5">Điều chỉnh số dư</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <p className="mb-3">
            Khách: <strong>{user?.name}</strong> · Số dư hiện tại:{' '}
            <strong className="text-primary">{formatCurrency(user?.balance)}</strong>
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Hình thức</Form.Label>
            <Form.Select value={mode} onChange={(e) => setMode(e.target.value as 'add' | 'subtract')}>
              <option value="add">Cộng tiền</option>
              <option value="subtract">Trừ tiền</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Số tiền</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Ghi chú</Form.Label>
            <Form.Control as="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" variant={mode === 'add' ? 'success' : 'danger'} disabled={saving}>
            {saving && <Spinner size="sm" className="me-2" />}
            Xác nhận
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
