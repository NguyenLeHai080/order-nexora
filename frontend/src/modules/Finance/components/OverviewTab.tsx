import { Col, Row } from 'react-bootstrap';
import { formatCurrency } from '../../../core/format';
import StatCard from '../../../components/StatCard';
import { Loader } from '../../../ui';
import { useFinanceOverview } from '../hooks/useFinance';

// Tổng quan tài chính: ví chủ, thu/chi thủ công, rút chờ duyệt, công nợ NCC, tổng ví hệ thống.
export default function OverviewTab() {
  const { data, loading } = useFinanceOverview();

  if (loading) {
    return <div className="text-center py-5"><Loader /></div>;
  }
  if (!data) {
    return <p className="text-muted">Chưa có dữ liệu tổng quan.</p>;
  }

  return (
    <Row className="g-3">
      <Col md={6} xl={4}>
        <StatCard
          label="Ví lợi nhuận chủ"
          value={data.owner_wallet_balance != null ? formatCurrency(data.owner_wallet_balance) : '—'}
          icon="bi-wallet2"
          color="info"
        />
      </Col>
      <Col md={6} xl={4}>
        <StatCard
          label="Tổng số dư ví toàn hệ thống"
          value={formatCurrency(data.total_wallet_balance)}
          icon="bi-cash-stack"
          color="primary"
        />
      </Col>
      <Col md={6} xl={4}>
        <StatCard
          label="Rút tiền chờ duyệt"
          value={`${formatCurrency(data.withdrawal_pending_amount)} · ${data.withdrawal_pending_count} yêu cầu`}
          icon="bi-hourglass-split"
          color="warning"
        />
      </Col>
      <Col md={6} xl={4}>
        <StatCard
          label="Thu thủ công (phiếu thu)"
          value={formatCurrency(data.cash_income)}
          icon="bi-box-arrow-in-down"
          color="success"
        />
      </Col>
      <Col md={6} xl={4}>
        <StatCard
          label="Chi thủ công (phiếu chi)"
          value={formatCurrency(data.cash_expense)}
          icon="bi-box-arrow-up"
          color="danger"
        />
      </Col>
      <Col md={6} xl={4}>
        <StatCard
          label="Thu/chi ròng"
          value={formatCurrency(data.cash_net)}
          icon="bi-calculator"
          color={parseFloat(data.cash_net) >= 0 ? 'success' : 'danger'}
        />
      </Col>
      <Col md={6} xl={4}>
        <StatCard
          label="Công nợ phải trả NCC"
          value={formatCurrency(data.supplier_outstanding)}
          icon="bi-truck"
          color="secondary"
        />
      </Col>
    </Row>
  );
}
