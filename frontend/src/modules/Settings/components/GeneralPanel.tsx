import { Card, Form } from 'react-bootstrap';
import type { Setting } from '../hooks/useSettings';
import { useSettingFields } from '../hooks/useSettingFields';
import { SETTING_KEYS } from '../config/settingConfig';

interface Props {
  settings: Setting[];
  savingKey: string | null;
  onSave: (key: string, value: string, description: string | null) => Promise<void> | void;
  maintenance: boolean;
  onToggleMaintenance: () => void;
}

// Panel "Chung": bảo trì, markup mặc định, URL trang, tổ chức public, ví lợi nhuận chủ.
export default function GeneralPanel({ settings, savingKey, onSave, maintenance, onToggleMaintenance }: Props) {
  const { textField } = useSettingFields({ settings, savingKey, onSave });

  return (
    <>
      <Card className="mb-3">
        <Card.Header>Chế độ bảo trì</Card.Header>
        <Card.Body>
          <p className="text-muted small">
            Khi bật, mọi API mua bán bị chặn (trừ đăng nhập và tài liệu). Dùng khi cần nâng cấp hệ thống.
          </p>
          <div className="d-flex align-items-center justify-content-between p-3 rounded bg-light">
            <span className="fw-semibold">
              <i className={`bi ${maintenance ? 'bi-cone-striped text-warning' : 'bi-check-circle text-success'} me-2`} />
              {maintenance ? 'Đang bảo trì' : 'Hệ thống hoạt động'}
            </span>
            <Form.Check
              type="switch"
              checked={maintenance}
              onChange={onToggleMaintenance}
              style={{ transform: 'scale(1.4)' }}
            />
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>Cấu hình chung</Card.Header>
        <Card.Body>
          {textField(SETTING_KEYS.defaultMarkup, 'Markup mặc định (%)', {
            type: 'number',
            placeholder: '0',
            help: 'Tỷ lệ cộng thêm giá bán mặc định khi tạo/sync sản phẩm mới.',
          })}
          {textField(SETTING_KEYS.siteBaseUrl, 'URL trang (dựng link tra cứu đơn)', {
            placeholder: 'https://nexoratech.com.vn',
          })}
          {textField(SETTING_KEYS.publicOrgId, 'ID tổ chức hiển thị landing (public_org_id)', {
            type: 'number',
            placeholder: 'Vd: 1',
            help: 'Tổ chức mà landing công khai lấy sản phẩm/bài viết.',
          })}
          {textField(SETTING_KEYS.ownerWallet, 'User ID ví lợi nhuận chủ (owner_wallet_user_id)', {
            type: 'number',
            placeholder: 'Vd: 1',
            help: 'Ví nhận lãi mỗi đơn thành công. Để trống dùng admin đầu tiên.',
          })}
        </Card.Body>
      </Card>
    </>
  );
}
