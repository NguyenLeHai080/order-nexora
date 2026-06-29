import { useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { resolveAsset } from '../../../core/format';
import { useUpload } from '../../../core/useUpload';
import { Button, TextInput, SelectInput } from '../../../ui';
import { paymentActions, type Bank } from '../hooks/usePayments';
import { BANK_STATUS_OPTIONS } from '../config/paymentConfig';
import { VN_BANKS } from '../config/banks';

interface Props {
  show: boolean;
  editing: Bank | null;
  onClose: () => void;
  onSaved: () => void;
}

// Modal tạo/sửa tài khoản ngân hàng. Upload ảnh QR qua API, lưu URL trả về.
export default function BankFormModal({ show, editing, onClose, onSaved }: Props) {
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { upload, uploading, error: uploadError } = useUpload();

  const bankOptions = [
    { value: '', label: '-- Chọn ngân hàng --' },
    ...VN_BANKS.map((b) => ({ value: b.shortName, label: `${b.shortName} — ${b.fullName}` })),
  ];

  function handleEnter() {
    setBankName(editing?.bank_name ?? '');
    setAccountNumber(editing?.account_number ?? '');
    setAccountHolder(editing?.account_holder ?? '');
    setQrUrl(editing?.qr_image_url ?? '');
    setStatus(editing?.status ?? 'active');
    setError(null);
  }

  async function handleQrFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file);
    if (url) setQrUrl(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!VN_BANKS.some((b) => b.shortName === bankName)) {
      setError('Vui lòng chọn ngân hàng hợp lệ trong danh sách.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = { bank_name: bankName, account_number: accountNumber, account_holder: accountHolder, qr_image_url: qrUrl || null, status };
      if (editing) await paymentActions.updateBank(editing.id, body);
      else await paymentActions.createBank(body);
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
          <Modal.Title className="fs-5">{editing ? 'Cập nhật' : 'Thêm'} ngân hàng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row className="g-3">
            <Col md={6}>
              <SelectInput id="bank-name" label="Tên ngân hàng" required value={bankName}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBankName(e.target.value)}
                options={bankOptions} />
            </Col>
            <Col md={6}>
              <TextInput id="bank-acct" label="Số tài khoản" required value={accountNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccountNumber(e.target.value)} />
            </Col>
            <Col md={12}>
              <TextInput id="bank-holder" label="Chủ tài khoản" required value={accountHolder}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccountHolder(e.target.value)} />
            </Col>
            <Col md={12}>
              <Form.Label className="form-label">Ảnh QR</Form.Label>
              <Form.Control type="file" accept="image/*" onChange={handleQrFile} disabled={uploading} />
              {uploading && <small className="text-muted d-block mt-1"><i className="bi bi-hourglass-split me-1" />Đang tải ảnh...</small>}
              {uploadError && <small className="text-danger d-block mt-1">{uploadError}</small>}
              {qrUrl && <div className="mt-2"><img src={resolveAsset(qrUrl)} alt="QR" style={{ maxHeight: 120 }} className="border rounded" /></div>}
            </Col>
            <Col md={12}>
              <SelectInput id="bank-status" label="Trạng thái" value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                options={BANK_STATUS_OPTIONS} />
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
