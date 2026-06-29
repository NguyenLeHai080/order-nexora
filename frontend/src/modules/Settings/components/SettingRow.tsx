import { useState } from 'react';
import { Button, TextInput } from '../../../ui';
import type { Setting } from '../hooks/useSettings';

interface Props {
  setting: Setting;
  saving: boolean;
  onSave: (key: string, value: string, description: string | null) => void;
}

// Một dòng cấu hình có thể sửa giá trị inline. Nút lưu chỉ bật khi có thay đổi.
export default function SettingRow({ setting, saving, onSave }: Props) {
  const [value, setValue] = useState(setting.value);
  const dirty = value !== setting.value;

  return (
    <div className="d-flex align-items-end gap-2 mb-3 pb-3 border-bottom">
      <div className="flex-grow-1">
        <label className="form-label mb-1 fw-semibold font-monospace">{setting.key}</label>
        {setting.description && <div className="text-muted small mb-1">{setting.description}</div>}
        <TextInput
          id={`setting-${setting.key}`}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        />
      </div>
      <Button
        variant={dirty ? 'primary' : 'light'}
        loading={saving}
        icon="save"
        disabled={!dirty}
        onClick={() => onSave(setting.key, value, setting.description)}
      />
    </div>
  );
}
