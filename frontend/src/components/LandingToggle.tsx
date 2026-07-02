import { useState } from 'react';
import { Form } from 'react-bootstrap';

interface Props {
  /** Giá trị hiện tại. */
  value: boolean;
  /** Gọi khi bật/tắt — trả về giá trị mới; ném lỗi nếu lưu thất bại. */
  onToggle: (next: boolean) => Promise<void>;
  /** Cho phép thao tác (theo quyền). */
  disabled?: boolean;
}

/**
 * Công tắc ẩn/hiện trên landing dùng inline trong bảng danh sách.
 * Optimistic: đổi ngay, rollback nếu API lỗi.
 */
export default function LandingToggle({ value, onToggle, disabled }: Props) {
  const [checked, setChecked] = useState(value);
  const [busy, setBusy] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    setChecked(next);
    setBusy(true);
    try {
      await onToggle(next);
    } catch {
      setChecked(!next); // rollback
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form.Check
      type="switch"
      checked={checked}
      disabled={disabled || busy}
      onChange={handleChange}
      title={checked ? 'Đang hiển thị trên landing' : 'Đang ẩn khỏi landing'}
    />
  );
}
