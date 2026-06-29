import { useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { Button, TextInput, TextareaInput, SelectInput } from '../../../ui';
import { orgActions, type Org } from '../hooks/useOrganizations';
import { ORG_STATUS_OPTIONS } from '../config/organizationConfig';

interface Props {
  show: boolean;
  editing: Org | null;
  options: Org[];
  onClose: () => void;
  onSaved: () => void;
}

// Modal tạo/sửa tổ chức. parent_id chọn từ danh sách hiện có (không chọn chính nó).
export default function OrgFormModal({ show, editing, options, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleEnter() {
    setName(editing?.name ?? '');
    setSlug(editing?.slug ?? '');
    setDescription(editing?.description ?? '');
    setParentId(editing?.parent_id ? String(editing.parent_id) : '');
    setSortOrder(editing ? String(editing.sort_order) : '0');
    setStatus(editing?.status ?? 'active');
    setError(null);
  }

  const parentOptions = [
    { value: '', label: '— Cấp gốc —' },
    ...options.filter((o) => o.id !== editing?.id).map((o) => ({ value: String(o.id), label: o.name })),
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name,
        slug: slug || null,
        description: description || null,
        parent_id: parentId ? Number(parentId) : null,
        sort_order: Number(sortOrder || '0'),
        status,
      };
      if (editing) await orgActions.update(editing.id, body);
      else await orgActions.create(body);
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
          <Modal.Title className="fs-5">{editing ? 'Cập nhật' : 'Thêm'} tổ chức</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row className="g-3">
            <Col md={6}>
              <TextInput id="org-name" label="Tên tổ chức" required value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
            </Col>
            <Col md={6}>
              <TextInput id="org-slug" label="Slug" help="Tự sinh nếu trống" value={slug}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlug(e.target.value)} />
            </Col>
            <Col md={8}>
              <SelectInput id="org-parent" label="Tổ chức cha" value={parentId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setParentId(e.target.value)}
                options={parentOptions} />
            </Col>
            <Col md={4}>
              <TextInput id="org-sort" label="Thứ tự" type="number" value={sortOrder}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSortOrder(e.target.value)} />
            </Col>
            <Col md={12}>
              <TextareaInput id="org-desc" label="Mô tả" rows={2} value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} />
            </Col>
            <Col md={12}>
              <SelectInput id="org-status" label="Trạng thái" value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                options={ORG_STATUS_OPTIONS} />
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
