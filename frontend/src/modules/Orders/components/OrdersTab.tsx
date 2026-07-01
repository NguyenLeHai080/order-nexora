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
import FulfillModal from './FulfillModal';

// Tab danh sách đơn hàng + modal chi tiết.
export default function OrdersTab() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, refetch } = useOrders();
  const store = useOrderStore();
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [markingPaid, setMarkingPaid] = useState<Order | null>(null);
  const [fulfilling, setFulfilling] = useState<Order | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const canUpdate = can('update', 'Order');

  const doRetryProvider = async (o: Order) => {
    setBusyId(o.id);
    try {
      await orderActions.retryProvider(o.id);
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<Order>[] = [
    { key: 'code', header: 'Mã đơn', render: (o) => <span className="fw-semibold">{o.code}</span> },
    {
      key: 'customer',
      header: 'Khách',
      render: (o) =>
        o.user_id ? (
          <span className="text-muted">Tài khoản #{o.user_id}</span>
        ) : (
          <div className="small">
            <div className="fw-semibold">{o.guest_name || 'Khách vãng lai'}</div>
            <div className="text-muted">{o.guest_phone || o.guest_email || ''}</div>
            <span className="badge bg-warning-subtle text-warning">Vãng lai</span>
          </div>
        ),
    },
    { key: 'product_name', header: 'Sản phẩm' },
    { key: 'quantity', header: 'SL', render: (o) => o.quantity },
    { key: 'total_amount', header: 'Tổng tiền', render: (o) => <span className="fw-semibold text-primary">{formatCurrency(o.total_amount)}</span> },
    { key: 'total_cost', header: 'Giá vốn', render: (o) => <span className="text-muted">{formatCurrency(o.total_cost)}</span> },
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
          {canUpdate && o.status === 'awaiting_payment' && (
            <Button size="sm" variant="light" icon="cash-coin" className="text-success" title="Xác nhận đã thanh toán" onClick={() => setMarkingPaid(o)} />
          )}
          {canUpdate && o.status === 'processing' && (
            <>
              <Button
                size="sm"
                variant="light"
                icon="cloud-download"
                title="Lấy hàng nhà cung cấp"
                loading={busyId === o.id}
                disabled={busyId === o.id}
                onClick={() => doRetryProvider(o)}
              />
              <Button size="sm" variant="light" icon="check2-square" className="text-primary" title="Duyệt / giao đơn" onClick={() => setFulfilling(o)} />
            </>
          )}
          {canUpdate && (o.status === 'processing' || o.status === 'success') && (
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
      <FulfillModal order={fulfilling} onClose={() => setFulfilling(null)} onDone={refetch} />
      <ConfirmDialog
        show={!!markingPaid}
        title="Xác nhận đã thanh toán"
        message={`Xác nhận đơn "${markingPaid?.code}" đã nhận được tiền? Đơn sẽ chuyển sang xử lý và ghi nhận doanh thu.`}
        confirmLabel="Xác nhận"
        onConfirm={async () => { if (markingPaid) await orderActions.markPaid(markingPaid.id); refetch(); }}
        onClose={() => setMarkingPaid(null)}
      />
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
