import { Button as BsButton, Spinner } from 'react-bootstrap';
import type { ComponentProps, ReactNode } from 'react';

type BsButtonProps = ComponentProps<typeof BsButton>;

export interface ButtonProps extends Omit<BsButtonProps, 'variant' | 'size'> {
  /** Màu theo theme. */
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'link';
  size?: 'sm' | 'lg';
  /** Hiện spinner + khóa nút khi đang xử lý. */
  loading?: boolean;
  /** Tên icon bootstrap-icons (vd "plus-lg"), hiện trước nhãn. */
  icon?: string;
  children?: ReactNode;
}

/**
 * Nút bấm chuẩn dự án — bọc react-bootstrap Button, thêm trạng thái loading
 * và icon tiện dụng. Dùng thay cho <Button> bootstrap trực tiếp.
 */
export default function Button({
  variant = 'primary',
  loading = false,
  icon,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <BsButton variant={variant} disabled={disabled || loading} {...rest}>
      {loading ? (
        <Spinner size="sm" className="me-2" />
      ) : (
        icon && <i className={`bi bi-${icon} ${children ? 'me-1' : ''}`} />
      )}
      {children}
    </BsButton>
  );
}
