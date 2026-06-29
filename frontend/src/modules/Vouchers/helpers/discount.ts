import { formatCurrency, formatNumber } from '../../../core/format';
import type { Voucher } from '../hooks/useVouchers';

/** Nhãn mức giảm: phần trăm hoặc số tiền tùy discount_type. */
export function discountLabel(v: Voucher): string {
  return v.discount_type === 'percent' ? `${formatNumber(v.discount_value)}%` : formatCurrency(v.discount_value);
}
