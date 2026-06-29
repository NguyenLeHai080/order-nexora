import { useState } from 'react';
import { useAuthStore } from '../../../core/authStore';
import { formatCurrency, formatDateTime } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Button } from '../../../ui';
import ReturnCreateModal from '../components/ReturnCreateModal';
import { useReturns, returnActions, type ReturnRequest } from '../hooks/useReturns';
import { RETURN_STATUS_OPTIONS } from '../config/returnConfig';

export default function ReturnListPage() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, refetch } = useReturns();
  const [creating, setCreating] = useState(false);
  const [approving, setApproving] = useState<ReturnRequest | null>(null);
  const [rejecting, setRejecting] = useState<ReturnRequest | null>(null);
  const [completing, setCompleting] = useState<ReturnRequest | null>(null);

  const canManage = can('update', 'Return');

  const columns: Column<ReturnRequest>[] = [
    { key: 'code', header: 'Mã YC', render: (r) => <span className="fw-semibold">{r.code}</span> },
    { key: 'kind', header: 'Loại', render: (r) => (r.kind === 'exchange' ? 'Đổi hàng' : 'Trả hàng') },
    { key: 'reason', header: 'Lý do', render: (r) => r.reason ?? <span className="text-muted">-</span> },
    { key: 'refund_amount', header: 'Hoàn tiền', render: (r) => formatCurrency(r.refund_amount) },
    { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created_at', header: 'Thời gian', render: (r) => formatDateTime(r.created_at) },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (r) => (
        <div className="d-flex gap-1 justify-content-end">
          {canManage && r.status === 'requested' && (
            <>
              <Button size="sm" variant="light" icon="check-lg" className="text-success" title="Duyệt" onClick={() => setApproving(r)} />
              <Button size="sm" variant="light" icon="x-lg" className="text-danger" title="Từ chối" onClick={() => setRejecting(r)} />
            </>
          )}
          {canManage && r.status === 'approved' && (
            <Button size="sm" variant="primary" icon="check2-all" title="Hoàn tất" onClick={() => setCompleting(r)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Đổi/Trả hàng"
        breadcrumb="Bán hàng › Đổi/Trả hàng"
        actions={
          <Button variant="primary" icon="plus-lg" onClick={() => setCreating(true)}>
            Tạo yêu cầu
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        empty="Chưa có yêu cầu đổi/trả nào."
        toolbar={
          <ListToolbar
            search={query.search}
            onSearch={setSearch}
            status={query.status}
            onStatus={setStatus}
            statusOptions={RETURN_STATUS_OPTIONS}
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />

      <ReturnCreateModal show={creating} onClose={() => setCreating(false)} onSaved={refetch} />

      <ConfirmDialog
        show={!!approving}
        title="Duyệt yêu cầu"
        message={`Duyệt yêu cầu "${approving?.code}"?`}
        confirmLabel="Duyệt"
        variant="success"
        onConfirm={async () => { if (approving) await returnActions.approve(approving.id); refetch(); }}
        onClose={() => setApproving(null)}
      />
      <ConfirmDialog
        show={!!rejecting}
        title="Từ chối yêu cầu"
        message={`Từ chối yêu cầu "${rejecting?.code}"?`}
        confirmLabel="Từ chối"
        onConfirm={async () => { if (rejecting) await returnActions.reject(rejecting.id); refetch(); }}
        onClose={() => setRejecting(null)}
      />
      <ConfirmDialog
        show={!!completing}
        title="Hoàn tất yêu cầu"
        message={`Hoàn tất yêu cầu "${completing?.code}"? Hệ thống sẽ hoàn tiền/đổi sản phẩm và cập nhật kho.`}
        confirmLabel="Hoàn tất"
        variant="primary"
        onConfirm={async () => { if (completing) await returnActions.complete(completing.id); refetch(); }}
        onClose={() => setCompleting(null)}
      />
    </>
  );
}
