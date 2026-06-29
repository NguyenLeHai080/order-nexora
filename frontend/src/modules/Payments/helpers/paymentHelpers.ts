/** Nhãn phương thức nạp tiền. */
export function methodLabel(method: string): string {
  const map: Record<string, string> = {
    bank: 'Chuyển khoản',
    qr_auto: 'QR tự động',
    manual: 'Thủ công',
  };
  return map[method] ?? method;
}
