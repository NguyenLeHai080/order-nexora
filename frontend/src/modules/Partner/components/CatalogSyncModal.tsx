import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Form, Modal, Table } from 'react-bootstrap';
import { extractError } from '../../../core/useList';
import { formatCurrency, formatDateTime, formatNumber } from '../../../core/format';
import { Button } from '../../../ui';
import {
  integrationActions,
  type CatalogSyncItem,
  type CatalogSyncResult,
  type IntegrationSupplier,
} from '../hooks/useIntegrations';

interface Props {
  show: boolean;
  supplier: IntegrationSupplier | null;
  onClose: () => void;
  onDone: () => void;
}

const ACTION_LABEL: Record<string, string> = {
  create: 'Tạo mới',
  update: 'Cập nhật',
  reactivate: 'Mở bán lại',
  discontinue: 'Ngưng bán',
  warning: 'Cảnh báo',
  error: 'Lỗi',
};

const ACTION_VARIANT: Record<string, string> = {
  create: 'success',
  update: 'primary',
  reactivate: 'info',
  discontinue: 'warning',
  warning: 'danger',
  error: 'danger',
};

export default function CatalogSyncModal({ show, supplier, onClose, onDone }: Props) {
  const [discontinueMissing, setDiscontinueMissing] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<CatalogSyncResult | null>(null);
  const [items, setItems] = useState<CatalogSyncItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const visibleItems = useMemo(() => items.slice(0, 30), [items]);

  useEffect(() => {
    if (!show) return;
    setResult(null);
    setItems([]);
    setError(null);
  }, [show, supplier?.id]);

  async function loadItems(runId: number) {
    const res = await integrationActions.getSyncRunItems(runId);
    setItems(res.data.data ?? []);
  }

  async function preview() {
    if (!supplier) return;
    setPreviewing(true);
    setError(null);
    try {
      const res = await integrationActions.syncCatalog(supplier.id, {
        dry_run: true,
        discontinue_missing: discontinueMissing,
      });
      const data = res.data.data as CatalogSyncResult;
      setResult(data);
      await loadItems(data.run_id);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setPreviewing(false);
    }
  }

  async function apply() {
    if (!supplier) return;
    setApplying(true);
    setError(null);
    try {
      const res = await integrationActions.syncCatalog(supplier.id, {
        dry_run: false,
        discontinue_missing: discontinueMissing,
      });
      const data = res.data.data as CatalogSyncResult;
      setResult(data);
      await loadItems(data.run_id);
      onDone();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal show={show} onHide={onClose} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-arrow-repeat text-primary me-2" />
          Đồng bộ catalog NCC
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <div className="fw-semibold">{supplier?.name}</div>
          <div className="text-muted small">
            Luồng tự động: lấy catalog NCC → map theo supplier_id + external_id → preview thay đổi → apply vào DB → ghi lịch sử SyncRun.
          </div>
        </div>

        <Alert variant="info" className="small">
          <div className="fw-semibold mb-1">Logic hệ thống khi sync</div>
          <ul className="mb-0 ps-3">
            <li>Sản phẩm đã có sẽ cập nhật tên, giá vốn, giá niêm yết, tồn NCC và trạng thái; markup admin đã đặt được giữ nguyên.</li>
            <li>Sản phẩm mới tự gắn nhà cung cấp + mã ngoài NCC; giá bán lấy từ default markup trong Cài đặt.</li>
            <li>NCC có capability tạo đơn dùng tồn provider_quantity/stock_status; kho local không bị nhập/xuất tự động.</li>
            <li>Nếu bật ngưng bán hàng thiếu catalog, sản phẩm biến mất khỏi NCC sẽ thành out_of_stock + inactive.</li>
            <li>Biên lãi sau sync ≤ 0 sẽ hiện cảnh báo để bạn áp markup hoặc kiểm tra giá NCC.</li>
          </ul>
        </Alert>

        {error && <Alert variant="danger">{error}</Alert>}

        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
          <Form.Check
            type="switch"
            checked={discontinueMissing}
            onChange={(e) => setDiscontinueMissing(e.target.checked)}
            label="Tự ngưng bán sản phẩm không còn trong catalog NCC"
          />
          <Button variant="light" icon="eye" loading={previewing} disabled={!supplier || applying} onClick={preview}>
            Xem trước
          </Button>
          <Button variant="primary" icon="check2-circle" loading={applying} disabled={!supplier || previewing} onClick={apply}>
            Áp dụng đồng bộ
          </Button>
        </div>

        {result && (
          <div className="row g-2 mb-3">
            <div className="col"><div className="p-2 bg-light rounded text-center"><div className="fw-bold">{formatNumber(result.total)}</div><small>Tổng</small></div></div>
            <div className="col"><div className="p-2 bg-light rounded text-center"><div className="fw-bold text-success">{formatNumber(result.created)}</div><small>Mới</small></div></div>
            <div className="col"><div className="p-2 bg-light rounded text-center"><div className="fw-bold text-primary">{formatNumber(result.updated)}</div><small>Cập nhật</small></div></div>
            <div className="col"><div className="p-2 bg-light rounded text-center"><div className="fw-bold text-warning">{formatNumber(result.discontinued)}</div><small>Ngưng bán</small></div></div>
            <div className="col"><div className="p-2 bg-light rounded text-center"><div className="fw-bold text-danger">{formatNumber(result.warnings)}</div><small>Cảnh báo</small></div></div>
          </div>
        )}

        <div className="table-responsive">
          <Table size="sm" hover className="align-middle">
            <thead>
              <tr>
                <th>Hành động</th>
                <th>Sản phẩm</th>
                <th>Mã NCC</th>
                <th>Giá vốn</th>
                <th>Giá bán</th>
                <th>Biên lãi</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted py-4">Bấm “Xem trước” để xem chi tiết thay đổi.</td></tr>
              ) : visibleItems.map((item) => (
                <tr key={item.id}>
                  <td><Badge bg={ACTION_VARIANT[item.action] ?? 'secondary'}>{ACTION_LABEL[item.action] ?? item.action}</Badge></td>
                  <td>{item.product_name ?? '-'}</td>
                  <td><code>{item.external_id ?? '-'}</code></td>
                  <td>{formatCurrency(item.new_base_price ?? item.old_base_price)}</td>
                  <td>{formatCurrency(item.new_sale_price ?? item.old_sale_price)}</td>
                  <td className={Number(item.margin_after ?? 0) <= 0 ? 'text-danger fw-semibold' : ''}>{formatCurrency(item.margin_after)}</td>
                  <td className="small text-muted">{item.note ?? item.warning_code ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        {items.length > visibleItems.length && (
          <div className="text-muted small">Đang hiển thị 30/{items.length} dòng đầu. Xem đầy đủ trong lịch sử SyncRun.</div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <span className="me-auto text-muted small">Lần chạy hiện tại: {result?.run_id ? `#${result.run_id}` : 'chưa có'} · {result ? formatDateTime(new Date().toISOString()) : ''}</span>
        <Button variant="light" onClick={onClose}>Đóng</Button>
      </Modal.Footer>
    </Modal>
  );
}
