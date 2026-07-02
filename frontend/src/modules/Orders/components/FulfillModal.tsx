import { useState, type ChangeEvent } from 'react';
import { Modal } from 'react-bootstrap';
import { Button, TextareaInput } from '../../../ui';
import { orderActions, type Order } from '../hooks/useOrders';

interface Props {
  order: Order | null;
  onClose: () => void;
  /** Gọi sau khi cập nhật thành công để refetch danh sách. */
  onDone: () => void;
}

/**
 * Modal admin duyệt đơn: nhập nội dung bàn giao rồi đánh dấu Thành công, hoặc
 * đánh dấu Thất bại (kèm lý do). Dùng cho đơn đang xử lý (guest hoặc ví).
 */
export default function FulfillModal({ order, onClose, onDone }: Props) {
  const [delivered, setDelivered] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'success' | 'failed' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDelivered('');
    setNote('');
    setBusy(null);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async (result: 'success' | 'failed') => {
    if (!order) return;
    if (result === 'success' && !delivered.trim()) {
      setError('Vui lòng nhập nội dung bàn giao cho khách.');
      return;
    }
    setBusy(result);
    setError(null);
    try {
      await orderActions.fulfill(order.id, {
        result,
        delivered_content: result === 'success' ? delivered.trim() : undefined,
        note: note.trim() || undefined,
      });
      onDone();
      handleClose();
    } catch (e) {
      const anyE = e as { response?: { data?: { message?: string } } };
      setError(anyE?.response?.data?.message || 'Không cập nhật được đơn, vui lòng thử lại.');
      setBusy(null);
    }
  };

  return (
    <Modal show={!!order} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">Duyệt đơn {order?.code}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {order && (
          <>
            <p className="text-muted small mb-3">
              Sản phẩm: <span className="fw-semibold text-body">{order.product_name}</span> · SL {order.quantity}
              {!order.user_id && order.guest_name && (
                <>
                  {' '}· Khách: <span className="fw-semibold text-body">{order.guest_name}</span>
                  {order.guest_phone ? ` (${order.guest_phone})` : order.guest_email ? ` (${order.guest_email})` : ''}
                </>
              )}
            </p>
            <TextareaInput
              label="Nội dung bàn giao (khi thành công)"
              value={delivered}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDelivered(e.target.value)}
              rows={4}
              placeholder="Tài khoản / key / hướng dẫn kích hoạt gửi cho khách…"
            />
            <TextareaInput
              label="Ghi chú (tùy chọn)"
              value={note}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
              rows={2}
              placeholder="Lý do thất bại hoặc ghi chú nội bộ…"
            />
            {error && <p className="text-danger small mb-0">{error}</p>}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="danger"
          icon="x-circle"
          disabled={!!busy}
          loading={busy === 'failed'}
          onClick={() => submit('failed')}
        >
          Đánh dấu thất bại
        </Button>
        <Button
          variant="success"
          icon="check-circle"
          disabled={!!busy}
          loading={busy === 'success'}
          onClick={() => submit('success')}
        >
          Giao thành công
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
