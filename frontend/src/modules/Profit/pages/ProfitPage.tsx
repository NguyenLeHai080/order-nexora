import { Col, Row } from 'react-bootstrap';
import { formatCurrency, formatNumber } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import StatCard from '../../../components/StatCard';
import { Button, TextInput } from '../../../ui';
import { useProfit, type ProfitByProduct } from '../hooks/useProfit';

export default function ProfitPage() {
  const { range, setRange, summary, byProduct, loading, refetch } = useProfit();

  const columns: Column<ProfitByProduct>[] = [
    { key: 'product_name', header: 'Sản phẩm', render: (r) => <span className="fw-semibold">{r.product_name}</span> },
    { key: 'order_count', header: 'Số đơn', render: (r) => formatNumber(r.order_count) },
    { key: 'revenue', header: 'Doanh thu', render: (r) => formatCurrency(r.revenue) },
    { key: 'cost', header: 'Giá vốn/kho', render: (r) => <span className="text-muted">{formatCurrency(r.cost)}</span> },
    {
      key: 'profit',
      header: 'Lãi',
      render: (r) => {
        const profit = parseFloat(r.profit);
        return <span className={`fw-semibold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(r.profit)}</span>;
      },
    },
  ];

  return (
    <>
      <PageHeader title="Lợi nhuận" breadcrumb="Kinh doanh > Lợi nhuận" infoKey="profit" />

      <Row className="g-2 align-items-end mb-3">
        <Col md={3}>
          <TextInput
            id="profit-from"
            label="Từ ngày"
            type="date"
            value={range.from_date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRange((r) => ({ ...r, from_date: e.target.value }))}
          />
        </Col>
        <Col md={3}>
          <TextInput
            id="profit-to"
            label="Đến ngày"
            type="date"
            value={range.to_date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRange((r) => ({ ...r, to_date: e.target.value }))}
          />
        </Col>
        <Col md={3}>
          <Button variant="primary" icon="funnel" onClick={refetch}>
            Lọc
          </Button>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col md={3} sm={6}>
          <StatCard label="Doanh thu" value={formatCurrency(summary?.revenue ?? 0)} icon="bi-cash-stack" color="info" />
        </Col>
        <Col md={3} sm={6}>
          <StatCard label="Giá vốn/kho" value={formatCurrency(summary?.cost ?? 0)} icon="bi-truck" color="secondary" />
        </Col>
        <Col md={3} sm={6}>
          <StatCard label="Phải trả NCC" value={formatCurrency(summary?.supplier_payable ?? 0)} icon="bi-arrow-left-right" color="warning" />
        </Col>
        <Col md={3} sm={6}>
          <StatCard label="Lãi về ví chủ" value={formatCurrency(summary?.owner_profit ?? summary?.profit ?? 0)} icon="bi-graph-up-arrow" color="success" />
        </Col>
        <Col md={3} sm={6}>
          <StatCard label="Ví chủ hiện có" value={formatCurrency(summary?.owner_wallet_balance ?? 0)} icon="bi-wallet2" color="primary" />
        </Col>
        <Col md={3} sm={6}>
          <StatCard
            label="Biên lợi nhuận"
            value={`${summary?.margin_percent ?? 0}%`}
            icon="bi-percent"
            color="warning"
          />
        </Col>
      </Row>

      <h6 className="fw-semibold text-muted mb-2">
        <i className="bi bi-box-seam me-1" />
        Dòng tiền kho hàng (tiền mặt — gồm cả tiền nhập hàng tồn chưa bán)
      </h6>
      <Row className="g-3 mb-4">
        <Col md={3} sm={6}>
          <StatCard label="Tổng thu (sổ kho)" value={formatCurrency(summary?.ledger_cash_in ?? 0)} icon="bi-arrow-down-circle" color="info" />
        </Col>
        <Col md={3} sm={6}>
          <StatCard label="Tổng chi (sổ kho)" value={formatCurrency(summary?.ledger_cash_out ?? 0)} icon="bi-arrow-up-circle" color="secondary" />
        </Col>
        <Col md={3} sm={6}>
          <StatCard label="Tiền nhập hàng" value={formatCurrency(summary?.stock_in_cost ?? 0)} icon="bi-box-arrow-in-down" color="warning" />
        </Col>
        <Col md={3} sm={6}>
          <StatCard
            label="Dòng tiền ròng"
            value={formatCurrency(summary?.net_cashflow ?? 0)}
            icon="bi-cash-coin"
            color={parseFloat(summary?.net_cashflow ?? '0') >= 0 ? 'success' : 'danger'}
          />
        </Col>
      </Row>

      <DataTable columns={columns} rows={byProduct} loading={loading} />
    </>
  );
}
