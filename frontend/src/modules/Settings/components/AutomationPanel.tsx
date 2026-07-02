import { Alert, Card } from 'react-bootstrap';
import type { Setting } from '../hooks/useSettings';
import { useSettingFields } from '../hooks/useSettingFields';
import { SETTING_KEYS } from '../config/settingConfig';

interface Props {
  settings: Setting[];
  savingKey: string | null;
  onSave: (key: string, value: string, description: string | null) => Promise<void> | void;
}

// Panel "Tự động hóa": lịch đồng bộ catalog NCC và rule an toàn khi provider đổi giá/tồn.
export default function AutomationPanel({ settings, savingKey, onSave }: Props) {
  const { textField, toggleRow } = useSettingFields({ settings, savingKey, onSave });

  return (
    <>
      <Alert variant="info" className="small">
        <div className="fw-semibold mb-1">Logic tự động hóa đồng bộ NCC</div>
        <ol className="mb-0 ps-3">
          <li>Scheduler nền kiểm tra mỗi phút, chỉ chạy khi key <code>catalog_sync_enabled</code> bật.</li>
          <li>Mỗi NCC active có capability catalog sẽ được sync khi quá chu kỳ cấu hình.</li>
          <li>Manual sync và auto sync dùng cùng SyncRun lock nên không chạy trùng một NCC.</li>
          <li>Hệ thống ghi lịch sử SyncRun/SyncItem để xem sản phẩm mới, cập nhật, ngưng bán và cảnh báo lãi.</li>
        </ol>
      </Alert>

      <Card className="mb-3">
        <Card.Header>
          <i className="bi bi-robot text-primary me-2" />
          Đồng bộ catalog nhà cung cấp tự động
        </Card.Header>
        <Card.Body>
          {toggleRow(
            SETTING_KEYS.catalogSyncEnabled,
            <>
              Bật lịch tự động đồng bộ NCC
              <span className="d-block text-muted small fw-normal">
                Mặc định tắt để tránh gọi API NCC ngoài ý muốn. Khi bật, backend tự chạy theo chu kỳ bên dưới.
              </span>
            </>,
          )}
          {textField(SETTING_KEYS.catalogSyncInterval, 'Chu kỳ đồng bộ (phút)', {
            type: 'number',
            placeholder: '60',
            help: 'Giá trị dưới 5 phút sẽ được coi như tắt để tránh spam API nhà cung cấp.',
          })}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <i className="bi bi-shield-check text-success me-2" />
          Rule an toàn khi đồng bộ
        </Card.Header>
        <Card.Body>
          {toggleRow(
            SETTING_KEYS.catalogSyncDiscontinueMissing,
            <>
              Tự ngưng bán sản phẩm không còn trong catalog NCC
              <span className="d-block text-muted small fw-normal">
                Sản phẩm biến mất khỏi NCC sẽ thành out_of_stock + inactive để khách không mua nhầm hàng đã bị gỡ.
              </span>
            </>,
          )}
          {toggleRow(
            SETTING_KEYS.catalogSyncNotify,
            <>
              Báo Telegram khi auto sync có thay đổi/cảnh báo/lỗi
              <span className="d-block text-muted small fw-normal">
                Dùng cấu hình Telegram ở tab Thông báo. Lỗi gửi thông báo không làm hỏng sync.
              </span>
            </>,
          )}
        </Card.Body>
      </Card>
    </>
  );
}
