import { useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { Button, TextInput, TextareaInput } from '../../../ui';
import { financeActions } from '../hooks/useFinance';

interface Props {
  show: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Modal admin tạo yêu cầu rút tiền hộ một user (khóa số dư của user đó).
export default function WithdrawalCreateModal({ show, onClose, onSaved }: Props) {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [bankInfo, setBankInfo] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleEnter() {
    setUserId('');
    setAmount('');
    setBankInfo('');
    setNote('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await financeActions.createWithdrawal({
        user_id: userId ? Number(userId) : undefined,
        amount,
        bank_info: bankInfo.trim() || null,
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
    <Modal show={show} onHide={onClose} onEnter={handleEnter} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Tạo yêu cầu rút tiền</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row className="g-3">
            <Col md={6}>
              <TextInput
                id="wd-user"
                label="User ID"
                type="number"
                value={userId}
                placeholder="ID người rút"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserId(e.target.value)}
                required
              />
            </Col>
            <Col md={6}>
              <TextInput
                id="wd-amount"
                label="Số tiền"
                type="number"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                required
              />
            </Col>
            <Col md={12}>
              <TextInput
                id="wd-bank"
                label="Thông tin ngân hàng"
                value={bankInfo}
                placeholder="Vd: VCB 0123456789 - NGUYEN VAN A"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBankInfo(e.target.value)}
              />
            </Col>
            <Col md={12}>
              <TextareaInput
                id="wd-note"
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
          <Button type="submit" variant="primary" loading={saving}>Tạo yêu cầu</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
