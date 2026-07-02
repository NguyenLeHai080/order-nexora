import { useAuthStore } from '../../../core/authStore';
import { formatNumber } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import LandingToggle from '../../../components/LandingToggle';
import { Button } from '../../../ui';
import FaqFormModal from '../components/FaqFormModal';
import { useFaqs, faqActions, type Faq } from '../hooks/useContent';
import { useFaqStore } from '../store/contentStore';
import { CONTENT_STATUS_OPTIONS } from '../config/contentConfig';

export default function FaqListPage() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, refetch } = useFaqs();
  const store = useFaqStore();

  const columns: Column<Faq>[] = [
    { key: 'question', header: 'Câu hỏi', render: (f) => <span className="fw-semibold">{f.question}</span> },
    {
      key: 'answer',
      header: 'Trả lời',
      render: (f) => <span className="text-muted">{f.answer.length > 80 ? `${f.answer.slice(0, 80)}…` : f.answer}</span>,
    },
    { key: 'sort_order', header: 'Thứ tự', render: (f) => formatNumber(f.sort_order) },
    { key: 'status', header: 'Trạng thái', render: (f) => <StatusBadge status={f.status} /> },
    {
      key: 'show_on_landing',
      header: 'Hiện landing',
      render: (f) => (
        <LandingToggle
          value={f.show_on_landing}
          disabled={!can('update', 'Faq')}
          onToggle={async (next) => { await faqActions.update(f.id, { show_on_landing: next }); }}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (f) => (
        <div className="d-flex gap-1 justify-content-end">
          {can('update', 'Faq') && (
            <Button size="sm" variant="light" icon="pencil" onClick={() => store.openEdit(f)} />
          )}
          {can('destroy', 'Faq') && (
            <Button size="sm" variant="light" icon="trash" className="text-danger" onClick={() => store.askDelete(f)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Câu hỏi thường gặp"
        breadcrumb="Nội dung › FAQ"
        actions={
          can('create', 'Faq') && (
            <Button variant="primary" icon="plus-lg" onClick={() => store.openCreate()}>
              Thêm câu hỏi
            </Button>
          )
        }
      />
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
            statusOptions={CONTENT_STATUS_OPTIONS}
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />
      <FaqFormModal show={store.showForm} editing={store.editing} onClose={store.closeForm} onSaved={refetch} />
      <ConfirmDialog
        show={!!store.deleting}
        message={`Xóa câu hỏi "${store.deleting?.question}"?`}
        confirmLabel="Xóa"
        onConfirm={async () => { if (store.deleting) await faqActions.remove(store.deleting.id); refetch(); }}
        onClose={store.cancelDelete}
      />
    </>
  );
}
