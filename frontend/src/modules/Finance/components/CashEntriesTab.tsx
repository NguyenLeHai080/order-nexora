import { useState } from 'react';
import { Badge } from 'react-bootstrap';
import { useAuthStore } from '../../../core/authStore';
import { formatCurrency, formatDateTime } from '../../../core/format';
import { extractError } from '../../../core/useList';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import { Button } from '../../../ui';
import { financeActions, useCashEntries, type CashEntry } from '../hooks/useFinance';
import { CASH_KIND_OPTIONS } from '../config/financeConfig';
import CashEntryModal from './CashEntryModal';

// Phiếu thu/chi thủ công: bảng + thêm/sửa/xóa. Độc lập sổ kho (không double-count).
export default function CashEntriesTab() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, patchQuery, refetch } = useCashEntries();
  const [editing, setEditing] = useState<CashEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canManage = can('store', 'Finance');

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }
  function openEdit(entry: CashEntry) {
    setEditing(entry);
    setShowModal(true);
  }

  async function handleDelete(entry: CashEntry) {
    if (!window.confirm(`Xóa phiếu "${entry.category || entry.kind}"?`)) return;
    try {
      await financeActions.deleteCashEntry(entry.id);
      await refetch();
    } catch (e) {
      setErr(extractError(e));
    }
  }

  const columns: Column<CashEntry>[] = [
    { key: 'occurred_on', header: 'Ngày', render: (e) => formatDateTime(e.occurred_on) },
    {
      key: 'kind',
      header: 'Loại',
      render: (e) =>
        e.kind === 'income' ? (
          <Badge bg="success-subtle" className="text-success fw-medium">Phiếu thu</Badge>
        ) : (
          <Badge bg="danger-subtle" className="text-danger fw-medium">Phiếu chi</Badge>
        ),
    },
    { key: 'category', header: 'Hạng mục', render: (e) => e.category ?? '-' },
    {
      key: 'amount',
      header: 'Số tiền',
      className: 'text-end',
      render: (e) => (
        <span className={`fw-semibold ${e.kind === 'income' ? 'text-success' : 'text-danger'}`}>
          {e.kind === 'income' ? '+' : '−'}
          {formatCurrency(e.amount)}
        </span>
      ),
    },
    { key: 'note', header: 'Ghi chú', render: (e) => e.note ?? '-' },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (e) =>
        canManage ? (
          <div className="d-flex gap-1 justify-content-end">
            <Button size="sm" variant="light" icon="pencil" onClick={() => openEdit(e)} />
            <Button size="sm" variant="light" icon="trash" onClick={() => handleDelete(e)} />
          </div>
        ) : null,
    },
  ];

  return (
    <>
      {err && <div className="alert alert-danger">{err}</div>}
      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        empty="Chưa có phiếu thu/chi nào."
        toolbar={
          <ListToolbar
            search={query.search}
            onSearch={setSearch}
            status={(query.kind as string) ?? ''}
            onStatus={(v) => patchQuery({ kind: v })}
            statusOptions={CASH_KIND_OPTIONS}
            right={
              canManage ? (
                <Button variant="primary" icon="plus-lg" onClick={openCreate}>
                  Thêm phiếu
                </Button>
              ) : undefined
            }
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />
      <CashEntryModal
        entry={editing}
        show={showModal}
        onClose={() => setShowModal(false)}
        onSaved={refetch}
      />
    </>
  );
}
