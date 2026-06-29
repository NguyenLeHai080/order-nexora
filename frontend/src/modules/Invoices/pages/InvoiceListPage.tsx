import { useState } from 'react';
import { formatCurrency, formatDateTime } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import { Button } from '../../../ui';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import { useInvoices, type Invoice } from '../hooks/useInvoices';
import { INVOICE_STATUS_OPTIONS } from '../config/invoiceConfig';

export default function InvoiceListPage() {
  const { data, meta, loading, query, setPage, setSearch, setStatus } = useInvoices();
  const [detail, setDetail] = useState<Invoice | null>(null);

  const columns: Column<Invoice>[] = [
    { key: 'code', header: 'Mã HĐ', render: (i) => <span className="fw-semibold">{i.code}</span> },
    { key: 'customer_name', header: 'Khách hàng', render: (i) => i.customer_name ?? '-' },
    { key: 'product_name', header: 'Sản phẩm' },
    { key: 'total', header: 'Tổng tiền', render: (i) => <span className="fw-semibold text-primary">{formatCurrency(i.total)}</span> },
    { key: 'status', header: 'Trạng thái', render: (i) => <StatusBadge status={i.status} /> },
    { key: 'issued_at', header: 'Ngày phát hành', render: (i) => formatDateTime(i.issued_at ?? i.created_at) },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (i) => <Button size="sm" variant="light" icon="eye" onClick={() => setDetail(i)} />,
    },
  ];

  return (
    <>
      <PageHeader title="Hóa đơn" breadcrumb="Bán hàng › Hóa đơn" />

      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        empty="Chưa có hóa đơn nào."
        toolbar={
          <ListToolbar
            search={query.search}
            onSearch={setSearch}
            status={query.status}
            onStatus={setStatus}
            statusOptions={INVOICE_STATUS_OPTIONS}
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />

      <InvoiceDetailModal invoice={detail} onClose={() => setDetail(null)} />
    </>
  );
}
