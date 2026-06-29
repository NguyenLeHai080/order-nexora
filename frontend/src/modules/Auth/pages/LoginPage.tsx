import { Card } from 'react-bootstrap';
import LoginForm from '../components/LoginForm';

// Trang đăng nhập theo phong cách Velzon: hero gradient xanh + card trắng nổi lên.
export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-hero">
        <h2 className="fw-bold mb-1" style={{ letterSpacing: 2 }}>
          ORDER NEXORA
        </h2>
        <p className="opacity-75 mb-0">Hệ thống quản trị bán sản phẩm số</p>
      </div>

      <Card className="auth-card shadow">
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            <h5 className="text-primary fw-bold">Chào mừng trở lại!</h5>
            <p className="text-muted mb-0">Đăng nhập để tiếp tục vào Order Nexora.</p>
          </div>

          <LoginForm />
        </Card.Body>
      </Card>

      <p className="text-muted mt-4 mb-5">© 2026 Order Nexora</p>
    </div>
  );
}
