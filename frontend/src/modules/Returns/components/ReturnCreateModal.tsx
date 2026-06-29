import { useState } from 'react';
import { Form, Modal } from 'react-bootstrap';
import { apiClient } from '../../../core/apiClient';
import { extractError } from '../../../core/useList';
import { Button, SelectInput, TextareaInput } from '../../../ui';
import { returnActions } from '../hooks/useReturns';
import { RETURN_KIND_OPTIONS } from '../config/returnConfig';

interface OrderOpt {
  id: number;
  code: string;
  product_name: string;
  status: string;
}

interface ProductOpt {
  id: number;
  name: string;
}

interface Props {
  show: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Modal tạo yêu cầu đổi/trả: chọn đơn (success) + loại + lý do + sản phẩm thay thế (nếu đổi).
export default function ReturnCreateModal({ show, onClose, onSaved }: Props) {
  const [orders, setOrders] = useState<OrderOpt[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [orderId, setOrderId] = useState('');
  const [kind, setKind] = useState('return');
  const [reason, setReason] = useState('');
  const [exchangeProductId, setExchangeProductId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleEnter() {
    setOrderId('');
    setKind('return');
    setReason('');
    setExchangeProductId('');
    setError(null);
    // Đơn đã hoàn tất của tôi mới được đổi/trả.
    apiClient
      .get('/orders/me', { params: { limit: 100, status: 'success' } })
      .then((r) => setOrders(r.data.data ?? []))
      .catch(() => {});
    apiClient
      .get('/products', { params: { limit: 100 } })
      .then((r) => setProducts(r.data.data ?? []))
      .catch(() => {});
  }

  const orderOptions = [
    { value: '', label: '— Chọn đơn hàng —' },
    ...orders.map((o) => ({ value: String(o.id), label: `${o.code} — ${o.product_name}` })),
  ];
  const productOptions = [
    { value: '', label: '— Chọn sản phẩm thay thế —' },
    ...products.map((p) => ({ value: String(p.id), label: p.name })),
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) {
      setError('Vui lòng chọn đơn hàng.');
      return;
    }
    if (kind === 'exchange' && !exchangeProductId) {
      setError('Đổi hàng cần chọn sản phẩm thay thế.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await returnActions.create({
        order_id: Number(orderId),
        kind,
        reason,
        exchange_product_id: kind === 'exchange' ? Number(exchangeProductId) : null,
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
          <Modal.Title className="fs-5">Tạo yêu cầu đổi/trả</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <SelectInput
            id="rt-order"
            label="Đơn hàng"
            value={orderId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOrderId(e.target.value)}
            options={orderOptions}
          />
          <SelectInput
            id="rt-kind"
            label="Loại yêu cầu"
            value={kind}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setKind(e.target.value)}
            options={RETURN_KIND_OPTIONS}
          />
          {kind === 'exchange' && (
            <SelectInput
              id="rt-exchange"
              label="Sản phẩm thay thế"
              value={exchangeProductId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExchangeProductId(e.target.value)}
              options={productOptions}
            />
          )}
          <TextareaInput
            id="rt-reason"
            label="Lý do"
            rows={3}
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" variant="primary" loading={saving}>Gửi yêu cầu</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
