import { useUpload } from '../core/useUpload';
import { resolveAsset } from '../core/format';
import FormField from './FormField';

export interface ImageUploadProps {
  label?: string;
  required?: boolean;
  help?: string;
  /** URL ảnh hiện tại (đã upload). */
  value: string;
  /** Gọi khi upload xong, trả URL mới. */
  onChange: (url: string) => void;
  /** Chiều cao tối đa của ảnh preview (px). */
  previewHeight?: number;
}

/**
 * Trường tải ảnh: chọn file -> upload qua API -> trả URL + hiện preview.
 * Gói sẵn hook useUpload, trạng thái tải và lỗi.
 */
export default function ImageUpload({
  label,
  required,
  help,
  value,
  onChange,
  previewHeight = 120,
}: ImageUploadProps) {
  const { upload, uploading, error } = useUpload();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file);
    if (url) onChange(url);
  }

  return (
    <FormField label={label} required={required} help={help} error={error}>
      <input className="form-control" type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
      {uploading && <div className="ui-field-help">Đang tải ảnh...</div>}
      {value && (
        <div className="mt-2">
          <img src={resolveAsset(value)} alt="preview" style={{ maxHeight: previewHeight }} className="border rounded" />
        </div>
      )}
    </FormField>
  );
}
