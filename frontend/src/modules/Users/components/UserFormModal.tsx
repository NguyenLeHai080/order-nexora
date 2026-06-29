import { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { apiClient } from '../../../core/apiClient';
import { extractError } from '../../../core/useList';

export interface UserRow {
  id: number;
  name: string;
  user_name: string | null;
  email: string;
  status: string;
  balance: string;
  role_ids?: number[];
  roles?: string[];
}

interface RoleOption {
  id: number;
  name: string;
}

interface Props {
  show: boolean;
  editing: UserRow | null;
  onClose: () => void;
  onSaved: () => void;
}

// Modal tạo/sửa người dùng. Khi sửa, mật khẩu để trống nghĩa là không đổi.
export default function UserFormModal({ show, editing, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('active');
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Nạp danh sách vai trò một lần để tick chọn.
  useEffect(() => {
    apiClient
      .get('/roles')
      .then((r) => setRoleOptions(r.data.data ?? []))
      .catch(() => setRoleOptions([]));
  }, []);

  // Đồng bộ form khi mở modal.
  function handleEnter() {
    setName(editing?.name ?? '');
    setEmail(editing?.email ?? '');
    setUserName(editing?.user_name ?? '');
    setPassword('');
    setStatus(editing?.status ?? 'active');
    setRoleIds(editing?.role_ids ?? []);
    setError(null);
  }

  function toggleRole(id: number) {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          name,
          email,
          user_name: userName || null,
          status,
          role_ids: roleIds,
        };
        if (password) body.password = password;
        await apiClient.put(`/users/${editing.id}`, body);
      } else {
        await apiClient.post('/users', {
          name,
          email,
          user_name: userName || null,
          password,
          status,
          role_ids: roleIds,
        });
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
          <Modal.Title className="fs-5">
            {editing ? 'Cập nhật người dùng' : 'Thêm người dùng'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Họ tên</Form.Label>
              <Form.Control value={name} onChange={(e) => setName(e.target.value)} required />
            </Col>
            <Col md={6}>
              <Form.Label>Tên đăng nhập</Form.Label>
              <Form.Control value={userName} onChange={(e) => setUserName(e.target.value)} />
            </Col>
            <Col md={6}>
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Col>
            <Col md={6}>
              <Form.Label>Trạng thái</Form.Label>
              <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Hoạt động</option>
                <option value="locked">Đã khóa</option>
              </Form.Select>
            </Col>
            <Col md={12}>
              <Form.Label>
                Mật khẩu {editing && <small className="text-muted">(để trống nếu không đổi)</small>}
              </Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!editing}
                minLength={6}
              />
            </Col>
            <Col md={12}>
              <Form.Label>Vai trò</Form.Label>
              {roleOptions.length === 0 ? (
                <div className="text-muted small">Chưa có vai trò nào.</div>
              ) : (
                <div className="d-flex flex-wrap gap-3">
                  {roleOptions.map((r) => (
                    <Form.Check
                      key={r.id}
                      type="checkbox"
                      id={`role-${r.id}`}
                      label={r.name}
                      checked={roleIds.includes(r.id)}
                      onChange={() => toggleRole(r.id)}
                    />
                  ))}
                </div>
              )}
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving && <Spinner size="sm" className="me-2" />}
            Lưu
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
