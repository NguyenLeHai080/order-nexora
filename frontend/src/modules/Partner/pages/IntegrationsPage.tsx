import { useMemo, useState } from 'react';
import { Alert, Badge } from 'react-bootstrap';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import PageHeader from '../../../components/PageHeader';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useAuthStore } from '../../../core/authStore';
import { formatDateTime } from '../../../core/format';
import { extractError } from '../../../core/useList';
import { Button } from '../../../ui';
import CatalogSyncModal from '../components/CatalogSyncModal';
import ProviderConfigModal from '../components/ProviderConfigModal';
import {
  integrationActions,
  useIntegrations,
  type CatalogSyncRun,
  type DriverDescriptor,
  type IntegrationSupplier,
  type ProviderWebhookEvent,
} from '../hooks/useIntegrations';

const EVENT_STATUS_OPTIONS = [
  { value: 'received', label: 'Received' },
  { value: 'processed', label: 'Processed' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'failed', label: 'Failed' },
];

const SYNC_STATUS_OPTIONS = [
  { value: 'running', label: 'Đang chạy' },
  { value: 'success', label: 'Thành công' },
  { value: 'failed', label: 'Lỗi' },
  { value: 'skipped', label: 'Bỏ qua' },
];

export default function IntegrationsPage() {
  const { can } = useAuthStore();
  const {
    drivers,
    suppliers,
    suppliersLoading,
    refetchSuppliers,
    events,
    eventsMeta,
    eventsLoading,
    eventsQuery,
    setEventSearch,
    setEventStatus,
    setEventPage,
    refetchEvents,
    syncRuns,
    syncRunsMeta,
    syncRunsLoading,
    syncRunsQuery,
    setSyncRunStatus,
    setSyncRunPage,
    refetchSyncRuns,
  } = useIntegrations();

  const [modalDriver, setModalDriver] = useState<DriverDescriptor | null>(null);
  const [editing, setEditing] = useState<IntegrationSupplier | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<IntegrationSupplier | null>(null);
  const [syncSupplier, setSyncSupplier] = useState<IntegrationSupplier | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'danger' | 'info'; message: string } | null>(null);

  const driverByKey = useMemo(() => {
    const map: Record<string, DriverDescriptor> = {};
    for (const d of drivers) map[d.key] = d;
    return map;
  }, [drivers]);

  const hasWebhookDriver = drivers.some((d) => d.has_webhook);
  const canManage = can('update', 'Partner');

  function openCreate(driver: DriverDescriptor) {
    setModalDriver(driver);
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(supplier: IntegrationSupplier) {
    const driver = driverByKey[supplier.driver];
    if (!driver) {
      setToast({ type: 'danger', message: `Driver "${supplier.driver}" không còn được hỗ trợ.` });
      return;
    }
    setModalDriver(driver);
    setEditing(supplier);
    setShowModal(true);
  }

  async function handleBalance(supplier: IntegrationSupplier) {
    setBusy(supplier.id);
    setToast(null);
    try {
      const res = await integrationActions.getBalance(supplier.id);
      const d = res.data.data;
      setToast({ type: 'info', message: `Số dư ${supplier.name}: ${d.balance} ${d.currency}` });
    } catch (err) {
      setToast({ type: 'danger', message: extractError(err) });
    } finally {
      setBusy(null);
    }
  }

  function handleSync(supplier: IntegrationSupplier) {
    setSyncSupplier(supplier);
  }

  const columns: Column<IntegrationSupplier>[] = [
    { key: 'name', header: 'Nhà cung cấp', render: (s) => <span className="fw-semibold">{s.name}</span> },
    {
      key: 'driver',
      header: 'Driver',
      render: (s) => {
        const d = driverByKey[s.driver];
        return <Badge bg="light" text="dark" className="border">{d?.label ?? s.driver}</Badge>;
      },
    },
    {
      key: 'capabilities',
      header: 'Khả năng',
      render: (s) => {
        const d = driverByKey[s.driver];
        if (!d) return <span className="text-muted">-</span>;
        return (
          <div className="d-flex flex-wrap gap-1">
            {d.has_webhook ? <Badge bg="info">webhook</Badge> : null}
            {d.capabilities.includes('catalog') ? <Badge bg="secondary">catalog</Badge> : null}
            {d.capabilities.includes('domains') ? <Badge bg="secondary">domains</Badge> : null}
          </div>
        );
      },
    },
    {
      key: 'environment',
      header: 'Môi trường',
      render: (s) => {
        const d = driverByKey[s.driver];
        if (d && !d.supports_environments) return <span className="text-muted">-</span>;
        return <Badge bg={s.environment === 'live' ? 'success' : 'secondary'}>{s.environment}</Badge>;
      },
    },
    {
      key: 'configured',
      header: 'Cấu hình',
      render: (s) => {
        const entries = Object.entries(s.configured ?? {});
        if (entries.length === 0) return <span className="text-muted">-</span>;
        return (
          <div className="d-flex flex-wrap gap-1">
            {entries.map(([key, ok]) => (
              <Badge key={key} bg={ok ? 'success' : 'warning'} title={key}>
                {key}
              </Badge>
            ))}
          </div>
        );
      },
    },
    { key: 'status', header: 'Trạng thái', render: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (s) => {
        const d = driverByKey[s.driver];
        return (
          <div className="d-flex gap-1 justify-content-end">
            {canManage && d?.capabilities.includes('balance') && (
              <Button size="sm" variant="light" icon="wallet2" title="Số dư"
                loading={busy === s.id} onClick={() => void handleBalance(s)} />
            )}
            {canManage && d?.capabilities.includes('catalog') && (
              <Button size="sm" variant="light" icon="arrow-repeat" title="Đồng bộ catalog"
                loading={busy === s.id} onClick={() => void handleSync(s)} />
            )}
            {canManage && (
              <Button size="sm" variant="light" icon="gear" title="Cấu hình" onClick={() => openEdit(s)} />
            )}
            {can('destroy', 'Supplier') && (
              <Button size="sm" variant="light" icon="trash" className="text-danger"
                onClick={() => setDeleting(s)} />
            )}
          </div>
        );
      },
    },
  ];

  const eventColumns: Column<ProviderWebhookEvent>[] = [
    { key: 'event_id', header: 'Event ID', render: (e) => <span className="fw-semibold">{e.event_id}</span> },
    { key: 'driver', header: 'Driver', render: (e) => e.driver },
    { key: 'event_type', header: 'Loại', render: (e) => e.event_type ?? '-' },
    {
      key: 'livemode',
      header: 'Môi trường',
      render: (e) => (
        <Badge bg={e.livemode ? 'success' : 'secondary'}>{e.livemode ? 'live' : 'test'}</Badge>
      ),
    },
    { key: 'status', header: 'Trạng thái', render: (e) => <StatusBadge status={e.status} /> },
    { key: 'created_at', header: 'Nhận lúc', render: (e) => formatDateTime(e.created_at) },
  ];

  const syncColumns: Column<CatalogSyncRun>[] = [
    { key: 'id', header: '#', render: (r) => <span className="fw-semibold">#{r.id}</span> },
    { key: 'supplier_name', header: 'NCC', render: (r) => r.supplier_name ?? '-' },
    { key: 'mode', header: 'Chế độ', render: (r) => <Badge bg={r.mode === 'scheduled' ? 'info' : r.mode === 'dry_run' ? 'secondary' : 'primary'}>{r.mode}</Badge> },
    { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'total', header: 'Tổng', render: (r) => r.total },
    { key: 'created_count', header: 'Mới', render: (r) => <span className="text-success fw-semibold">{r.created_count}</span> },
    { key: 'updated_count', header: 'Cập nhật', render: (r) => <span className="text-primary fw-semibold">{r.updated_count}</span> },
    { key: 'discontinued_count', header: 'Ngưng', render: (r) => <span className="text-warning fw-semibold">{r.discontinued_count}</span> },
    { key: 'warning_count', header: 'Cảnh báo', render: (r) => <span className={r.warning_count ? 'text-danger fw-semibold' : ''}>{r.warning_count}</span> },
    { key: 'started_at', header: 'Bắt đầu', render: (r) => formatDateTime(r.started_at) },
  ];

  return (
    <>
      <PageHeader
        title="Nhà cung cấp & Tích hợp"
        breadcrumb="Kinh doanh › Tích hợp API"
        infoKey="integrations"
        actions={
          <Button variant="light" icon="arrow-clockwise"
            onClick={() => { void refetchSuppliers(); void refetchEvents(); void refetchSyncRuns(); }}>
            Tải lại
          </Button>
        }
      />

      {toast && <Alert variant={toast.type} onClose={() => setToast(null)} dismissible>{toast.message}</Alert>}

      {canManage && drivers.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          {drivers.map((d) => (
            <Button key={d.key} variant="primary" icon="plus-lg" onClick={() => openCreate(d)}>
              Kết nối {d.label}
            </Button>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={suppliers}
        loading={suppliersLoading}
        empty="Chưa kết nối nhà cung cấp nào."
      />

      <div className="mt-4">
        <h6 className="fw-semibold mb-2">Lịch sử đồng bộ catalog</h6>
        <DataTable
          columns={syncColumns}
          rows={syncRuns}
          loading={syncRunsLoading}
          empty="Chưa có lần đồng bộ catalog nào."
          toolbar={
            <ListToolbar
              search=""
              onSearch={() => undefined}
              status={syncRunsQuery.status}
              onStatus={setSyncRunStatus}
              statusOptions={SYNC_STATUS_OPTIONS}
            />
          }
          footer={<Paginator meta={syncRunsMeta} onChange={setSyncRunPage} />}
        />
      </div>

      {hasWebhookDriver && (
        <div className="mt-4">
          <h6 className="fw-semibold mb-2">Lịch sử webhook</h6>
          <DataTable
            columns={eventColumns}
            rows={events}
            loading={eventsLoading}
            empty="Chưa nhận webhook nào."
            toolbar={
              <ListToolbar
                search={eventsQuery.search}
                onSearch={setEventSearch}
                status={eventsQuery.status}
                onStatus={setEventStatus}
                statusOptions={EVENT_STATUS_OPTIONS}
              />
            }
            footer={<Paginator meta={eventsMeta} onChange={setEventPage} />}
          />
        </div>
      )}

      <ProviderConfigModal
        show={showModal}
        driver={modalDriver}
        editing={editing}
        onClose={() => setShowModal(false)}
        onSaved={() => { void refetchSuppliers(); }}
      />
      <CatalogSyncModal
        show={!!syncSupplier}
        supplier={syncSupplier}
        onClose={() => setSyncSupplier(null)}
        onDone={() => { void refetchSuppliers(); void refetchSyncRuns(); }}
      />
      <ConfirmDialog
        show={!!deleting}
        message={`Xóa kết nối "${deleting?.name}"?`}
        confirmLabel="Xóa"
        onConfirm={async () => {
          if (deleting) await integrationActions.removeSupplier(deleting.id);
          setDeleting(null);
          refetchSuppliers();
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
