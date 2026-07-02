/** Cấu hình module Finance: endpoint + nhãn/tùy chọn cho sổ cái ví, phiếu thu/chi, rút tiền. */

export const FINANCE_OVERVIEW_ENDPOINT = '/finance/overview';
export const FINANCE_WALLET_ENDPOINT = '/finance/wallet';
export const FINANCE_CASH_ENTRIES_ENDPOINT = '/finance/cash-entries';
export const FINANCE_WITHDRAWALS_ENDPOINT = '/finance/withdrawals';
export const FINANCE_SUPPLIER_DEBT_ENDPOINT = '/finance/supplier-debt';
export const FINANCE_SETTLEMENTS_ENDPOINT = '/finance/settlements';

// Loại giao dịch ví (khớp WalletTransaction.type ở backend).
export const WALLET_TYPE_LABELS: Record<string, string> = {
  deposit: 'Nạp tiền',
  purchase: 'Mua hàng',
  refund: 'Hoàn tiền',
  owner_profit: 'Lãi chủ',
  withdrawal: 'Rút tiền',
  adjustment: 'Điều chỉnh',
};

export const WALLET_TYPE_OPTIONS = Object.entries(WALLET_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// Màu badge theo loại giao dịch.
export const WALLET_TYPE_COLOR: Record<string, string> = {
  deposit: 'success',
  purchase: 'primary',
  refund: 'warning',
  owner_profit: 'info',
  withdrawal: 'danger',
  adjustment: 'secondary',
};

export const CASH_KIND_OPTIONS = [
  { value: 'income', label: 'Phiếu thu' },
  { value: 'expense', label: 'Phiếu chi' },
];

export const WITHDRAWAL_STATUS_OPTIONS = [
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'paid', label: 'Đã chi' },
  { value: 'rejected', label: 'Từ chối' },
];
