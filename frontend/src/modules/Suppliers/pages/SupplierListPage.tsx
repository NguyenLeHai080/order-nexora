import { useAuthStore } from '../../../core/authStore';
import { formatDateTime } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Button } from '../../../ui';
import SupplierFormModal from '../components/SupplierFormModal';
import { useSuppliers, supplierActions, type Supplier } from '../hooks/useSuppliers';
import { useSupplierStore } from '../store/supplierStore';
import { SUPPLIER_STATUS_OPTIONS } from '../config/supplierConfig';

export default function SupplierListPage() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, refetch } = useSuppliers();
  const store = useSupplierStore();

  const columns: Column<Supplier>[] = [
    { key: 'name', header: 'Nhà cung cấp', render: (s) => <span className="fw-semibold">{s.name}</span> },
    { key: 'api_endpoint', header: 'API Endpoint', render: (s) => s.api_endpoint ?? <span className="text-muted">-</span> },
    { key: 'note', header: 'Ghi chú', render: (s) => s.note ?? '-' },
    { key: 'status', header: 'Trạng thái', render: (s) => <StatusBadge status={s.status} /> },
    { key: 'created_at', header: 'Ngày tạo', render: (s) => formatDateTime(s.created_at) },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (s) => (
        <div className="d-flex gap-1 justify-content-end">
          {can('update', 'Supplier') && (
            <Button size="sm" variant="light" icon="pencil" onClick={() => store.openEdit(s)} />
          )}
          {can('destroy', 'Supplier') && (
            <Button size="sm" variant="light" icon="trash" className="text-danger" onClick={() => store.askDelete(s)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Nhà cung cấp"
        breadcrumb="Kinh doanh › Nhà cung cấp"
        infoKey="suppliers"
        actions={
          can('create', 'Supplier') && (
            <Button variant="primary" icon="plus-lg" onClick={() => store.openCreate()}>
              Thêm nhà cung cấp
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        toolbar={
          <ListToolbar
            search={query.search}
            onSearch={setSearch}
            status={query.status}
            onStatus={setStatus}
            statusOptions={SUPPLIER_STATUS_OPTIONS}
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />

      <SupplierFormModal show={store.showForm} editing={store.editing} onClose={store.closeForm} onSaved={refetch} />
      <ConfirmDialog
        show={!!store.deleting}
        message={`Xóa nhà cung cấp "${store.deleting?.name}"?`}
        confirmLabel="Xóa"
        onConfirm={async () => { if (store.deleting) await supplierActions.remove(store.deleting.id); refetch(); }}
        onClose={store.cancelDelete}
      />
    </>
  );
}
