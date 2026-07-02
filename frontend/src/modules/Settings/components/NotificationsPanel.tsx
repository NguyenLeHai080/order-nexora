import { useState } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import { apiClient } from '../../../core/apiClient';
import type { Setting } from '../hooks/useSettings';
import { useSettingFields } from '../hooks/useSettingFields';
import { SETTING_KEYS, SMS_PROVIDERS } from '../config/settingConfig';

interface Props {
  settings: Setting[];
  savingKey: string | null;
  onSave: (key: string, value: string, description: string | null) => Promise<void> | void;
  onNotify: (type: string, msg: string) => void;
}

// Panel "Thông báo": Telegram (báo admin), SMTP (email khách), SMS (báo kết quả khách).
export default function NotificationsPanel({ settings, savingKey, onSave, onNotify }: Props) {
  const { val, set, saveText, textField, toggleRow } = useSettingFields({ settings, savingKey, onSave });
  const [testing, setTesting] = useState(false);

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

  return (
    <>
      <Card className="mb-3">
        <Card.Header>
          <i className="bi bi-telegram text-info me-2" />
          Báo đơn gấp qua Telegram
        </Card.Header>
        <Card.Body>
          {textField(SETTING_KEYS.tgToken, 'Bot Token', { placeholder: '123456:ABC-DEF…' })}
          {textField(SETTING_KEYS.tgChat, 'Chat ID', { placeholder: 'ID chat/nhóm nhận thông báo' })}
          <Button variant="outline-info" size="sm" disabled={testing} onClick={sendTestTelegram}>
            {testing ? 'Đang gửi…' : 'Gửi tin nhắn thử'}
          </Button>
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Header>
          <i className="bi bi-envelope text-primary me-2" />
          Email báo kết quả cho khách (SMTP)
        </Card.Header>
        <Card.Body>
          {textField(SETTING_KEYS.smtpHost, 'SMTP Host', { placeholder: 'smtp.gmail.com' })}
          {textField(SETTING_KEYS.smtpPort, 'SMTP Port', { type: 'number', placeholder: '587' })}
          {textField(SETTING_KEYS.smtpUser, 'SMTP User', { placeholder: 'user@gmail.com' })}
          {textField(SETTING_KEYS.smtpPassword, 'SMTP Password', { type: 'password', placeholder: 'App password' })}
          {textField(SETTING_KEYS.smtpFrom, 'Email gửi đi (From)', { placeholder: 'no-reply@nexoratech.com.vn' })}
          {toggleRow(SETTING_KEYS.smtpTls, 'Dùng TLS (STARTTLS)')}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <i className="bi bi-chat-dots text-success me-2" />
          SMS báo kết quả cho khách (tùy chọn)
        </Card.Header>
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Nhà cung cấp SMS</Form.Label>
            <div className="d-flex gap-2">
              <Form.Select value={val(SETTING_KEYS.smsProvider)} onChange={(e) => set(SETTING_KEYS.smsProvider, e.target.value)}>
                {SMS_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Form.Select>
              <Button
                variant="outline-primary"
                size="sm"
                disabled={savingKey === SETTING_KEYS.smsProvider}
                onClick={() => saveText(SETTING_KEYS.smsProvider)}
              >
                Lưu
              </Button>
            </div>
            <Form.Text className="text-muted">
              Để trống/Tắt nếu chưa dùng SMS. Cần thương hiệu (brandname) đã đăng ký với nhà mạng.
            </Form.Text>
          </Form.Group>
          {textField(SETTING_KEYS.smsApiKey, 'API Key', { placeholder: 'ApiKey của nhà cung cấp' })}
          {textField(SETTING_KEYS.smsApiSecret, 'API Secret', { type: 'password', placeholder: 'SecretKey (nếu có)' })}
          {textField(SETTING_KEYS.smsBrandname, 'Brandname', { placeholder: 'Tên thương hiệu đã đăng ký' })}
          {textField(SETTING_KEYS.smsEndpoint, 'Endpoint (chỉ HTTP tùy chỉnh)', { placeholder: 'https://…/send' })}
        </Card.Body>
      </Card>
    </>
  );
}
