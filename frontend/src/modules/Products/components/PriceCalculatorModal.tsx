import { useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { formatCurrency } from '../../../core/format';
import { Button, TextInput } from '../../../ui';
import { productActions, type Product } from '../hooks/useProducts';
import {
  computeSalePrice,
  computeUnitProfit,
  computeMargin,
  percentFromTargetPrice,
  listPrice,
} from '../helpers/pricing';

interface Props {
  show: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Modal tính giá bán từ giá nhà cung cấp.
 * Admin thấy giá vốn (base_price = giá NCC), nhập % markup (+ cố định) để ra giá
 * bán; hoặc nhập thẳng giá bán mong muốn để suy ngược ra %. Hiển thị lợi nhuận/đơn
 * và biên lợi nhuận realtime, lưu lại vào sản phẩm.
 */
export default function PriceCalculatorModal({ show, product, onClose, onSaved }: Props) {
  const [markupPercent, setMarkupPercent] = useState('0');
  const [markupAmount, setMarkupAmount] = useState('0');
  const [targetPrice, setTargetPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const basePrice = product?.base_price ?? '0';
  const regularPrice = product?.regular_price ?? null;

  function handleEnter() {
    setMarkupPercent(product?.markup_percent ?? '0');
    setMarkupAmount(product?.markup_amount ?? '0');
    setTargetPrice('');
    setError(null);
  }

  const sale = computeSalePrice(basePrice, regularPrice, markupPercent, markupAmount);
  const profit = computeUnitProfit(basePrice, regularPrice, markupPercent, markupAmount);
  const margin = computeMargin(basePrice, regularPrice, markupPercent, markupAmount);

  // Nhập giá bán mong muốn -> suy ngược % (đặt cố định về 0 cho gọn).
  function applyTargetPrice() {
    const pct = percentFromTargetPrice(basePrice, regularPrice, targetPrice);
    setMarkupPercent(pct.toFixed(2));
    setMarkupAmount('0');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      await productActions.update(product.id, {
        markup_percent: parseFloat(markupPercent || '0'),
        markup_amount: parseFloat(markupAmount || '0'),
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
    <Modal show={show} onHide={onClose} onEnter={handleEnter} centered size="lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">
            <i className="bi bi-calculator me-2" />
            Tính giá bán — {product?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}

          {/* Giá nhà cung cấp (chỉ đọc) */}
          <div className="alert alert-secondary d-flex justify-content-between align-items-center mb-2">
            <span>
              <i className="bi bi-truck me-2" />
              Giá nhập NCC (giá vốn / CTV)
            </span>
            <strong className="fs-5">{formatCurrency(basePrice)}</strong>
          </div>

          {/* Giá niêm yết NCC (gốc tính giá bán) */}
          <div className="alert alert-light border d-flex justify-content-between align-items-center">
            <span>
              <i className="bi bi-tag me-2" />
              Giá niêm yết NCC (gốc tính giá bán)
            </span>
            <strong className="fs-5">{formatCurrency(listPrice(basePrice, regularPrice))}</strong>
          </div>

          <Row className="g-3">
            <Col md={6}>
              <TextInput
                id="calc-percent"
                label="Markup %"
                type="number"
                min="0"
                step="0.1"
                value={markupPercent}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMarkupPercent(e.target.value)}
              />
            </Col>
            <Col md={6}>
              <TextInput
                id="calc-amount"
                label="Markup cố định (₫)"
                type="number"
                min="0"
                value={markupAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMarkupAmount(e.target.value)}
              />
            </Col>
          </Row>

          {/* Nhập ngược: giá bán mong muốn -> tính % */}
          <Row className="g-2 align-items-end mt-1">
            <Col md={8}>
              <TextInput
                id="calc-target"
                label="Hoặc nhập giá bán mong muốn để tính ngược %"
                type="number"
                min="0"
                value={targetPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetPrice(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Button variant="light" className="w-100" onClick={applyTargetPrice} disabled={!targetPrice}>
                <i className="bi bi-arrow-left-right me-1" />
                Suy ra %
              </Button>
            </Col>
          </Row>

          {/* Kết quả realtime */}
          <Row className="g-3 mt-2">
            <Col md={4}>
              <div className="border rounded p-3 text-center h-100">
                <div className="text-muted small mb-1">Giá bán</div>
                <div className="fs-5 fw-semibold text-primary">{formatCurrency(sale)}</div>
              </div>
            </Col>
            <Col md={4}>
              <div className="border rounded p-3 text-center h-100">
                <div className="text-muted small mb-1">Lợi nhuận / đơn</div>
                <div className={`fs-5 fw-semibold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(profit)}
                </div>
              </div>
            </Col>
            <Col md={4}>
              <div className="border rounded p-3 text-center h-100">
                <div className="text-muted small mb-1">Biên lợi nhuận</div>
                <div className={`fs-5 fw-semibold ${margin >= 0 ? 'text-success' : 'text-danger'}`}>
                  {margin.toFixed(1)}%
                </div>
              </div>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Lưu giá
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
