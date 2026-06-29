import { useEffect, useState } from 'react';
import { Nav } from 'react-bootstrap';
import { apiClient } from '../../../core/apiClient';
import { useAuthStore } from '../../../core/authStore';
import { formatCurrency, formatNumber } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Button } from '../../../ui';
import ProductFormModal, { type SupplierOpt } from '../components/ProductFormModal';
import PriceCalculatorModal from '../components/PriceCalculatorModal';
import { useProducts, productActions, type Product } from '../hooks/useProducts';
import { useProductStore } from '../store/productStore';
import { computeUnitProfit, computeMargin } from '../helpers/pricing';
import { PRODUCT_STATUS_OPTIONS, DELIVERY_TYPE_LABELS } from '../config/productConfig';

// Nhà cung cấp có driver vdstore (mới đồng bộ được catalog).
interface VdSupplier extends SupplierOpt {
  driver?: string;
}

export default function ProductListPage() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, patchQuery, refetch } = useProducts();
  const store = useProductStore();
  const [suppliers, setSuppliers] = useState<VdSupplier[]>([]);
  const [activeSupplier, setActiveSupplier] = useState<string>('all');
  const [calcProduct, setCalcProduct] = useState<Product | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Nạp danh sách nhà cung cấp để chọn trong form (nếu có quyền).
  useEffect(() => {
    if (!can('index', 'Supplier')) return;
    apiClient
      .get('/suppliers', { params: { limit: 100 } })
      .then((r) => setSuppliers(r.data.data ?? []))
      .catch(() => {});
  }, [can]);

  const vdSuppliers = suppliers.filter((s) => s.driver === 'vdstore');

  // Đổi tab NCC -> set filter supplier_id (tab "all" = bỏ lọc).
  function handleSupplierTab(key: string) {
    setActiveSupplier(key);
    patchQuery({ supplier_id: key === 'all' ? undefined : Number(key) });
  }

  // Đồng bộ catalog từ tất cả NCC vdstore.
  async function handleSync() {
    if (vdSuppliers.length === 0) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      let created = 0;
      let updated = 0;
      for (const s of vdSuppliers) {
        const r = await productActions.syncCatalog(s.id);
        created += r.data.data?.created ?? 0;
        updated += r.data.data?.updated ?? 0;
      }
      setSyncMsg(`Đồng bộ xong: ${created} mới, ${updated} cập nhật.`);
      refetch();
    } catch {
      setSyncMsg('Đồng bộ thất bại. Kiểm tra cấu hình nhà cung cấp.');
    } finally {
      setSyncing(false);
    }
  }

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Sản phẩm',
      render: (p) => (
        <div>
          <span className="fw-semibold">{p.name}</span>
          {p.category_name && <small className="d-block text-muted">{p.category_name}</small>}
        </div>
      ),
    },
    { key: 'base_price', header: 'Giá NCC (vốn)', render: (p) => formatCurrency(p.base_price) },
    {
      key: 'markup',
      header: 'Markup',
      render: (p) => (
        <small className="text-muted">
          +{formatNumber(p.markup_percent)}% {parseFloat(p.markup_amount) > 0 && `+ ${formatCurrency(p.markup_amount)}`}
        </small>
      ),
    },
    { key: 'sale_price', header: 'Giá bán', render: (p) => <span className="fw-semibold text-primary">{formatCurrency(p.sale_price)}</span> },
    {
      key: 'supplier_name',
      header: 'NCC',
      render: (p) => p.supplier_name ?? <span className="text-muted">Thủ công</span>,
    },
    {
      key: 'delivery_type',
      header: 'Kiểu giao',
      render: (p) =>
        p.delivery_type ? (
          <small className="text-muted">{DELIVERY_TYPE_LABELS[p.delivery_type] ?? p.delivery_type}</small>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'profit',
      header: 'Lợi nhuận/đơn',
      render: (p) => {
        const profit = computeUnitProfit(p.base_price, p.markup_percent, p.markup_amount);
        const margin = computeMargin(p.base_price, p.markup_percent, p.markup_amount);
        const atLoss = profit < 0;
        const breakEven = profit === 0;
        return (
          <div>
            <span className={`fw-semibold ${atLoss ? 'text-danger' : breakEven ? 'text-warning' : 'text-success'}`}>
              {formatCurrency(profit)}
            </span>
            {atLoss ? (
              <small className="d-block text-danger">
                <i className="bi bi-exclamation-triangle-fill me-1" />
                Bán lỗ
              </small>
            ) : breakEven ? (
              <small className="d-block text-warning">
                <i className="bi bi-exclamation-circle me-1" />
                Hòa vốn (chưa đặt giá)
              </small>
            ) : (
              <small className="d-block text-muted">Biên {formatNumber(margin)}%</small>
            )}
          </div>
        );
      },
    },
    { key: 'sold_count', header: 'Đã bán', render: (p) => formatNumber(p.sold_count) },
    {
      key: 'quantity',
      header: 'Tồn kho',
      render: (p) => (
        <span className={`fw-semibold ${p.quantity > 0 ? 'text-success' : 'text-danger'}`}>
          {formatNumber(p.quantity)}
        </span>
      ),
    },
    { key: 'stock_status', header: 'Kho', render: (p) => <StatusBadge status={p.stock_status} /> },
    { key: 'status', header: 'Trạng thái', render: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (p) => (
        <div className="d-flex gap-1 justify-content-end">
          {can('update', 'Product') && (
            <Button size="sm" variant="light" icon="calculator" title="Tính giá bán" onClick={() => setCalcProduct(p)} />
          )}
          {can('update', 'Product') && (
            <Button size="sm" variant="light" icon="pencil" onClick={() => store.openEdit(p)} />
          )}
          {can('destroy', 'Product') && (
            <Button size="sm" variant="light" icon="trash" className="text-danger" onClick={() => store.askDelete(p)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Sản phẩm"
        breadcrumb="Kinh doanh › Sản phẩm"
        actions={
          <div className="d-flex gap-2">
            {can('update', 'Product') && vdSuppliers.length > 0 && (
              <Button variant="light" icon="arrow-repeat" loading={syncing} onClick={handleSync}>
                Đồng bộ NCC
              </Button>
            )}
            {can('create', 'Product') && (
              <Button variant="primary" icon="plus-lg" onClick={() => store.openCreate()}>
                Thêm sản phẩm
              </Button>
            )}
          </div>
        }
      />

      {syncMsg && <div className="alert alert-info">{syncMsg}</div>}

      {suppliers.length > 0 && (
        <Nav variant="tabs" activeKey={activeSupplier} className="mb-3" onSelect={(k) => handleSupplierTab(k ?? 'all')}>
          <Nav.Item>
            <Nav.Link eventKey="all">Tất cả</Nav.Link>
          </Nav.Item>
          {suppliers.map((s) => (
            <Nav.Item key={s.id}>
              <Nav.Link eventKey={String(s.id)}>{s.name}</Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      )}

      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        toolbar={
          <ListToolbar
            search={query.search}
            onSearch={setSearch}
            status={query.status}
            onStatus={setStatus}
            statusOptions={PRODUCT_STATUS_OPTIONS}
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />

      <ProductFormModal
        show={store.showForm}
        editing={store.editing}
        suppliers={suppliers}
        onClose={store.closeForm}
        onSaved={refetch}
      />
      <PriceCalculatorModal
        show={!!calcProduct}
        product={calcProduct}
        onClose={() => setCalcProduct(null)}
        onSaved={refetch}
      />
      <ConfirmDialog
        show={!!store.deleting}
        message={`Xóa sản phẩm "${store.deleting?.name}"?`}
        confirmLabel="Xóa"
        onConfirm={async () => { if (store.deleting) await productActions.remove(store.deleting.id); refetch(); }}
        onClose={store.cancelDelete}
      />
    </>
  );
}
