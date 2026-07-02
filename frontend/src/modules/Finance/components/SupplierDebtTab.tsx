import { useState } from 'react';
import { Card } from 'react-bootstrap';
import { useAuthStore } from '../../../core/authStore';
import { formatCurrency } from '../../../core/format';
import DataTable, { type Column } from '../../../components/DataTable';
import { Button } from '../../../ui';
import { useSupplierDebt, type SupplierDebt } from '../hooks/useFinance';
import SettlementModal from './SettlementModal';

// Công nợ NCC: bảng per-NCC (payable/settled/outstanding) + nút ghi tất toán.
export default function SupplierDebtTab() {
  const { can } = useAuthStore();
  const { data, loading, reload } = useSupplierDebt();
  const [settling, setSettling] = useState<SupplierDebt | null>(null);

  const canManage = can('store', 'Finance');

  const columns: Column<SupplierDebt & { id: number }>[] = [
    { key: 'supplier_name', header: 'Nhà cung cấp', render: (d) => <span className="fw-semibold">{d.supplier_name}</span> },
    {
      key: 'payable',
      header: 'Phải trả (đơn success)',
      className: 'text-end',
      render: (d) => formatCurrency(d.payable),
    },
    {
      key: 'settled',
      header: 'Đã tất toán',
      className: 'text-end',
      render: (d) => <span className="text-success">{formatCurrency(d.settled)}</span>,
    },
    {
      key: 'outstanding',
      header: 'Còn nợ',
      className: 'text-end',
      render: (d) => (
        <span className={`fw-semibold ${parseFloat(d.outstanding) > 0 ? 'text-danger' : 'text-muted'}`}>
          {formatCurrency(d.outstanding)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (d) =>
        canManage && parseFloat(d.outstanding) > 0 ? (
          <Button size="sm" variant="primary" onClick={() => setSettling(d)}>
            Ghi tất toán
          </Button>
        ) : null,
    },
  ];

  // Gắn id cho DataTable (supplier_id là khóa tự nhiên).
  const rows = data.map((d) => ({ ...d, id: d.supplier_id }));

  return (
    <>
      <Card className="mb-3 border-0 bg-light">
        <Card.Body className="py-2 small text-muted">
          <i className="bi bi-info-circle me-1" />
          Công nợ = tổng tiền phải trả NCC từ đơn đã <strong>success</strong> trừ đi các lần đã tất toán.
        </Card.Body>
      </Card>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="Chưa có công nợ NCC nào."
      />
      <SettlementModal debt={settling} onClose={() => setSettling(null)} onSaved={reload} />
    </>
  );
}
