import { Form } from 'react-bootstrap';
import type { ComponentProps } from 'react';

type FormCheckProps = ComponentProps<typeof Form.Check>;

export interface CheckboxProps extends Omit<FormCheckProps, 'type'> {
  /** Kiểu hiển thị: ô tick hoặc công tắc. */
  type?: 'checkbox' | 'switch';
}

/** Ô tick / công tắc kèm nhãn — bọc react-bootstrap Form.Check. */
export default function Checkbox({ type = 'checkbox', ...rest }: CheckboxProps) {
  return <Form.Check type={type} {...rest} />;
}
