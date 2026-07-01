import { useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { Button, TextInput, TextareaInput, SelectInput } from '../../../ui';
import { voucherActions, type Voucher } from '../hooks/useVouchers';
import { DISCOUNT_TYPE_OPTIONS, VOUCHER_STATUS_OPTIONS } from '../config/voucherConfig';

interface Props {
  show: boolean;
  editing: Voucher | null;
  onClose: () => void;
  onSaved: () => void;
}

// Modal voucher. Khi sửa, backend không cho đổi code nên ô code bị khóa.
// Tạo mới: gõ Mô tả -> tự sinh gợi ý mã (vẫn cho sửa tay); để trống -> backend tự sinh.
export default function VoucherFormModal({ show, editing, onClose, onSaved }: Props) {
  const [code, setCode] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('amount');
  const [discountValue, setDiscountValue] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('0');
  const [usageLimit, setUsageLimit] = useState('0');
  const [endsAt, setEndsAt] = useState('');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleEnter() {
    setCode(editing?.code ?? '');
    setCodeTouched(false);
    setDescription(editing?.description ?? '');
    setDiscountType(editing?.discount_type ?? 'amount');
    setDiscountValue(editing?.discount_value ?? '0');
    setMaxDiscount(editing?.max_discount ?? '0');
    setUsageLimit(editing ? String(editing.usage_limit) : '0');
    setEndsAt(editing?.ends_at ? editing.ends_at.slice(0, 16) : '');
    setStatus(editing?.status ?? 'active');
    setError(null);
  }

  // Sinh gợi ý mã từ mô tả: bỏ dấu/ký tự lạ, viết hoa, gộp khoảng trắng thành "-".
  function slugifyCode(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '-')
      .slice(0, 12);
  }

  // Gõ mô tả -> cập nhật gợi ý mã nếu người dùng chưa tự sửa code (chỉ khi tạo mới).
  function handleDescriptionChange(value: string) {
    setDescription(value);
    if (!editing && !codeTouched) {
      setCode(slugifyCode(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        description: description || null,
        discount_type: discountType,
        discount_value: parseFloat(discountValue || '0'),
        max_discount: parseFloat(maxDiscount || '0'),
        usage_limit: Number(usageLimit || '0'),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        status,
      };
      if (editing) {
        await voucherActions.update(editing.id, body);
      } else {
        body.code = code || null; // để trống -> backend tự sinh mã
        await voucherActions.create(body);
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
          <Modal.Title className="fs-5">{editing ? 'Cập nhật' : 'Thêm'} voucher</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row className="g-3">
            <Col md={6}>
              <TextInput
                id="vch-code"
                label="Mã voucher"
                disabled={!!editing}
                value={code}
                help={editing ? undefined : 'Bỏ trống = tự sinh từ mô tả'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setCodeTouched(true);
                  setCode(e.target.value.toUpperCase());
                }}
              />
            </Col>
            <Col md={6}>
              <SelectInput id="vch-type" label="Loại giảm" value={discountType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDiscountType(e.target.value)}
                options={DISCOUNT_TYPE_OPTIONS} />
            </Col>
            <Col md={6}>
              <TextInput
                id="vch-value"
                label={`Giá trị giảm ${discountType === 'percent' ? '(%)' : '(₫)'}`}
                type="number"
                min="0"
                value={discountValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiscountValue(e.target.value)}
              />
            </Col>
            <Col md={6}>
              <TextInput id="vch-max" label="Giảm tối đa (₫)" type="number" min="0" help="0 = không giới hạn"
                value={maxDiscount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxDiscount(e.target.value)} />
            </Col>
            <Col md={6}>
              <TextInput id="vch-limit" label="Giới hạn lượt dùng" type="number" min="0" help="0 = không giới hạn"
                value={usageLimit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsageLimit(e.target.value)} />
            </Col>
            <Col md={6}>
              <TextInput id="vch-ends" label="Hết hạn" type="datetime-local" value={endsAt}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndsAt(e.target.value)} />
            </Col>
            <Col md={12}>
              <TextareaInput id="vch-desc" label="Mô tả" rows={1} value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleDescriptionChange(e.target.value)} />
            </Col>
            <Col md={12}>
              <SelectInput id="vch-status" label="Trạng thái" value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                options={VOUCHER_STATUS_OPTIONS} />
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
