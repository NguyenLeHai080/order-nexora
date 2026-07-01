import { useMemo, useState } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import { apiClient } from '../../../core/apiClient';
import type { Setting } from '../hooks/useSettings';

interface Props {
  settings: Setting[];
  savingKey: string | null;
  onSave: (key: string, value: string, description: string | null) => Promise<void> | void;
  onNotify: (type: string, msg: string) => void;
}

// Các key cấu hình guest checkout + thông báo (khớp backend settings/service.py).
const KEYS = {
  guestEnabled: 'guest_checkout_enabled',
  guestAuto: 'guest_auto_fulfill',
  tgToken: 'telegram_bot_token',
  tgChat: 'telegram_chat_id',
  smtpHost: 'smtp_host',
  smtpPort: 'smtp_port',
  smtpUser: 'smtp_user',
  smtpPassword: 'smtp_password',
  smtpFrom: 'smtp_from',
  smtpTls: 'smtp_use_tls',
  siteBaseUrl: 'site_base_url',
} as const;

const BOOL_TRUE = new Set(['1', 'true', 'on', 'yes']);

/**
 * Cấu hình "Mua không cần đăng nhập & Thông báo": bật/tắt guest checkout, tự động
 * lấy hàng NCC, Telegram bot (báo admin), SMTP (email khách), URL trang tra cứu.
 * Đọc/ghi qua kho cấu hình key/value có sẵn (PUT /settings).
 */
export default function GuestCheckoutSettings({ settings, savingKey, onSave, onNotify }: Props) {
  const map = useMemo(() => {
    const m: Record<string, string> = {};
    settings.forEach((s) => (m[s.key] = s.value));
    return m;
  }, [settings]);

  const [form, setForm] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);

  // Giá trị hiện tại: ưu tiên form (đang sửa), fallback về giá trị đã lưu.
  const val = (key: string, fallback = '') => form[key] ?? map[key] ?? fallback;
  const boolVal = (key: string) => BOOL_TRUE.has((form[key] ?? map[key] ?? '').toLowerCase());
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const toggle = async (key: string) => {
    const next = boolVal(key) ? '0' : '1';
    set(key, next);
    await onSave(key, next, null);
  };

  const saveText = (key: string) => onSave(key, val(key).trim(), null);

  const sendTestTelegram = async () => {
    setTesting(true);
    try {
      const res = await apiClient.post('/settings/test-telegram');
      const sent = res.data?.data?.sent;
      onNotify(sent ? 'success' : 'warning', res.data?.message || (sent ? 'Đã gửi.' : 'Chưa gửi được.'));
    } catch {
      onNotify('danger', 'Không gọi được API gửi thử.');
    } finally {
      setTesting(false);
    }
  };

  const textField = (key: string, label: string, opts: { type?: string; placeholder?: string } = {}) => (
    <Form.Group className="mb-3">
      <Form.Label className="small fw-semibold">{label}</Form.Label>
      <div className="d-flex gap-2">
        <Form.Control
          type={opts.type || 'text'}
          value={val(key)}
          placeholder={opts.placeholder}
          onChange={(e) => set(key, e.target.value)}
        />
        <Button
          variant="outline-primary"
          size="sm"
          disabled={savingKey === key}
          onClick={() => saveText(key)}
        >
          Lưu
        </Button>
      </div>
    </Form.Group>
  );

  return (
    <Card className="mb-3">
      <Card.Header>Mua không cần đăng nhập & Thông báo</Card.Header>
      <Card.Body>
        {/* Toggles */}
        <div className="d-flex align-items-center justify-content-between p-3 rounded bg-light mb-2">
          <span className="fw-semibold">
            <i className="bi bi-bag-check text-success me-2" />
            Cho phép khách mua không cần đăng nhập
          </span>
          <Form.Check
            type="switch"
            checked={boolVal(KEYS.guestEnabled)}
            onChange={() => toggle(KEYS.guestEnabled)}
            style={{ transform: 'scale(1.3)' }}
          />
        </div>
        <div className="d-flex align-items-center justify-content-between p-3 rounded bg-light mb-3">
          <span className="fw-semibold">
            <i className="bi bi-lightning-charge text-warning me-2" />
            Tự động lấy hàng NCC sau khi khách thanh toán
            <span className="d-block text-muted small fw-normal">
              Tắt để chờ bạn bấm duyệt thủ công cho mọi đơn.
            </span>
          </span>
          <Form.Check
            type="switch"
            checked={boolVal(KEYS.guestAuto)}
            onChange={() => toggle(KEYS.guestAuto)}
            style={{ transform: 'scale(1.3)' }}
          />
        </div>

        {textField(KEYS.siteBaseUrl, 'URL trang (dựng link tra cứu đơn)', { placeholder: 'https://nexoratech.com.vn' })}

        <hr />
        <h6 className="fw-semibold mb-3"><i className="bi bi-telegram text-info me-2" />Báo đơn gấp qua Telegram</h6>
        {textField(KEYS.tgToken, 'Bot Token', { placeholder: '123456:ABC-DEF…' })}
        {textField(KEYS.tgChat, 'Chat ID', { placeholder: 'ID chat/nhóm nhận thông báo' })}
        <Button variant="outline-info" size="sm" disabled={testing} onClick={sendTestTelegram}>
          {testing ? 'Đang gửi…' : 'Gửi tin nhắn thử'}
        </Button>

        <hr />
        <h6 className="fw-semibold mb-3"><i className="bi bi-envelope text-primary me-2" />Email báo kết quả cho khách (SMTP)</h6>
        {textField(KEYS.smtpHost, 'SMTP Host', { placeholder: 'smtp.gmail.com' })}
        {textField(KEYS.smtpPort, 'SMTP Port', { type: 'number', placeholder: '587' })}
        {textField(KEYS.smtpUser, 'SMTP User', { placeholder: 'user@gmail.com' })}
        {textField(KEYS.smtpPassword, 'SMTP Password', { type: 'password', placeholder: 'App password' })}
        {textField(KEYS.smtpFrom, 'Email gửi đi (From)', { placeholder: 'no-reply@nexoratech.com.vn' })}
        <div className="d-flex align-items-center justify-content-between p-3 rounded bg-light">
          <span className="fw-semibold">Dùng TLS (STARTTLS)</span>
          <Form.Check
            type="switch"
            checked={boolVal(KEYS.smtpTls)}
            onChange={() => toggle(KEYS.smtpTls)}
            style={{ transform: 'scale(1.3)' }}
          />
        </div>
      </Card.Body>
    </Card>
  );
}
