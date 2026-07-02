/** Cấu hình module Settings: các endpoint + key cấu hình (khớp backend settings/service.py). */

export const SETTINGS_ENDPOINT = '/settings';
export const MAINTENANCE_ENDPOINT = '/settings/maintenance';

// Các key cấu hình dùng trong panel (khớp backend settings/service.py & notifications/service.py).
export const SETTING_KEYS = {
  // Chung
  defaultMarkup: 'default_markup_percent',
  siteBaseUrl: 'site_base_url',
  publicOrgId: 'public_org_id',
  ownerWallet: 'owner_wallet_user_id',
  // Guest & bán hàng
  guestEnabled: 'guest_checkout_enabled',
  guestAuto: 'guest_auto_fulfill',
  manualZaloName: 'manual_fulfillment_zalo_name',
  manualZaloUrl: 'manual_fulfillment_zalo_url',
  manualQrUrl: 'manual_fulfillment_qr_url',
  manualInstructions: 'manual_fulfillment_instructions',
  // Thông báo — Telegram
  tgToken: 'telegram_bot_token',
  tgChat: 'telegram_chat_id',
  // Thông báo — SMTP
  smtpHost: 'smtp_host',
  smtpPort: 'smtp_port',
  smtpUser: 'smtp_user',
  smtpPassword: 'smtp_password',
  smtpFrom: 'smtp_from',
  smtpTls: 'smtp_use_tls',
  // Thông báo — SMS
  smsProvider: 'sms_provider',
  smsApiKey: 'sms_api_key',
  smsApiSecret: 'sms_api_secret',
  smsBrandname: 'sms_brandname',
  smsEndpoint: 'sms_endpoint',
} as const;

// Nhà cung cấp SMS hỗ trợ (khớp notifications/service.py send_customer_sms).
export const SMS_PROVIDERS = [
  { value: '', label: 'Tắt (không gửi SMS)' },
  { value: 'esms', label: 'eSMS.vn' },
  { value: 'speedsms', label: 'SpeedSMS.vn' },
  { value: 'generic_http', label: 'HTTP tùy chỉnh' },
] as const;

// Nhóm tab dọc của trang cài đặt.
export const SETTING_TABS = [
  { key: 'general', label: 'Chung', icon: 'bi-sliders' },
  { key: 'sales', label: 'Guest & Bán hàng', icon: 'bi-bag-check' },
  { key: 'notifications', label: 'Thông báo', icon: 'bi-bell' },
  { key: 'advanced', label: 'Nâng cao', icon: 'bi-wrench-adjustable' },
] as const;

