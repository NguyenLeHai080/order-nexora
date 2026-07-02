import { useState } from 'react';
import { useAuthStore } from '../../../core/authStore';
import { formatCurrency, formatDateTime } from '../../../core/format';
import { extractError } from '../../../core/useList';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import { Button } from '../../../ui';
import { financeActions, useWithdrawals, type Withdrawal } from '../hooks/useFinance';
import { WITHDRAWAL_STATUS_OPTIONS } from '../config/financeConfig';
import WithdrawalCreateModal from './WithdrawalCreateModal';

// Rút tiền: danh sách yêu cầu + duyệt&chi / từ chối. Duyệt sẽ trừ ví qua sổ cái.
export default function WithdrawalsTab() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, refetch } = useWithdrawals();
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canManage = can('update', 'Finance');

  async function handlePay(wr: Withdrawal) {
    if (!window.confirm(`Duyệt & chi ${formatCurrency(wr.amount)} cho user #${wr.user_id}? Số dư ví sẽ bị trừ.`)) return;
    setBusyId(wr.id);
    setErr(null);
    try {
      await financeActions.payWithdrawal(wr.id);
      await refetch();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(wr: Withdrawal) {
    const note = window.prompt('Lý do từ chối (tùy chọn):', '');
    if (note === null) return;
    setBusyId(wr.id);
    setErr(null);
    try {
      await financeActions.rejectWithdrawal(wr.id, { note: note.trim() || null });
      await refetch();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<Withdrawal>[] = [
    { key: 'created_at', header: 'Thời gian', render: (w) => formatDateTime(w.created_at) },
    { key: 'user_id', header: 'User', render: (w) => <span className="font-monospace">#{w.user_id}</span> },
    {
      key: 'amount',
      header: 'Số tiền',
      className: 'text-end',
      render: (w) => <span className="fw-semibold text-primary">{formatCurrency(w.amount)}</span>,
    },
    { key: 'bank_info', header: 'Ngân hàng', render: (w) => w.bank_info ?? '-' },
    { key: 'status', header: 'Trạng thái', render: (w) => <StatusBadge status={w.status} /> },
    { key: 'note', header: 'Ghi chú', render: (w) => w.note ?? '-' },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (w) =>
        canManage && w.status === 'pending' ? (
          <div className="d-flex gap-1 justify-content-end">
            <Button size="sm" variant="success" loading={busyId === w.id} onClick={() => handlePay(w)}>
              Duyệt & chi
            </Button>
            <Button size="sm" variant="light" disabled={busyId === w.id} onClick={() => handleReject(w)}>
              Từ chối
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      {err && <div className="alert alert-danger">{err}</div>}
      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        empty="Chưa có yêu cầu rút tiền nào."
        toolbar={
          <ListToolbar
            search={query.search}
            onSearch={setSearch}
            status={query.status}
            onStatus={setStatus}
            statusOptions={WITHDRAWAL_STATUS_OPTIONS}
            right={
              canManage ? (
                <Button variant="primary" icon="plus-lg" onClick={() => setShowCreate(true)}>
                  Tạo yêu cầu
                </Button>
              ) : undefined
            }
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />
      <WithdrawalCreateModal show={showCreate} onClose={() => setShowCreate(false)} onSaved={refetch} />
    </>
  );
}
