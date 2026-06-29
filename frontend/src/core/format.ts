/** Tiện ích format dùng chung cho UI. */

/** Format số tiền VND. Backend trả Decimal dạng string nên parse trước. */
export function formatCurrency(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(n)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

/** Format số có phân tách hàng nghìn. */
export function formatNumber(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(n)) return '0';
  return new Intl.NumberFormat('vi-VN').format(n);
}

/** Format datetime ISO sang dd/mm/yyyy HH:MM. Nếu đã là chuỗi format sẵn thì trả nguyên. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value; // log-activities đã format sẵn
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Trả về URL đầy đủ để hiển thị ảnh đã upload.
 * Backend lưu đường dẫn dạng "/uploads/xxx.png"; dev server proxy /uploads sang :8000.
 */
export function resolveAsset(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url;
}
