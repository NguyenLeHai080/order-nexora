import { Card } from 'react-bootstrap';
import type { Setting } from '../hooks/useSettings';
import { useSettingFields } from '../hooks/useSettingFields';
import { SETTING_KEYS } from '../config/settingConfig';

interface Props {
  settings: Setting[];
  savingKey: string | null;
  onSave: (key: string, value: string, description: string | null) => Promise<void> | void;
}

// Panel "Guest & Bán hàng": bật guest checkout, tự động lấy hàng, hướng dẫn thanh toán thủ công.
export default function SalesPanel({ settings, savingKey, onSave }: Props) {
  const { textField, toggleRow } = useSettingFields({ settings, savingKey, onSave });

  return (
    <>
      <Card className="mb-3">
        <Card.Header>Mua không cần đăng nhập</Card.Header>
        <Card.Body>
          {toggleRow(
            SETTING_KEYS.guestEnabled,
            <>
              <i className="bi bi-bag-check text-success me-2" />
              Cho phép khách mua không cần đăng nhập
            </>,
          )}
          {toggleRow(
            SETTING_KEYS.guestAuto,
            <>
              <i className="bi bi-lightning-charge text-warning me-2" />
              Tự động lấy hàng NCC sau khi khách thanh toán
              <span className="d-block text-muted small fw-normal">
                Tắt để chờ bạn bấm duyệt thủ công cho mọi đơn.
              </span>
            </>,
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>Thanh toán & lấy hàng thủ công</Card.Header>
        <Card.Body>
          <p className="text-muted small">
            Hiển thị cho khách vãng lai khi cần chuyển khoản/nhận hàng thủ công.
          </p>
          {textField(SETTING_KEYS.manualZaloName, 'Tên Zalo hỗ trợ', { placeholder: 'Vd: Nexora Support' })}
          {textField(SETTING_KEYS.manualZaloUrl, 'Link Zalo', { placeholder: 'https://zalo.me/…' })}
          {textField(SETTING_KEYS.manualQrUrl, 'URL ảnh QR chuyển khoản', { placeholder: 'https://…/qr.png' })}
          {textField(SETTING_KEYS.manualInstructions, 'Hướng dẫn thanh toán', {
            placeholder: 'Nội dung hướng dẫn hiển thị cho khách',
          })}
        </Card.Body>
      </Card>
    </>
  );
}
