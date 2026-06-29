import { Form } from 'react-bootstrap';
import type { ComponentProps } from 'react';
import FormField from './FormField';

type FormControlProps = ComponentProps<typeof Form.Control>;

export interface TextareaInputProps extends Omit<FormControlProps, 'isInvalid' | 'as'> {
  label?: string;
  required?: boolean;
  help?: string;
  error?: string;
  /** Số dòng hiển thị. */
  rows?: number;
}

/** Ô nhập văn bản nhiều dòng kèm label + lỗi. */
export default function TextareaInput({
  label,
  required,
  help,
  error,
  id,
  rows = 3,
  ...rest
}: TextareaInputProps) {
  return (
    <FormField label={label} required={required} help={help} error={error} htmlFor={id}>
      <Form.Control id={id} as="textarea" rows={rows} isInvalid={!!error} {...rest} />
    </FormField>
  );
}
