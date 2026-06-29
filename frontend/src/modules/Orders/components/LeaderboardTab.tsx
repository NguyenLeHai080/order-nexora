import { Badge } from 'react-bootstrap';
import { useLeaderboard } from '../hooks/useOrders';
import { withRanks, rankLabel, type LeaderRow } from '../helpers/leaderboard';
import { formatCurrency } from '../../../core/format';
import DataTable, { type Column } from '../../../components/DataTable';

// Tab bảng xếp hạng khách hàng theo chi tiêu.
export default function LeaderboardTab() {
  const { leaders, loading } = useLeaderboard(20);
  const rows = withRanks(leaders);

  const columns: Column<LeaderRow>[] = [
    {
      key: 'rank',
      header: '#',
      width: 60,
      render: (l) => <span className="fs-5">{rankLabel(l._rank)}</span>,
    },
    { key: 'user_name', header: 'Khách hàng', render: (l) => <span className="fw-semibold">{l.user_name}</span> },
    { key: 'order_count', header: 'Số đơn', render: (l) => <Badge bg="info-subtle" className="text-info">{l.order_count}</Badge> },
    { key: 'total_spent', header: 'Tổng chi tiêu', render: (l) => <span className="fw-semibold text-success">{formatCurrency(l.total_spent)}</span> },
  ];

  return (
    <DataTable columns={columns} rows={rows} loading={loading} empty="Chưa có dữ liệu xếp hạng."
      toolbar={<span className="fw-semibold">Top khách hàng theo chi tiêu</span>} />
  );
}
