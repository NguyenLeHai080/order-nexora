import { Badge } from 'react-bootstrap';
import { formatCurrency, formatDateTime } from '../../../core/format';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import { useWalletLedger, type WalletTxn } from '../hooks/useFinance';
import { WALLET_TYPE_COLOR, WALLET_TYPE_LABELS, WALLET_TYPE_OPTIONS } from '../config/financeConfig';

// Sổ cái ví: mọi biến động số dư (nạp/mua/hoàn/lãi chủ/rút/điều chỉnh) kèm balance_after.
export default function WalletLedgerTab() {
  const { data, meta, loading, query, setPage, setSearch, patchQuery } = useWalletLedger();

  const columns: Column<WalletTxn>[] = [
    { key: 'created_at', header: 'Thời gian', render: (t) => formatDateTime(t.created_at) },
    { key: 'user_id', header: 'User', render: (t) => <span className="font-monospace">#{t.user_id}</span> },
    {
      key: 'type',
      header: 'Loại',
      render: (t) => (
        <Badge bg={`${WALLET_TYPE_COLOR[t.type] ?? 'secondary'}-subtle`} className={`text-${WALLET_TYPE_COLOR[t.type] ?? 'secondary'} fw-medium`}>
          {WALLET_TYPE_LABELS[t.type] ?? t.type}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Số tiền',
      className: 'text-end',
      render: (t) => (
        <span className={`fw-semibold ${t.direction === 'in' ? 'text-success' : 'text-danger'}`}>
          {t.direction === 'in' ? '+' : '−'}
          {formatCurrency(t.amount)}
        </span>
      ),
    },
    {
      key: 'balance_after',
      header: 'Số dư sau',
      className: 'text-end',
      render: (t) => <span className="font-monospace">{formatCurrency(t.balance_after)}</span>,
    },
    {
      key: 'ref',
      header: 'Tham chiếu',
      render: (t) => (t.ref_type ? <span className="small text-muted">{t.ref_type} #{t.ref_id ?? '-'}</span> : '-'),
    },
    { key: 'note', header: 'Ghi chú', render: (t) => t.note ?? '-' },
  ];

  return (
    <DataTable
      columns={columns}
      rows={data}
      loading={loading}
      empty="Chưa có giao dịch ví nào."
      toolbar={
        <ListToolbar
          search={query.search}
          onSearch={setSearch}
          status={(query.type as string) ?? ''}
          onStatus={(v) => patchQuery({ type: v })}
          statusOptions={WALLET_TYPE_OPTIONS}
        />
      }
      footer={<Paginator meta={meta} onChange={setPage} />}
    />
  );
}
