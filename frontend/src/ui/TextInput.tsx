import { Form } from 'react-bootstrap';
import type { ComponentProps } from 'react';
import FormField from './FormField';

type FormControlProps = ComponentProps<typeof Form.Control>;

export interface TextInputProps extends Omit<FormControlProps, 'isInvalid'> {
  label?: string;
  required?: boolean;
  help?: string;
  error?: string;
}

/**
 * Ô nhập văn bản (text/email/password/number...) kèm label + lỗi.
 * Truyền `type` để đổi loại input. Dùng FormField cho bố cục nhất quán.
 */
export default function TextInput({ label, required, help, error, id, type = 'text', ...rest }: TextInputProps) {
  return (
    <FormField label={label} required={required} help={help} error={error} htmlFor={id}>
      <Form.Control id={id} type={type} isInvalid={!!error} {...rest} />
    </FormField>
  );
}
