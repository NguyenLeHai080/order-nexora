import { useAuthStore } from '../../../core/authStore';
import { formatCurrency, formatDateTime } from '../../../core/format';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import { Button } from '../../../ui';
import { useDeposits, type Deposit } from '../hooks/usePayments';
import { useDepositStore } from '../store/paymentStore';
import { DEPOSIT_STATUS_OPTIONS } from '../config/paymentConfig';
import { methodLabel } from '../helpers/paymentHelpers';
import ConfirmDepositModal from './ConfirmDepositModal';

// Tab lịch sử nạp tiền + xác nhận thủ công.
export default function DepositsTab() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, refetch } = useDeposits();
  const store = useDepositStore();

  const columns: Column<Deposit>[] = [
    { key: 'reference_code', header: 'Mã tham chiếu', render: (d) => <span className="font-monospace">{d.reference_code}</span> },
    { key: 'amount', header: 'Số tiền', render: (d) => <span className="fw-semibold text-primary">{formatCurrency(d.amount)}</span> },
    { key: 'method', header: 'Phương thức', render: (d) => methodLabel(d.method) },
    { key: 'status', header: 'Trạng thái', render: (d) => <StatusBadge status={d.status} /> },
    { key: 'note', header: 'Ghi chú', render: (d) => d.note ?? '-' },
    { key: 'created_at', header: 'Thời gian', render: (d) => formatDateTime(d.created_at) },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (d) =>
        can('update', 'Payment') && d.status === 'pending' ? (
          <Button size="sm" variant="success" onClick={() => store.askConfirm(d)}>
            Xác nhận
          </Button>
        ) : null,
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
            statusOptions={DEPOSIT_STATUS_OPTIONS}
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />
      <ConfirmDepositModal deposit={store.confirming} onClose={store.cancelConfirm} onSaved={refetch} />
    </>
  );
}
