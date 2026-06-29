import { useState } from 'react';
import { useAuthStore } from '../../../core/authStore';
import { useOrders, orderActions, type Order } from '../hooks/useOrders';
import { useOrderStore } from '../store/orderStore';
import { ORDER_STATUS_OPTIONS } from '../config/orderConfig';
import { formatCurrency, formatDateTime } from '../../../core/format';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Button } from '../../../ui';
import OrderDetailModal from './OrderDetailModal';

// Tab danh sách đơn hàng + modal chi tiết.
export default function OrdersTab() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, refetch } = useOrders();
  const store = useOrderStore();
  const [cancelling, setCancelling] = useState<Order | null>(null);

  const canCancel = can('update', 'Order');

  const columns: Column<Order>[] = [
    { key: 'code', header: 'Mã đơn', render: (o) => <span className="fw-semibold">{o.code}</span> },
    { key: 'product_name', header: 'Sản phẩm' },
    { key: 'quantity', header: 'SL', render: (o) => o.quantity },
    { key: 'total_amount', header: 'Tổng tiền', render: (o) => <span className="fw-semibold text-primary">{formatCurrency(o.total_amount)}</span> },
    { key: 'total_cost', header: 'Giá vốn', render: (o) => <span className="text-muted">{formatCurrency(o.total_cost)}</span> },
    { key: 'supplier_payable', header: 'Trả NCC', render: (o) => <span className="text-muted">{formatCurrency(o.supplier_payable)}</span> },
    { key: 'owner_profit', header: 'Lãi ví chủ', render: (o) => <span className="fw-semibold text-success">{formatCurrency(o.owner_profit)}</span> },
    { key: 'status', header: 'Trạng thái', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'created_at', header: 'Thời gian', render: (o) => formatDateTime(o.created_at) },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (o) => (
        <div className="d-flex gap-1 justify-content-end">
          <Button size="sm" variant="light" icon="eye" onClick={() => store.openDetail(o)} />
          {canCancel && (o.status === 'processing' || o.status === 'success') && (
            <Button size="sm" variant="light" icon="x-circle" className="text-danger" title="Hủy đơn" onClick={() => setCancelling(o)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
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
            statusOptions={ORDER_STATUS_OPTIONS}
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />
      <OrderDetailModal order={store.detail} onClose={store.closeDetail} />
      <ConfirmDialog
        show={!!cancelling}
        title="Hủy đơn hàng"
        message={`Hủy đơn "${cancelling?.code}"? Tiền sẽ được hoàn vào ví và tồn kho được khôi phục (nếu là sản phẩm tự quản kho).`}
        confirmLabel="Hủy đơn"
        onConfirm={async () => { if (cancelling) await orderActions.cancel(cancelling.id); refetch(); }}
        onClose={() => setCancelling(null)}
      />
    </>
  );
}
