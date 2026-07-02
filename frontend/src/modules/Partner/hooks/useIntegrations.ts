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

export interface CatalogSyncRun {
  id: number;
  supplier_id: number | null;
  driver: string;
  supplier_name: string | null;
  mode: string;
  status: string;
  livemode: boolean;
  total: number;
  created_count: number;
  updated_count: number;
  discontinued_count: number;
  reactivated_count: number;
  unchanged_count: number;
  warning_count: number;
  error_count: number;
  requested_by: number | null;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  created_at: string | null;
}

export interface CatalogSyncItem {
  id: number;
  run_id: number;
  product_id: number | null;
  external_id: string | null;
  product_name: string | null;
  action: string;
  warning_code: string | null;
  note: string | null;
  old_base_price: string | null;
  new_base_price: string | null;
  old_sale_price: string | null;
  new_sale_price: string | null;
  margin_after: string | null;
  stock_status: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
}

export interface CatalogSyncResult {
  run_id: number;
  dry_run: boolean;
  total: number;
  created: number;
  updated: number;
  discontinued: number;
  reactivated: number;
  unchanged: number;
  warnings: number;
  errors: number;
  livemode: boolean;
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
  const syncRuns = useList<CatalogSyncRun>('/partner/sync-runs', {
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
    syncRuns: syncRuns.data,
    syncRunsMeta: syncRuns.meta,
    syncRunsLoading: syncRuns.loading,
    syncRunsQuery: syncRuns.query,
    setSyncRunStatus: syncRuns.setStatus,
    setSyncRunPage: syncRuns.setPage,
    refetchSyncRuns: syncRuns.refetch,
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
  syncCatalog: (supplierId: number, body: { dry_run?: boolean; discontinue_missing?: boolean } = {}) =>
    apiClient.post(`/partner/${supplierId}/sync-catalog`, body),
  getSyncRunItems: (runId: number) => apiClient.get(`/partner/sync-runs/${runId}/items`),
  getWebhookConfig: (driver: string) => apiClient.get(`/partner/webhook-config/${driver}`),
  generateSecret: (driver: string, environment: 'test' | 'live') =>
    apiClient.post(`/partner/webhook-config/${driver}/generate-secret`, { environment }),
};
