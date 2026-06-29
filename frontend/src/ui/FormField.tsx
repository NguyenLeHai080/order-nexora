import type { ReactNode } from 'react';

export interface FormFieldProps {
  /** Nhãn hiển thị phía trên trường nhập. */
  label?: ReactNode;
  /** Đánh dấu bắt buộc (hiện dấu * đỏ). */
  required?: boolean;
  /** Văn bản gợi ý dưới trường nhập. */
  help?: ReactNode;
  /** Thông báo lỗi (ưu tiên hiển thị thay cho help). */
  error?: ReactNode;
  /** id của control để gắn <label htmlFor>. */
  htmlFor?: string;
  children: ReactNode;
}

/**
 * Bọc một control nhập liệu kèm label, gợi ý và lỗi — bố cục nhất quán
 * cho mọi form trong dự án. Các input UI kit dùng lại component này.
 */
export default function FormField({ label, required, help, error, htmlFor, children }: FormFieldProps) {
  return (
    <div className="ui-field">
      {label && (
        <label className="ui-field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ui-field-required">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className="ui-field-error">{error}</div>
      ) : help ? (
        <div className="ui-field-help">{help}</div>
      ) : null}
    </div>
  );
}
