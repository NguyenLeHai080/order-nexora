import { useState } from 'react';
import { Alert, Form } from 'react-bootstrap';
import { Button, TextInput } from '../../../ui';
import { useLogin } from '../hooks/useLogin';

// Form đăng nhập: email + mật khẩu (có nút hiện/ẩn). Dùng UI kit cho input/nút.
export default function LoginForm() {
  const { email, setEmail, password, setPassword, error, loading, submit } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={submit}>
        <TextInput
          id="login-email"
          label="Email / Tên đăng nhập"
          placeholder="Nhập email hoặc tên đăng nhập"
          autoFocus
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        />

        <Form.Group className="mb-3">
          <Form.Label>Mật khẩu</Form.Label>
          <div className="position-relative">
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
            />
            <button
              type="button"
              className="btn btn-link position-absolute end-0 top-0 text-muted"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
            </button>
          </div>
        </Form.Group>

        <Button type="submit" variant="success" className="w-100" loading={loading}>
          Đăng nhập
        </Button>
      </Form>
    </>
  );
}
