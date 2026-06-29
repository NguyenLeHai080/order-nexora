import { useState } from 'react';
import { Form, Modal } from 'react-bootstrap';
import { apiClient } from '../../../core/apiClient';
import { extractError } from '../../../core/useList';
import { Button, SelectInput, TextInput, TextareaInput } from '../../../ui';
import { inventoryActions, type StockRow } from '../hooks/useInventory';

interface Props {
  show: boolean;
  mode: 'in' | 'adjust';
  presetProductId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

// Modal nhập kho / điều chỉnh tồn. Chỉ liệt kê sản phẩm tự quản kho (kho riêng).
export default function StockMovementModal({ show, mode, presetProductId, onClose, onSaved }: Props) {
  const [products, setProducts] = useState<StockRow[]>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleEnter() {
    setProductId(presetProductId ? String(presetProductId) : '');
    setQuantity(mode === 'in' ? '1' : '0');
    setReason('');
    setNote('');
    setError(null);
    // Chỉ lấy sản phẩm kho riêng (manages_local) — không cho chọn SP do NCC quản lý tồn.
    apiClient
      .get('/inventory/stock', { params: { limit: 100 } })
      .then((r) => setProducts((r.data.data ?? []).filter((p: StockRow) => p.manages_local)))
      .catch(() => {});
  }

  const current = products.find((p) => String(p.product_id) === productId);
  const productOptions = [
    { value: '', label: '— Chọn sản phẩm —' },
    ...products.map((p) => ({ value: String(p.product_id), label: `${p.name} (tồn: ${p.local_quantity})` })),
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) {
      setError('Vui lòng chọn sản phẩm.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const qty = parseInt(quantity || '0', 10);
      if (mode === 'in') {
        await inventoryActions.stockIn({ product_id: Number(productId), quantity: qty, reason, note });
      } else {
        await inventoryActions.adjust({ product_id: Number(productId), quantity_delta: qty, reason, note });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  const title = mode === 'in' ? 'Nhập kho' : 'Điều chỉnh tồn kho';

  return (
    <Modal show={show} onHide={onClose} onEnter={handleEnter} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <SelectInput
            id="mv-product"
            label="Sản phẩm"
            value={productId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProductId(e.target.value)}
            options={productOptions}
          />
          <TextInput
            id="mv-qty"
            label={mode === 'in' ? 'Số lượng nhập' : 'Thay đổi (âm = giảm, dương = tăng)'}
            type="number"
            value={quantity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)}
          />
          {current && mode === 'adjust' && (
            <small className="text-muted d-block mb-2">
              Tồn hiện tại: {current.local_quantity} → sau điều chỉnh: {current.local_quantity + parseInt(quantity || '0', 10)}
            </small>
          )}
          <TextInput
            id="mv-reason"
            label="Lý do"
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
          />
          <TextareaInput
            id="mv-note"
            label="Ghi chú"
            value={note}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" variant="primary" loading={saving}>Lưu</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
