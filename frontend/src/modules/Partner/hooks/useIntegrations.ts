import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';

/** Một trường cấu hình do backend mô tả (descriptor.fields). */
export interface DriverField {
  key: string;
  label: string;
  type: string; // text | password | select | url
  required: boolean;
  secret: boolean;
  env_scoped: boolean;
  options: string[] | null;
  placeholder: string | null;
}

/** Mô tả driver — FE đọc để render picker + modal cấu hình động. */
export interface DriverDescriptor {
  key: string;
  label: string;
  capabilities: string[];
  fields: DriverField[];
  has_webhook: boolean;
  default_endpoint: string | null;
  supports_environments: boolean;
}

/** Nhà cung cấp đã cấu hình (GET /suppliers). */
export interface IntegrationSupplier {
  id: number;
  name: string;
  driver: string;
  api_endpoint: string | null;
  environment: string;
  status: string;
  note: string | null;
  created_at: string | null;
  configured: Record<string, boolean>;
  has_api_key_test?: boolean;
  has_api_key_live?: boolean;
  has_webhook_secret_test?: boolean;
  has_webhook_secret_live?: boolean;
}

export interface ProviderWebhookEvent {
  id: number;
  driver: string;
  event_id: string;
  event_type: string | null;
  provider_order_id: string | null;
  livemode: boolean;
  status: string;
  note: string | null;
  created_at: string | null;
}

export interface WebhookConfig {
  supplier_id: number | null;
  driver: string;
  webhook_path: string;
  webhook_url: string;
  has_webhook_secret_test: boolean;
  has_webhook_secret_live: boolean;
  descriptor: DriverDescriptor | null;
}

/** Cột cố định trên Supplier — field có key này gửi thẳng, còn lại gói vào `config`. */
const SUPPLIER_COLUMNS = new Set([
  'name',
  'api_endpoint',
  'environment',
  'status',
  'note',
  'api_key_test',
  'api_key_live',
  'api_key',
  'webhook_secret_test',
  'webhook_secret_live',
]);

export function capabilityLabel(cap: string): string {
  const map: Record<string, string> = {
    catalog: 'Đồng bộ catalog',
    balance: 'Số dư',
    orders: 'Tạo đơn',
    webhook: 'Webhook',
    livemode: 'Live mode',
    account: 'Tài khoản',
    domains: 'Tên miền',
  };
  return map[cap] ?? cap;
}

/** Hook tải danh sách driver + nhà cung cấp + lịch sử webhook. */
export function useIntegrations() {
  const [drivers, setDrivers] = useState<DriverDescriptor[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const suppliers = useList<IntegrationSupplier>('/suppliers', { limit: 100 });
  const events = useList<ProviderWebhookEvent>('/partner/webhook-events', {
    limit: 10,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const fetchDrivers = useCallback(async () => {
    setDriversLoading(true);
    try {
      const res = await apiClient.get('/partner/drivers');
      setDrivers(res.data.data ?? []);
    } catch {
      setDrivers([]);
    } finally {
      setDriversLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDrivers();
  }, [fetchDrivers]);

  return {
    drivers,
    driversLoading,
    suppliers: suppliers.data,
    suppliersMeta: suppliers.meta,
    suppliersLoading: suppliers.loading,
    refetchSuppliers: suppliers.refetch,
    events: events.data,
    eventsMeta: events.meta,
    eventsLoading: events.loading,
    eventsQuery: events.query,
    setEventSearch: events.setSearch,
    setEventStatus: events.setStatus,
    setEventPage: events.setPage,
    refetchEvents: events.refetch,
  };
}

/** Tách form values thành payload Supplier (cột cố định + config JSON). */
export function buildSupplierPayload(
  descriptor: DriverDescriptor,
  base: { name: string; environment: string; status: string; note: string },
  values: Record<string, string>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: base.name,
    driver: descriptor.key,
    status: base.status,
    note: base.note || null,
  };
  if (descriptor.supports_environments) payload.environment = base.environment;

  const config: Record<string, string> = {};
  for (const field of descriptor.fields) {
    const value = values[field.key];
    // Secret để trống = giữ nguyên giá trị cũ, không gửi.
    if (value === undefined || value === '') continue;
    if (SUPPLIER_COLUMNS.has(field.key)) {
      payload[field.key] = value;
    } else {
      config[field.key] = value;
    }
  }
  if (Object.keys(config).length > 0) payload.config = config;
  return payload;
}

export const integrationActions = {
  createSupplier: (body: Record<string, unknown>) => apiClient.post('/suppliers', body),
  updateSupplier: (id: number, body: Record<string, unknown>) => apiClient.put(`/suppliers/${id}`, body),
  removeSupplier: (id: number) => apiClient.delete(`/suppliers/${id}`),
  getBalance: (supplierId: number) => apiClient.get(`/partner/${supplierId}/balance`),
  syncCatalog: (supplierId: number) => apiClient.post(`/partner/${supplierId}/sync-catalog`),
  getWebhookConfig: (driver: string) => apiClient.get(`/partner/webhook-config/${driver}`),
  generateSecret: (driver: string, environment: 'test' | 'live') =>
    apiClient.post(`/partner/webhook-config/${driver}/generate-secret`, { environment }),
};
