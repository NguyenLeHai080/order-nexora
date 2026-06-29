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
    { key: 'cost', header: 'Giá vốn (NCC)', render: (r) => <span className="text-muted">{formatCurrency(r.cost)}</span> },
    {
      key: 'profit',
      header: 'Lợi nhuận',
      render: (r) => {
        const profit = parseFloat(r.profit);
        return <span className={`fw-semibold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(r.profit)}</span>;
      },
    },
  ];

  return (
    <>
      <PageHeader title="Lợi nhuận" breadcrumb="Kinh doanh › Lợi nhuận" />

      {/* Bộ lọc khoảng ngày */}
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

      {/* Thẻ tổng hợp */}
      <Row className="g-3 mb-4">
        <Col md={3} sm={6}>
          <StatCard label="Doanh thu" value={formatCurrency(summary?.revenue ?? 0)} icon="bi-cash-stack" color="info" />
        </Col>
        <Col md={3} sm={6}>
          <StatCard label="Giá vốn (NCC)" value={formatCurrency(summary?.cost ?? 0)} icon="bi-truck" color="secondary" />
        </Col>
        <Col md={3} sm={6}>
          <StatCard label="Lợi nhuận" value={formatCurrency(summary?.profit ?? 0)} icon="bi-graph-up-arrow" color="success" />
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

      <DataTable columns={columns} rows={byProduct} loading={loading} />
    </>
  );
}
