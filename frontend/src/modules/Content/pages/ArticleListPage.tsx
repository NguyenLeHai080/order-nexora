import { useAuthStore } from '../../../core/authStore';
import { formatDateTime } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import LandingToggle from '../../../components/LandingToggle';
import { Button } from '../../../ui';
import { Badge } from 'react-bootstrap';
import ArticleFormModal from '../components/ArticleFormModal';
import { useArticles, articleActions, type Article } from '../hooks/useContent';
import { useArticleStore } from '../store/contentStore';
import { ARTICLE_GROUP_LABELS, CONTENT_STATUS_OPTIONS } from '../config/contentConfig';

export default function ArticleListPage() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, refetch } = useArticles();
  const store = useArticleStore();

  const columns: Column<Article>[] = [
    {
      key: 'title',
      header: 'Bài viết',
      render: (a) => (
        <div>
          <span className="fw-semibold">{a.title}</span>
          <small className="d-block text-muted font-monospace">{a.slug}</small>
        </div>
      ),
    },
    {
      key: 'group',
      header: 'Nhóm',
      render: (a) => <Badge bg="light" className="text-dark border">{ARTICLE_GROUP_LABELS[a.group] ?? a.group}</Badge>,
    },
    { key: 'category', header: 'Danh mục', render: (a) => a.category || <span className="text-muted">—</span> },
    { key: 'status', header: 'Trạng thái', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'show_on_landing',
      header: 'Hiện landing',
      render: (a) => (
        <LandingToggle
          value={a.show_on_landing}
          disabled={!can('update', 'Article')}
          onToggle={async (next) => { await articleActions.update(a.id, { show_on_landing: next }); }}
        />
      ),
    },
    {
      key: 'published_at',
      header: 'Ngày đăng',
      render: (a) => (a.published_at ? formatDateTime(a.published_at) : <span className="text-muted">—</span>),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (a) => (
        <div className="d-flex gap-1 justify-content-end">
          {can('update', 'Article') && (
            <Button size="sm" variant="light" icon="pencil" onClick={() => store.openEdit(a)} />
          )}
          {can('destroy', 'Article') && (
            <Button size="sm" variant="light" icon="trash" className="text-danger" onClick={() => store.askDelete(a)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Bài viết"
        breadcrumb="Nội dung › Bài viết"
        actions={
          can('create', 'Article') && (
            <Button variant="primary" icon="plus-lg" onClick={() => store.openCreate()}>
              Thêm bài viết
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
      <ArticleFormModal show={store.showForm} editing={store.editing} onClose={store.closeForm} onSaved={refetch} />
      <ConfirmDialog
        show={!!store.deleting}
        message={`Xóa bài viết "${store.deleting?.title}"?`}
        confirmLabel="Xóa"
        onConfirm={async () => { if (store.deleting) await articleActions.remove(store.deleting.id); refetch(); }}
        onClose={store.cancelDelete}
      />
    </>
  );
}
