import { Modal } from 'react-bootstrap';
import { formatCurrency, formatDateTime } from '../../../core/format';
import StatusBadge from '../../../components/StatusBadge';
import type { Order } from '../hooks/useOrders';

interface Props {
  order: Order | null;
  onClose: () => void;
}

// Modal xem chi tiết đơn hàng (chỉ đọc) + nội dung đã giao.
export default function OrderDetailModal({ order, onClose }: Props) {
  return (
    <Modal show={!!order} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">Chi tiết đơn {order?.code}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {order && (
          <dl className="row mb-0">
            <dt className="col-5">Sản phẩm</dt>
            <dd className="col-7">{order.product_name}</dd>
            <dt className="col-5">Đơn giá</dt>
            <dd className="col-7">{formatCurrency(order.unit_price)}</dd>
            <dt className="col-5">Số lượng</dt>
            <dd className="col-7">{order.quantity}</dd>
            <dt className="col-5">Tổng tiền</dt>
            <dd className="col-7 fw-semibold text-primary">{formatCurrency(order.total_amount)}</dd>
            <dt className="col-5">Trạng thái</dt>
            <dd className="col-7"><StatusBadge status={order.status} /></dd>
            <dt className="col-5">Thời gian</dt>
            <dd className="col-7">{formatDateTime(order.created_at)}</dd>
            <dt className="col-12 mt-2">Nội dung đã giao</dt>
            <dd className="col-12">
              <pre className="bg-light p-2 rounded mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {order.delivered_content ?? '(chưa giao)'}
              </pre>
            </dd>
          </dl>
        )}
      </Modal.Body>
    </Modal>
  );
}
