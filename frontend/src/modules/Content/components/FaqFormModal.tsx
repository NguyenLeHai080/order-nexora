import { useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { Button, Checkbox, SelectInput, TextInput, TextareaInput } from '../../../ui';
import { faqActions, type Faq } from '../hooks/useContent';
import { CONTENT_STATUS_OPTIONS } from '../config/contentConfig';

interface Props {
  show: boolean;
  editing: Faq | null;
  onClose: () => void;
  onSaved: () => void;
}

// Modal tạo/sửa câu hỏi thường gặp (FAQ).
export default function FaqFormModal({ show, editing, onClose, onSaved }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [status, setStatus] = useState('active');
  const [showOnLanding, setShowOnLanding] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleEnter() {
    setQuestion(editing?.question ?? '');
    setAnswer(editing?.answer ?? '');
    setSortOrder(editing != null ? String(editing.sort_order) : '0');
    setStatus(editing?.status ?? 'active');
    setShowOnLanding(editing?.show_on_landing ?? true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        question,
        answer,
        sort_order: parseInt(sortOrder || '0', 10),
        status,
        show_on_landing: showOnLanding,
      };
      if (editing) {
        await faqActions.update(editing.id, body);
      } else {
        await faqActions.create(body);
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
          <Modal.Title className="fs-5">{editing ? 'Cập nhật' : 'Thêm'} câu hỏi</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row className="g-3">
            <Col md={12}>
              <TextInput id="faq-q" label="Câu hỏi" required value={question}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuestion(e.target.value)} />
            </Col>
            <Col md={12}>
              <TextareaInput id="faq-a" label="Câu trả lời" rows={4} value={answer}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnswer(e.target.value)} />
            </Col>
            <Col md={6}>
              <TextInput id="faq-sort" label="Thứ tự" type="number" value={sortOrder}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSortOrder(e.target.value)}
                help="Nhỏ hơn lên trước" />
            </Col>
            <Col md={6}>
              <SelectInput id="faq-status" label="Trạng thái" value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                options={CONTENT_STATUS_OPTIONS} />
            </Col>
            <Col md={12}>
              <Checkbox type="switch" id="faq-landing" label="Hiển thị trên landing"
                checked={showOnLanding}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowOnLanding(e.target.checked)} />
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
