import { useState } from 'react';
import { Nav } from 'react-bootstrap';
import PageHeader from '../../../components/PageHeader';
import OverviewTab from '../components/OverviewTab';
import WalletLedgerTab from '../components/WalletLedgerTab';
import CashEntriesTab from '../components/CashEntriesTab';
import WithdrawalsTab from '../components/WithdrawalsTab';
import SupplierDebtTab from '../components/SupplierDebtTab';

type TabKey = 'overview' | 'wallet' | 'cash' | 'withdrawals' | 'debt';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Tổng quan', icon: 'bi-grid-1x2' },
  { key: 'wallet', label: 'Sổ cái ví', icon: 'bi-journal-text' },
  { key: 'cash', label: 'Phiếu thu/chi', icon: 'bi-cash-coin' },
  { key: 'withdrawals', label: 'Rút tiền', icon: 'bi-bank' },
  { key: 'debt', label: 'Công nợ NCC', icon: 'bi-truck' },
];

// Trang Tài chính: gom sổ cái ví, phiếu thu/chi, rút tiền, công nợ NCC vào 1 chỗ.
export default function FinancePage() {
  const [tab, setTab] = useState<TabKey>('overview');

  return (
    <>
      <PageHeader title="Tài chính" breadcrumb="Tài chính › Tổng quan" />
      <Nav variant="tabs" className="mb-3" activeKey={tab} onSelect={(k) => setTab(k as TabKey)}>
        {TABS.map((t) => (
          <Nav.Item key={t.key}>
            <Nav.Link eventKey={t.key}>
              <i className={`bi ${t.icon} me-1`} />
              {t.label}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
      {tab === 'overview' && <OverviewTab />}
      {tab === 'wallet' && <WalletLedgerTab />}
      {tab === 'cash' && <CashEntriesTab />}
      {tab === 'withdrawals' && <WithdrawalsTab />}
      {tab === 'debt' && <SupplierDebtTab />}
    </>
  );
}
