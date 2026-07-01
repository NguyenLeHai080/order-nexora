import { useState } from 'react';
import { useAuthStore } from '../../../core/authStore';
import { formatDateTime } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Button } from '../../../ui';
import WarrantyClaimModal from '../components/WarrantyClaimModal';
import { useWarranties, warrantyActions, type Warranty } from '../hooks/useWarranties';
import { WARRANTY_STATUS_OPTIONS } from '../config/warrantyConfig';

export default function WarrantyListPage() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, refetch } = useWarranties();
  const [claiming, setClaiming] = useState<Warranty | null>(null);
  const [voiding, setVoiding] = useState<Warranty | null>(null);

  const columns: Column<Warranty>[] = [
    { key: 'code', header: 'Mã BH', render: (w) => <span className="fw-semibold">{w.code}</span> },
    { key: 'product_name', header: 'Sản phẩm' },
    { key: 'starts_at', header: 'Bắt đầu', render: (w) => formatDateTime(w.starts_at) },
    { key: 'ends_at', header: 'Kết thúc', render: (w) => formatDateTime(w.ends_at) },
    {
      key: 'remaining',
      header: 'Còn lại',
      render: (w) => {
        const expired = w.status === 'expired' || (w.status === 'active' && w.remaining_days <= 0);
        const cls = expired ? 'text-danger' : w.status === 'active' ? 'text-success' : 'text-muted';
        return <span className={`fw-semibold ${cls}`}>{w.remaining_label}</span>;
      },
    },
    { key: 'status', header: 'Trạng thái', render: (w) => <StatusBadge status={w.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (w) => (
        <div className="d-flex gap-1 justify-content-end">
          {can('update', 'Warrantie') && w.status === 'active' && (
            <Button size="sm" variant="light" icon="wrench-adjustable" title="Ghi nhận bảo hành" onClick={() => setClaiming(w)} />
          )}
          {can('update', 'Warrantie') && (w.status === 'active' || w.status === 'expired') && (
            <Button size="sm" variant="light" icon="x-circle" className="text-danger" title="Vô hiệu" onClick={() => setVoiding(w)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Bảo hành" breadcrumb="Bán hàng › Bảo hành" infoKey="warranties" />

      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        empty="Chưa có phiếu bảo hành nào."
        toolbar={
          <ListToolbar
            search={query.search}
            onSearch={setSearch}
            status={query.status}
            onStatus={setStatus}
            statusOptions={WARRANTY_STATUS_OPTIONS}
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />

      <WarrantyClaimModal warranty={claiming} onClose={() => setClaiming(null)} onSaved={refetch} />
      <ConfirmDialog
        show={!!voiding}
        title="Vô hiệu phiếu bảo hành"
        message={`Vô hiệu phiếu "${voiding?.code}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Vô hiệu"
        onConfirm={async () => { if (voiding) await warrantyActions.void(voiding.id); refetch(); }}
        onClose={() => setVoiding(null)}
      />
    </>
  );
}
