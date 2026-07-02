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
import CategoryFormModal from '../components/CategoryFormModal';
import { useCategories, categoryActions, type Category } from '../hooks/useCategories';
import { useCategoryStore } from '../store/categoryStore';
import { CATEGORY_STATUS_OPTIONS } from '../config/categoryConfig';

export default function CategoryListPage() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, refetch } = useCategories();
  const store = useCategoryStore();

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Danh mục',
      render: (c) => (
        <div>
          <span className="fw-semibold">{c.name}</span>
          <small className="d-block text-muted font-monospace">{c.slug}</small>
        </div>
      ),
    },
    { key: 'description', header: 'Mô tả', render: (c) => c.description ?? <span className="text-muted">—</span> },
    {
      key: 'product_count',
      header: 'Số sản phẩm',
      render: (c) => <span className="fw-semibold">{formatNumber(c.product_count)}</span>,
    },
    { key: 'sort_order', header: 'Thứ tự', render: (c) => formatNumber(c.sort_order) },
    { key: 'status', header: 'Trạng thái', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'show_on_landing',
      header: 'Hiện landing',
      render: (c) => (
        <LandingToggle
          value={c.show_on_landing}
          disabled={!can('update', 'Categorie')}
          onToggle={async (next) => { await categoryActions.update(c.id, { show_on_landing: next }); }}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (c) => (
        <div className="d-flex gap-1 justify-content-end">
          {can('update', 'Categorie') && (
            <Button size="sm" variant="light" icon="pencil" onClick={() => store.openEdit(c)} />
          )}
          {can('destroy', 'Categorie') && (
            <Button size="sm" variant="light" icon="trash" className="text-danger" onClick={() => store.askDelete(c)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Danh mục sản phẩm"
        breadcrumb="Kho hàng › Danh mục"
        infoKey="categories"
        actions={
          can('create', 'Categorie') && (
            <Button variant="primary" icon="plus-lg" onClick={() => store.openCreate()}>
              Thêm danh mục
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
            statusOptions={CATEGORY_STATUS_OPTIONS}
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />
      <CategoryFormModal show={store.showForm} editing={store.editing} onClose={store.closeForm} onSaved={refetch} />
      <ConfirmDialog
        show={!!store.deleting}
        message={`Xóa danh mục "${store.deleting?.name}"?`}
        confirmLabel="Xóa"
        onConfirm={async () => { if (store.deleting) await categoryActions.remove(store.deleting.id); refetch(); }}
        onClose={store.cancelDelete}
      />
    </>
  );
}
