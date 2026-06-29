import { Form } from 'react-bootstrap';
import type { ComponentProps, ReactNode } from 'react';
import FormField from './FormField';

type FormSelectProps = ComponentProps<typeof Form.Select>;

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectInputProps extends Omit<FormSelectProps, 'isInvalid'> {
  label?: string;
  required?: boolean;
  help?: string;
  error?: string;
  /** Danh sách lựa chọn. Có thể bỏ qua và truyền <option> qua children. */
  options?: SelectOption[];
  /** Mục placeholder đầu danh sách (vd "-- Chọn --"). */
  placeholder?: string;
  children?: ReactNode;
}

/**
 * Ô chọn (dropdown) kèm label + lỗi. Truyền `options` để tự sinh <option>,
 * hoặc truyền children tùy biến.
 */
export default function SelectInput({
  label,
  required,
  help,
  error,
  id,
  options,
  placeholder,
  children,
  ...rest
}: SelectInputProps) {
  return (
    <FormField label={label} required={required} help={help} error={error} htmlFor={id}>
      <Form.Select id={id} isInvalid={!!error} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : children}
      </Form.Select>
    </FormField>
  );
}
