import { Card } from 'react-bootstrap';
import type { Setting } from '../hooks/useSettings';
import AddSettingForm from './AddSettingForm';
import SettingRow from './SettingRow';

interface Props {
  settings: Setting[];
  savingKey: string | null;
  onSave: (key: string, value: string, description: string | null) => Promise<void> | void;
}

// Panel "Nâng cao": thêm cấu hình key/value tùy ý + danh sách toàn bộ cấu hình thô.
export default function AdvancedPanel({ settings, savingKey, onSave }: Props) {
  return (
    <>
      <div className="alert alert-warning small">
        <i className="bi bi-exclamation-triangle me-1" />
        Khu vực nâng cao: sửa trực tiếp mọi cấu hình key/value. Chỉ dùng khi bạn biết rõ ý nghĩa của key.
      </div>

      <div className="mb-3">
        <AddSettingForm onAdd={(key, value) => onSave(key, value, null)} />
      </div>

      <Card>
        <Card.Header>Toàn bộ cấu hình</Card.Header>
        <Card.Body>
          {settings.length === 0 ? (
            <p className="text-muted mb-0">Chưa có cấu hình nào.</p>
          ) : (
            settings.map((s) => (
              <SettingRow key={s.key} setting={s} saving={savingKey === s.key} onSave={onSave} />
            ))
          )}
        </Card.Body>
      </Card>
    </>
  );
}
