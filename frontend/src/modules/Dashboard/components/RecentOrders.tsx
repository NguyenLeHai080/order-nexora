import { Card } from 'react-bootstrap';
import { formatCurrency } from '../../../core/format';
import StatusBadge from '../../../components/StatusBadge';
import type { OrderRow } from '../hooks/useDashboard';

// Bảng đơn hàng gần đây trên dashboard (chỉ đọc).
export default function RecentOrders({ orders }: { orders: OrderRow[] }) {
  return (
    <Card>
      <Card.Header>Đơn hàng gần đây</Card.Header>
      <Card.Body>
        <div className="table-responsive">
          <table className="table table-card align-middle mb-0">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Sản phẩm</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">Chưa có đơn hàng.</td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td className="fw-semibold">{o.code}</td>
                    <td>{o.product_name}</td>
                    <td>{formatCurrency(o.total_amount)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card.Body>
    </Card>
  );
}
