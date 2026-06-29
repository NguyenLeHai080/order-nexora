import { Modal } from 'react-bootstrap';
import { formatCurrency, formatDateTime } from '../../../core/format';
import StatusBadge from '../../../components/StatusBadge';
import { Button } from '../../../ui';
import type { Invoice } from '../hooks/useInvoices';

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
}

// Modal xem + in hóa đơn (chỉ đọc). Dùng window.print để in nhanh.
export default function InvoiceDetailModal({ invoice, onClose }: Props) {
  return (
    <Modal show={!!invoice} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">Hóa đơn {invoice?.code}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {invoice && (
          <div id="invoice-print">
            <div className="d-flex justify-content-between mb-3">
              <div>
                <div className="fw-bold fs-5">ORDER NEXORA</div>
                <small className="text-muted">Hóa đơn bán hàng</small>
              </div>
              <div className="text-end">
                <div className="fw-semibold">{invoice.code}</div>
                <small className="text-muted">{formatDateTime(invoice.issued_at ?? invoice.created_at)}</small>
                <div className="mt-1"><StatusBadge status={invoice.status} /></div>
              </div>
            </div>

            <dl className="row mb-3">
              <dt className="col-4">Khách hàng</dt>
              <dd className="col-8">{invoice.customer_name ?? '-'}</dd>
              <dt className="col-4">Email</dt>
              <dd className="col-8">{invoice.customer_email ?? '-'}</dd>
            </dl>

            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th className="text-end">Đơn giá</th>
                  <th className="text-center">SL</th>
                  <th className="text-end">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{invoice.product_name}</td>
                  <td className="text-end">{formatCurrency(invoice.unit_price)}</td>
                  <td className="text-center">{invoice.quantity}</td>
                  <td className="text-end">{formatCurrency(invoice.subtotal)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-end">Tạm tính</td>
                  <td className="text-end">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-end">Giảm giá</td>
                  <td className="text-end text-danger">-{formatCurrency(invoice.discount)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-end fw-bold">Tổng cộng</td>
                  <td className="text-end fw-bold text-primary">{formatCurrency(invoice.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onClose}>Đóng</Button>
        <Button variant="primary" icon="printer" onClick={() => window.print()}>In hóa đơn</Button>
      </Modal.Footer>
    </Modal>
  );
}
