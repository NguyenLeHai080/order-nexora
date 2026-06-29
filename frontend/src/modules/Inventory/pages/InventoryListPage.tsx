import { useState } from 'react';
import { Nav, Row, Col } from 'react-bootstrap';
import { useAuthStore } from '../../../core/authStore';
import { formatDateTime, formatCurrency } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import StatCard from '../../../components/StatCard';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import { Button } from '../../../ui';
import StockMovementModal from '../components/StockMovementModal';
import {
  useStock,
  useStockMovements,
  useInventorySummary,
  useCashflow,
  type StockRow,
  type StockMovement,
} from '../hooks/useInventory';
import { MOVEMENT_TYPE_OPTIONS, STOCK_STATE_OPTIONS } from '../config/inventoryConfig';

export default function InventoryListPage() {
  const { can } = useAuthStore();
  const { summary, refetchSummary } = useInventorySummary();
  const { cashflow, refetchCashflow } = useCashflow();
  const stock = useStock();
  const movements = useStockMovements();
  const [tab, setTab] = useState<'stock' | 'log'>('stock');
  const [modal, setModal] = useState<{ mode: 'in' | 'adjust'; productId: number | null } | null>(null);

  const canManage = can('store', 'Inventory');

  // DataTable cần field `id` -> map từ product_id.
  type StockTableRow = StockRow & { id: number };
  const stockRows: StockTableRow[] = stock.data.map((r) => ({ ...r, id: r.product_id }));

  function afterSaved() {
    stock.refetch();
    movements.refetch();
    refetchSummary();
    refetchCashflow();
  }

  const stockColumns: Column<StockTableRow>[] = [
    {
      key: 'name',
      header: 'Sản phẩm',
      render: (r) => (
        <div>
          <span className="fw-semibold">{r.name}</span>
          {r.category_name && <small className="d-block text-muted">{r.category_name}</small>}
        </div>
      ),
    },
    {
      key: 'supplier_name',
      header: 'NCC',
      render: (r) => r.supplier_name ?? <span className="text-muted">Thủ công</span>,
    },
    {
      key: 'manages_local',
      header: 'Quản kho',
      render: (r) =>
        r.manages_local ? (
          <span className="badge bg-info-subtle text-info">Kho riêng</span>
        ) : (
          <span className="badge bg-secondary-subtle text-secondary">NCC</span>
        ),
    },
    {
      key: 'quantity',
      header: 'Tồn',
      render: (r) => (
        <div className="d-flex align-items-center gap-2">
          <span className={`fw-semibold ${r.quantity > 0 ? 'text-success' : 'text-danger'}`}>
            {r.quantity}
          </span>
          {r.stock_status === 'out_of_stock' && (
            <span className="badge bg-danger-subtle text-danger">Hết</span>
          )}
          {r.is_low && <span className="badge bg-warning-subtle text-warning">Sắp hết</span>}
        </div>
      ),
    },
    {
      key: 'low_stock_threshold',
      header: 'Ngưỡng',
      render: (r) =>
        r.manages_local && r.low_stock_threshold > 0 ? (
          r.low_stock_threshold
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (r) =>
        canManage && r.manages_local ? (
          <div className="d-flex gap-1 justify-content-end">
            <Button
              size="sm"
              variant="light"
              icon="box-arrow-in-down"
              title="Nhập kho"
              onClick={() => setModal({ mode: 'in', productId: r.product_id })}
            />
            <Button
              size="sm"
              variant="light"
              icon="sliders"
              title="Điều chỉnh"
              onClick={() => setModal({ mode: 'adjust', productId: r.product_id })}
            />
          </div>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  const logColumns: Column<StockMovement>[] = [
    { key: 'created_at', header: 'Thời gian', render: (m) => formatDateTime(m.created_at) },
    { key: 'product_name', header: 'Sản phẩm', render: (m) => <span className="fw-semibold">{m.product_name}</span> },
    { key: 'type', header: 'Loại', render: (m) => <StatusBadge status={m.type} /> },
    {
      key: 'quantity_delta',
      header: 'Thay đổi',
      render: (m) =>
        m.tracks_stock ? (
          <span className={`fw-semibold ${m.quantity_delta >= 0 ? 'text-success' : 'text-danger'}`}>
            {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
          </span>
        ) : (
          <span className="text-muted" title="Tồn do NCC quản lý — chỉ ghi dòng tiền">—</span>
        ),
    },
    {
      key: 'balance_after',
      header: 'Tồn sau',
      render: (m) => (m.tracks_stock ? m.balance_after : <span className="text-muted">—</span>),
    },
    {
      key: 'cash_in',
      header: 'Thu',
      className: 'text-end',
      render: (m) =>
        Number(m.cash_in) > 0 ? (
          <span className="text-success fw-semibold">+{formatCurrency(m.cash_in)}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'cash_out',
      header: 'Chi',
      className: 'text-end',
      render: (m) =>
        Number(m.cash_out) > 0 ? (
          <span className="text-danger fw-semibold">-{formatCurrency(m.cash_out)}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    { key: 'reason', header: 'Lý do', render: (m) => m.reason ?? <span className="text-muted">-</span> },
  ];

  return (
    <>
      <PageHeader
        title="Tồn kho"
        breadcrumb="Quản lý kho hàng › Tồn kho"
        actions={
          canManage && (
            <div className="d-flex gap-2">
              <Button variant="light" icon="sliders" onClick={() => setModal({ mode: 'adjust', productId: null })}>
                Điều chỉnh
              </Button>
              <Button variant="primary" icon="box-arrow-in-down" onClick={() => setModal({ mode: 'in', productId: null })}>
                Nhập kho
              </Button>
            </div>
          )
        }
      />

      {summary && (
        <Row className="g-3 mb-3">
          <Col sm={6} xl={3}><StatCard label="Tổng sản phẩm" value={summary.total} icon="bi-box-seam" color="primary" /></Col>
          <Col sm={6} xl={3}><StatCard label="Còn hàng" value={summary.in_stock} icon="bi-check-circle" color="success" /></Col>
          <Col sm={6} xl={3}><StatCard label="Hết hàng" value={summary.out_of_stock} icon="bi-x-circle" color="danger" /></Col>
          <Col sm={6} xl={3}><StatCard label="Sắp hết" value={summary.low_stock} icon="bi-exclamation-triangle" color="warning" /></Col>
        </Row>
      )}

      <Nav variant="tabs" activeKey={tab} className="mb-3" onSelect={(k) => setTab((k as 'stock' | 'log') ?? 'stock')}>
        <Nav.Item>
          <Nav.Link eventKey="stock">Tồn kho hiện tại</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="log">Sổ kho</Nav.Link>
        </Nav.Item>
      </Nav>

      {tab === 'stock' ? (
        <DataTable
          columns={stockColumns}
          rows={stockRows}
          loading={stock.loading}
          empty="Chưa có sản phẩm nào."
          toolbar={
            <ListToolbar
              search={stock.query.search}
              onSearch={stock.setSearch}
              status={(stock.query.state as string) ?? ''}
              onStatus={(v) => stock.patchQuery({ state: v || undefined })}
              statusOptions={STOCK_STATE_OPTIONS}
            />
          }
          footer={<Paginator meta={stock.meta} onChange={stock.setPage} />}
        />
      ) : (
        <>
          {cashflow && (
            <Row className="g-3 mb-3">
              <Col sm={6} xl={3}><StatCard label="Tổng thu" value={formatCurrency(cashflow.cash_in)} icon="bi-arrow-down-circle" color="success" /></Col>
              <Col sm={6} xl={3}><StatCard label="Tổng chi" value={formatCurrency(cashflow.cash_out)} icon="bi-arrow-up-circle" color="danger" /></Col>
              <Col sm={6} xl={3}><StatCard label="Lợi nhuận" value={formatCurrency(cashflow.profit)} icon="bi-graph-up-arrow" color={Number(cashflow.profit) >= 0 ? 'primary' : 'danger'} /></Col>
              <Col sm={6} xl={3}><StatCard label="Chi nhập kho" value={formatCurrency(cashflow.stock_in_cost)} icon="bi-box-arrow-in-down" color="info" /></Col>
            </Row>
          )}
          <DataTable
            columns={logColumns}
            rows={movements.data}
            loading={movements.loading}
            empty="Chưa có biến động kho nào."
            toolbar={
              <ListToolbar
                search={movements.query.search}
                onSearch={movements.setSearch}
                status={(movements.query.type as string) ?? ''}
                onStatus={(v) => movements.patchQuery({ type: v || undefined })}
                statusOptions={MOVEMENT_TYPE_OPTIONS}
              />
            }
            footer={<Paginator meta={movements.meta} onChange={movements.setPage} />}
          />
        </>
      )}

      <StockMovementModal
        show={modal !== null}
        mode={modal?.mode ?? 'in'}
        presetProductId={modal?.productId}
        onClose={() => setModal(null)}
        onSaved={afterSaved}
      />
    </>
  );
}
