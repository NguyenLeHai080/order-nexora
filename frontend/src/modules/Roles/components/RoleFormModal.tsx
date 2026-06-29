import { useEffect, useState } from 'react';
import { Col, Form, Modal, Row } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { Button, TextInput, TextareaInput } from '../../../ui';
import { saveRole, type Permission, type Role } from '../hooks/useRoles';
import { actionLabel, groupPermissions } from '../helpers/permissionGroups';

interface Props {
  show: boolean;
  editing: Role | null;
  permissions: Permission[];
  onClose: () => void;
  onSaved: () => void;
}

// Modal tạo/sửa vai trò kèm ma trận tick quyền theo từng nhóm subject.
export default function RoleFormModal({ show, editing, permissions, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permIds, setPermIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const groups = groupPermissions(permissions);

  useEffect(() => {
    if (!show) return;
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setPermIds(new Set(editing?.permission_ids ?? []));
    setError(null);
  }, [show, editing]);

  function toggle(id: number) {
    setPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(ids: number[], checked: boolean) {
    setPermIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveRole(editing, {
        name,
        description: description || null,
        permission_ids: Array.from(permIds),
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
    <Modal show={show} onHide={onClose} size="lg" centered scrollable>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">{editing ? 'Cập nhật' : 'Thêm'} vai trò</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row className="g-3 mb-3">
            <Col md={6}>
              <TextInput id="role-name" label="Tên vai trò" required value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
            </Col>
            <Col md={6}>
              <TextareaInput id="role-desc" label="Mô tả" rows={1} value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} />
            </Col>
          </Row>

          <div className="fw-semibold mb-2">Phân quyền</div>
          <div className="border rounded">
            {groups.map((g) => {
              const ids = g.permissions.map((p) => p.id);
              const allChecked = ids.every((id) => permIds.has(id));
              return (
                <div key={g.subject} className="border-bottom p-2">
                  <Form.Check
                    type="checkbox"
                    id={`grp-${g.subject}`}
                    className="fw-semibold text-capitalize mb-2"
                    label={g.subject}
                    checked={allChecked}
                    onChange={(e) => toggleGroup(ids, e.target.checked)}
                  />
                  <div className="d-flex flex-wrap gap-3 ps-3">
                    {g.permissions.map((p) => (
                      <Form.Check
                        key={p.id}
                        type="checkbox"
                        id={`perm-${p.id}`}
                        label={actionLabel(p.name)}
                        checked={permIds.has(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
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
