import { useState } from 'react';
import { Nav } from 'react-bootstrap';
import PageHeader from '../../../components/PageHeader';
import BanksTab from '../components/BanksTab';
import DepositsTab from '../components/DepositsTab';

export default function PaymentPage() {
  const [tab, setTab] = useState<'banks' | 'deposits'>('banks');
  return (
    <>
      <PageHeader title="Thanh toán & Nạp tiền" breadcrumb="Tài chính › Thanh toán" />
      <Nav variant="tabs" className="mb-3" activeKey={tab} onSelect={(k) => setTab(k as typeof tab)}>
        <Nav.Item>
          <Nav.Link eventKey="banks">
            <i className="bi bi-bank me-1" />
            Ngân hàng nhận tiền
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="deposits">
            <i className="bi bi-cash-coin me-1" />
            Lịch sử nạp tiền
          </Nav.Link>
        </Nav.Item>
      </Nav>
      {tab === 'banks' ? <BanksTab /> : <DepositsTab />}
    </>
  );
}
