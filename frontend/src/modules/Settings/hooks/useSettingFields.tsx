import { useMemo, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import type { ReactNode } from 'react';
import type { Setting } from './useSettings';

const BOOL_TRUE = new Set(['1', 'true', 'on', 'yes']);

interface Options {
  settings: Setting[];
  savingKey: string | null;
  onSave: (key: string, value: string, description: string | null) => Promise<void> | void;
}

/**
 * Logic dùng chung cho mọi panel cài đặt: đọc/ghi giá trị key/value.
 * Tách từ GuestCheckoutSettings cũ để tái dùng cho tab dọc (Chung/Guest/Thông báo).
 * - `val/boolVal`: đọc giá trị (ưu tiên form đang sửa, fallback về đã lưu).
 * - `toggle`: bật/tắt switch và lưu ngay.
 * - `textField`: render 1 ô nhập + nút Lưu.
 */
export function useSettingFields({ settings, savingKey, onSave }: Options) {
  const map = useMemo(() => {
    const m: Record<string, string> = {};
    settings.forEach((s) => (m[s.key] = s.value));
    return m;
  }, [settings]);

  const [form, setForm] = useState<Record<string, string>>({});

  const val = (key: string, fallback = '') => form[key] ?? map[key] ?? fallback;
  const boolVal = (key: string) => BOOL_TRUE.has((form[key] ?? map[key] ?? '').toLowerCase());
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const toggle = async (key: string) => {
    const next = boolVal(key) ? '0' : '1';
    set(key, next);
    await onSave(key, next, null);
  };

  const saveText = (key: string) => onSave(key, val(key).trim(), null);

  const textField = (
    key: string,
    label: string,
    opts: { type?: string; placeholder?: string; help?: ReactNode } = {},
  ) => (
    <Form.Group className="mb-3">
      <Form.Label className="small fw-semibold">{label}</Form.Label>
      <div className="d-flex gap-2">
        <Form.Control
          type={opts.type || 'text'}
          value={val(key)}
          placeholder={opts.placeholder}
          onChange={(e) => set(key, e.target.value)}
        />
        <Button variant="outline-primary" size="sm" disabled={savingKey === key} onClick={() => saveText(key)}>
          Lưu
        </Button>
      </div>
      {opts.help && <Form.Text className="text-muted">{opts.help}</Form.Text>}
    </Form.Group>
  );

  const toggleRow = (key: string, label: ReactNode) => (
    <div className="d-flex align-items-center justify-content-between p-3 rounded bg-light mb-3">
      <span className="fw-semibold">{label}</span>
      <Form.Check
        type="switch"
        checked={boolVal(key)}
        onChange={() => toggle(key)}
        style={{ transform: 'scale(1.3)' }}
      />
    </div>
  );

  return { val, boolVal, set, toggle, saveText, textField, toggleRow };
}
