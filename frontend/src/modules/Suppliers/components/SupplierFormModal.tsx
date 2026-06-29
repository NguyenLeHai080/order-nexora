import { useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { Button, TextInput, TextareaInput, SelectInput } from '../../../ui';
import { supplierActions, type Supplier } from '../hooks/useSuppliers';
import { SUPPLIER_STATUS_OPTIONS } from '../config/supplierConfig';

interface Props {
  show: boolean;
  editing: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}

// Modal tạo/sửa nhà cung cấp. api_key chỉ gửi khi nhập (backend không trả lại key).
export default function SupplierFormModal({ show, editing, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleEnter() {
    setName(editing?.name ?? '');
    setEndpoint(editing?.api_endpoint ?? '');
    setApiKey('');
    setNote(editing?.note ?? '');
    setStatus(editing?.status ?? 'active');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name,
        api_endpoint: endpoint || null,
        note: note || null,
        status,
      };
      if (apiKey) body.api_key = apiKey;
      if (editing) await supplierActions.update(editing.id, body);
      else await supplierActions.create(body);
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
          <Modal.Title className="fs-5">{editing ? 'Cập nhật' : 'Thêm'} nhà cung cấp</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row className="g-3">
            <Col md={12}>
              <TextInput id="sup-name" label="Tên" required value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
            </Col>
            <Col md={12}>
              <TextInput id="sup-endpoint" label="API Endpoint" placeholder="https://..." value={endpoint}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndpoint(e.target.value)} />
            </Col>
            <Col md={12}>
              <TextInput
                id="sup-apikey"
                label="API Key"
                help={editing ? 'Để trống nếu không đổi' : undefined}
                value={apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
              />
            </Col>
            <Col md={8}>
              <TextareaInput id="sup-note" label="Ghi chú" rows={1} value={note}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)} />
            </Col>
            <Col md={4}>
              <SelectInput id="sup-status" label="Trạng thái" value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                options={SUPPLIER_STATUS_OPTIONS} />
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
