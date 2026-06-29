import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from './useAuth';

/** Quản state form đăng nhập + gọi API, điều hướng về trang chủ khi thành công. */
export function useLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Đăng nhập thất bại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return { email, setEmail, password, setPassword, error, loading, submit };
}
