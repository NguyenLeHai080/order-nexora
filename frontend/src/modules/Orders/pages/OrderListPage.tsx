import { useState } from 'react';
import { Nav } from 'react-bootstrap';
import PageHeader from '../../../components/PageHeader';
import OrdersTab from '../components/OrdersTab';
import LeaderboardTab from '../components/LeaderboardTab';

export default function OrderListPage() {
  const [tab, setTab] = useState<'orders' | 'leaderboard'>('orders');
  return (
    <>
      <PageHeader title="Đơn hàng" breadcrumb="Kinh doanh › Đơn hàng" />
      <Nav variant="tabs" className="mb-3" activeKey={tab} onSelect={(k) => setTab(k as typeof tab)}>
        <Nav.Item>
          <Nav.Link eventKey="orders">
            <i className="bi bi-bag-check me-1" />
            Danh sách đơn
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="leaderboard">
            <i className="bi bi-trophy me-1" />
            Bảng xếp hạng
          </Nav.Link>
        </Nav.Item>
      </Nav>
      {tab === 'orders' ? <OrdersTab /> : <LeaderboardTab />}
    </>
  );
}
