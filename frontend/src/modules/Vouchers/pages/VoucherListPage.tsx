import { useAuthStore } from '../../../core/authStore';
import { formatDateTime } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Button } from '../../../ui';
import VoucherFormModal from '../components/VoucherFormModal';
import { useVouchers, voucherActions, type Voucher } from '../hooks/useVouchers';
import { useVoucherStore } from '../store/voucherStore';
import { VOUCHER_STATUS_OPTIONS } from '../config/voucherConfig';
import { discountLabel } from '../helpers/discount';

export default function VoucherListPage() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, refetch } = useVouchers();
  const store = useVoucherStore();

  const columns: Column<Voucher>[] = [
    { key: 'code', header: 'Mã', render: (v) => <span className="fw-semibold font-monospace">{v.code}</span> },
    { key: 'description', header: 'Mô tả', render: (v) => v.description ?? '-' },
    { key: 'discount', header: 'Giảm', render: (v) => <span className="text-success fw-semibold">{discountLabel(v)}</span> },
    {
      key: 'usage',
      header: 'Đã dùng',
      render: (v) => `${v.used_count}${v.usage_limit > 0 ? ` / ${v.usage_limit}` : ''}`,
    },
    { key: 'ends_at', header: 'Hết hạn', render: (v) => formatDateTime(v.ends_at) },
    { key: 'status', header: 'Trạng thái', render: (v) => <StatusBadge status={v.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (v) => (
        <div className="d-flex gap-1 justify-content-end">
          {can('update', 'Voucher') && (
            <Button size="sm" variant="light" icon="pencil" onClick={() => store.openEdit(v)} />
          )}
          {can('destroy', 'Voucher') && (
            <Button size="sm" variant="light" icon="trash" className="text-danger" onClick={() => store.askDelete(v)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Mã giảm giá"
        breadcrumb="Kinh doanh › Voucher"
        infoKey="vouchers"
        actions={
          can('create', 'Voucher') && (
            <Button variant="primary" icon="plus-lg" onClick={() => store.openCreate()}>
              Thêm voucher
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
            statusOptions={VOUCHER_STATUS_OPTIONS}
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />
      <VoucherFormModal show={store.showForm} editing={store.editing} onClose={store.closeForm} onSaved={refetch} />
      <ConfirmDialog
        show={!!store.deleting}
        message={`Xóa voucher "${store.deleting?.code}"?`}
        confirmLabel="Xóa"
        onConfirm={async () => { if (store.deleting) await voucherActions.remove(store.deleting.id); refetch(); }}
        onClose={store.cancelDelete}
      />
    </>
  );
}
