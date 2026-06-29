import { Card, Col, Row } from 'react-bootstrap';
import ReactApexChart from 'react-apexcharts';
import { useAuthStore } from '../../../core/authStore';
import { formatCurrency, formatNumber } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import StatCard from '../../../components/StatCard';
import { Loader } from '../../../ui';
import { useDashboard } from '../hooks/useDashboard';
import { buildBarChart, buildDonutChart } from '../helpers/charts';
import RecentOrders from '../components/RecentOrders';

export default function DashboardPage() {
  const { can } = useAuthStore();
  const { loading, userStats, orderTotal, productTotal, revenue, leaders, recent } = useDashboard();

  if (loading) {
    return <div className="text-center py-5"><Loader /></div>;
  }

  const bar = buildBarChart(leaders);
  const donut = buildDonutChart(userStats);

  return (
    <>
      <PageHeader title="Dashboard" breadcrumb="Tổng quan" />

      <Row className="g-3 mb-3">
        <Col md={6} xl={3}>
          <StatCard label="Người dùng" value={formatNumber(userStats?.total ?? 0)} icon="bi-people" color="primary" />
        </Col>
        <Col md={6} xl={3}>
          <StatCard label="Sản phẩm" value={formatNumber(productTotal)} icon="bi-box-seam" color="info" />
        </Col>
        <Col md={6} xl={3}>
          <StatCard label="Đơn thành công" value={formatNumber(orderTotal)} icon="bi-bag-check" color="success" />
        </Col>
        <Col md={6} xl={3}>
          <StatCard label="Doanh thu (gần đây)" value={formatCurrency(revenue)} icon="bi-cash-stack" color="warning" />
        </Col>
      </Row>

      <Row className="g-3">
        <Col xl={8}>
          <Card className="h-100">
            <Card.Header>Bảng xếp hạng chi tiêu</Card.Header>
            <Card.Body>
              {leaders.length > 0 ? (
                <ReactApexChart options={bar.options} series={bar.series} type="bar" height={320} />
              ) : (
                <p className="text-muted text-center py-5 mb-0">Chưa có dữ liệu đơn hàng.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col xl={4}>
          <Card className="h-100">
            <Card.Header>Trạng thái tài khoản</Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center">
              {donut.series.length > 0 && donut.series.some((v) => v > 0) ? (
                <ReactApexChart options={donut.options} series={donut.series} type="donut" height={300} />
              ) : (
                <p className="text-muted mb-0">Chưa có dữ liệu.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {can('index', 'Order') && (
        <Row className="g-3 mt-1">
          <Col xs={12}>
            <RecentOrders orders={recent} />
          </Col>
        </Row>
      )}
    </>
  );
}
