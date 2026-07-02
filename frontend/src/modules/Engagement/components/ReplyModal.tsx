import { useState } from 'react';
import { Form, Modal } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { Button, TextareaInput } from '../../../ui';
import { engagementActions, type Engagement } from '../hooks/useEngagements';

interface Props {
  engagement: Engagement | null;
  onClose: () => void;
  onSaved: () => void;
}

// Modal trả lời / cảm ơn một tương tác của khách.
export default function ReplyModal({ engagement, onClose, onSaved }: Props) {
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleEnter() {
    setReply(engagement?.admin_reply ?? '');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!engagement) return;
    setSaving(true);
    setError(null);
    try {
      await engagementActions.reply(engagement.id, reply);
      onSaved();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal show={!!engagement} onHide={onClose} onEnter={handleEnter} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Trả lời / cảm ơn</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          {engagement && (
            <div className="mb-3 p-3 bg-light rounded">
              <div className="fw-semibold">{engagement.author_name}</div>
              <div className="text-muted small">{engagement.content}</div>
            </div>
          )}
          <TextareaInput
            id="eng-reply"
            label="Nội dung phản hồi"
            rows={4}
            value={reply}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReply(e.target.value)}
            help="Hiển thị công khai dưới tương tác của khách"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" variant="primary" loading={saving}>Gửi phản hồi</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
