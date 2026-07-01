import { useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { Button, TextInput, TextareaInput, SelectInput } from '../../../ui';
import { categoryActions, type Category } from '../hooks/useCategories';
import { CATEGORY_STATUS_OPTIONS } from '../config/categoryConfig';

interface Props {
  show: boolean;
  editing: Category | null;
  onClose: () => void;
  onSaved: () => void;
}

// Modal tạo/sửa danh mục. Slug để trống -> backend tự sinh từ tên.
export default function CategoryFormModal({ show, editing, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleEnter() {
    setName(editing?.name ?? '');
    setSlug(editing?.slug ?? '');
    setDescription(editing?.description ?? '');
    setSortOrder(editing != null ? String(editing.sort_order) : '0');
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
        slug: slug || null,
        description: description || null,
        sort_order: parseInt(sortOrder || '0', 10),
        status,
      };
      if (editing) {
        await categoryActions.update(editing.id, body);
      } else {
        await categoryActions.create(body);
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
          <Modal.Title className="fs-5">{editing ? 'Cập nhật' : 'Thêm'} danh mục</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row className="g-3">
            <Col md={8}>
              <TextInput id="cat-name" label="Tên danh mục" required value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
            </Col>
            <Col md={4}>
              <TextInput id="cat-sort" label="Thứ tự" type="number" value={sortOrder}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSortOrder(e.target.value)}
                help="Nhỏ hơn lên trước" />
            </Col>
            <Col md={12}>
              <TextInput id="cat-slug" label="Slug" value={slug}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlug(e.target.value)}
                help="Bỏ trống = tự sinh từ tên" />
            </Col>
            <Col md={12}>
              <TextareaInput id="cat-desc" label="Mô tả" rows={2} value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} />
            </Col>
            <Col md={12}>
              <SelectInput id="cat-status" label="Trạng thái" value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                options={CATEGORY_STATUS_OPTIONS} />
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
