import { useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { formatCurrency } from '../../../core/format';
import { Button, TextInput, SelectInput } from '../../../ui';
import { productActions, type Product } from '../hooks/useProducts';
import { PRODUCT_STATUS_OPTIONS, STOCK_STATUS_OPTIONS } from '../config/productConfig';
import { computeSalePrice, computeUnitProfit, computeMargin } from '../helpers/pricing';

export interface SupplierOpt {
  id: number;
  name: string;
}

interface Props {
  show: boolean;
  editing: Product | null;
  suppliers: SupplierOpt[];
  onClose: () => void;
  onSaved: () => void;
}

// Modal tạo/sửa sản phẩm. Hiển thị giá bán tính realtime theo công thức pricing.
export default function ProductFormModal({ show, editing, suppliers, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('0');
  const [markupPercent, setMarkupPercent] = useState('0');
  const [markupAmount, setMarkupAmount] = useState('0');
  const [supplierId, setSupplierId] = useState('');
  const [stockStatus, setStockStatus] = useState('in_stock');
  const [warrantyDays, setWarrantyDays] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('0');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleEnter() {
    setName(editing?.name ?? '');
    setBasePrice(editing?.base_price ?? '0');
    setMarkupPercent(editing?.markup_percent ?? '0');
    setMarkupAmount(editing?.markup_amount ?? '0');
    setSupplierId(editing?.supplier_id ? String(editing.supplier_id) : '');
    setStockStatus(editing?.stock_status ?? 'in_stock');
    setWarrantyDays(editing?.warranty_days != null ? String(editing.warranty_days) : '0');
    setLowStockThreshold(editing?.low_stock_threshold != null ? String(editing.low_stock_threshold) : '0');
    setStatus(editing?.status ?? 'active');
    setError(null);
  }

  const salePreview = computeSalePrice(basePrice, markupPercent, markupAmount);
  const profitPreview = computeUnitProfit(basePrice, markupPercent, markupAmount);
  const marginPreview = computeMargin(basePrice, markupPercent, markupAmount);
  const atLoss = profitPreview < 0;
  const breakEven = profitPreview === 0 && parseFloat(basePrice || '0') > 0;

  const supplierOptions = [
    { value: '', label: '— Không —' },
    ...suppliers.map((s) => ({ value: String(s.id), label: s.name })),
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name,
        base_price: parseFloat(basePrice || '0'),
        markup_percent: parseFloat(markupPercent || '0'),
        markup_amount: parseFloat(markupAmount || '0'),
        supplier_id: supplierId ? Number(supplierId) : null,
        warranty_days: parseInt(warrantyDays || '0', 10),
        low_stock_threshold: parseInt(lowStockThreshold || '0', 10),
        status,
      };
      if (editing) {
        body.stock_status = stockStatus;
        await productActions.update(editing.id, body);
      } else {
        await productActions.create(body);
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
    <Modal show={show} onHide={onClose} onEnter={handleEnter} centered size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">{editing ? 'Cập nhật' : 'Thêm'} sản phẩm</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row className="g-3">
            <Col md={8}>
              <TextInput id="prod-name" label="Tên sản phẩm" required value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
            </Col>
            <Col md={4}>
              <SelectInput id="prod-supplier" label="Nhà cung cấp" value={supplierId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSupplierId(e.target.value)}
                options={supplierOptions} />
            </Col>
            <Col md={4}>
              <TextInput id="prod-base" label="Giá gốc (kho)" type="number" min="0" value={basePrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBasePrice(e.target.value)} />
            </Col>
            <Col md={4}>
              <TextInput id="prod-percent" label="Markup %" type="number" min="0" step="0.1" value={markupPercent}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMarkupPercent(e.target.value)} />
            </Col>
            <Col md={4}>
              <TextInput id="prod-amount" label="Markup cố định" type="number" min="0" value={markupAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMarkupAmount(e.target.value)} />
            </Col>
            <Col md={4}>
              <TextInput id="prod-warranty" label="Bảo hành (ngày)" type="number" min="0" value={warrantyDays}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWarrantyDays(e.target.value)}
                help="0 = không tạo phiếu bảo hành" />
            </Col>
            <Col md={4}>
              <TextInput id="prod-lowstock" label="Ngưỡng cảnh báo sắp hết" type="number" min="0" value={lowStockThreshold}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLowStockThreshold(e.target.value)}
                help="0 = không cảnh báo (chỉ áp cho sản phẩm kho riêng)" />
            </Col>
            {editing && (
              <Col md={4}>
                <SelectInput id="prod-stock" label="Trạng thái kho" value={stockStatus}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStockStatus(e.target.value)}
                  options={STOCK_STATUS_OPTIONS} />
              </Col>
            )}
            <Col md={4}>
              <SelectInput id="prod-status" label="Trạng thái" value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                options={PRODUCT_STATUS_OPTIONS} />
            </Col>
          </Row>
          <div className={`alert mt-3 mb-0 d-flex justify-content-between align-items-center ${atLoss ? 'alert-danger' : breakEven ? 'alert-warning' : 'alert-info'}`}>
            <span>
              <i className="bi bi-calculator me-2" />
              Giá bán = Giá gốc × (1 + %/100) + cố định
              {atLoss ? (
                <small className="d-block mt-1 fw-semibold">
                  <i className="bi bi-exclamation-triangle-fill me-1" />
                  Cảnh báo: giá bán thấp hơn giá NCC — đang bán lỗ {formatCurrency(profitPreview)}.
                </small>
              ) : breakEven ? (
                <small className="d-block mt-1 fw-semibold">
                  <i className="bi bi-exclamation-circle me-1" />
                  Hòa vốn: chưa cộng lợi nhuận. Hãy đặt Markup % hoặc cố định.
                </small>
              ) : (
                <small className="d-block mt-1 text-muted">
                  Lợi nhuận/đơn: {formatCurrency(profitPreview)} (biên {marginPreview.toFixed(1)}%)
                </small>
              )}
            </span>
            <strong className="fs-5">{formatCurrency(salePreview)}</strong>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" variant="primary" loading={saving}>Lưu</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
