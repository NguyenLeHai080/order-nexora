import { Modal } from 'react-bootstrap';
import { formatCurrency, formatDateTime } from '../../../core/format';
import StatusBadge from '../../../components/StatusBadge';
import type { Order } from '../hooks/useOrders';

interface Props {
  order: Order | null;
  onClose: () => void;
}

export default function OrderDetailModal({ order, onClose }: Props) {
  const hasManualSupport = !!order?.manual_fulfillment_required;
  const isGuest = !!order && !order.user_id;

  return (
    <Modal show={!!order} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">Chi tiết đơn {order?.code}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {order && (
          <dl className="row mb-0">
            <dt className="col-5">Sản phẩm</dt>
            <dd className="col-7">{order.product_name}</dd>
            <dt className="col-5">Khách hàng</dt>
            <dd className="col-7">
              {isGuest ? (
                <>
                  <span className="fw-semibold">{order.guest_name || 'Khách vãng lai'}</span>
                  <span className="badge bg-warning-subtle text-warning ms-2">Vãng lai</span>
                  {order.guest_phone && <div className="small text-muted">SĐT: {order.guest_phone}</div>}
                  {order.guest_email && <div className="small text-muted">Email: {order.guest_email}</div>}
                </>
              ) : (
                <span className="text-muted">Tài khoản #{order.user_id}</span>
              )}
            </dd>
            <dt className="col-5">Đơn giá</dt>
            <dd className="col-7">{formatCurrency(order.unit_price)}</dd>
            <dt className="col-5">Số lượng</dt>
            <dd className="col-7">{order.quantity}</dd>
            <dt className="col-5">Tổng tiền khách trả</dt>
            <dd className="col-7 fw-semibold text-primary">{formatCurrency(order.total_amount)}</dd>
            <dt className="col-5">Giá kho/NCC</dt>
            <dd className="col-7 text-muted">{formatCurrency(order.total_cost)}</dd>
            <dt className="col-5">Phải trả NCC</dt>
            <dd className="col-7 text-muted">{formatCurrency(order.supplier_payable)}</dd>
            <dt className="col-5">Lãi về ví chủ</dt>
            <dd className="col-7 fw-semibold text-success">{formatCurrency(order.owner_profit)}</dd>
            <dt className="col-5">Trạng thái</dt>
            <dd className="col-7"><StatusBadge status={order.status} /></dd>
            {isGuest && (
              <>
                <dt className="col-5">Thanh toán</dt>
                <dd className="col-7">
                  {order.payment_status === 'paid' ? (
                    <span className="text-success fw-semibold">
                      Đã thanh toán{order.paid_at ? ` · ${formatDateTime(order.paid_at)}` : ''}
                    </span>
                  ) : order.payment_status === 'refunded' ? (
                    <span className="text-warning fw-semibold">Đã hoàn tiền cho khách</span>
                  ) : (
                    <span className="text-warning fw-semibold">Chưa thanh toán</span>
                  )}
                </dd>
                {order.payment_reference && (
                  <>
                    <dt className="col-5">Mã chuyển khoản</dt>
                    <dd className="col-7 font-monospace">{order.payment_reference}</dd>
                  </>
                )}
              </>
            )}
            <dt className="col-5">Thời gian</dt>
            <dd className="col-7">{formatDateTime(order.created_at)}</dd>
            <dt className="col-12 mt-2">Nội dung đã giao</dt>
            <dd className="col-12">
              <pre className="bg-light p-2 rounded mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {order.delivered_content ?? '(chưa giao)'}
              </pre>
            </dd>
            {hasManualSupport && (
              <>
                <dt className="col-12 mt-3">Liên hệ xử lý đơn</dt>
                <dd className="col-12">
                  <div className="border rounded p-3 d-flex gap-3 align-items-center flex-wrap">
                    {order.manual_qr_image_url && (
                      <img
                        src={order.manual_qr_image_url}
                        alt="QR Zalo"
                        width={120}
                        height={120}
                        className="border rounded object-fit-contain bg-white"
                      />
                    )}
                    <div>
                      <div className="fw-semibold">{order.manual_contact_name ?? 'Nhân viên xử lý đơn'}</div>
                      {order.manual_contact_url ? (
                        <a href={order.manual_contact_url} target="_blank" rel="noreferrer">
                          Mở Zalo
                        </a>
                      ) : (
                        <span className="text-muted">Quét QR Zalo hoặc liên hệ nhân viên để giao hàng.</span>
                      )}
                    </div>
                  </div>
                </dd>
              </>
            )}
          </dl>
        )}
      </Modal.Body>
    </Modal>
  );
}
