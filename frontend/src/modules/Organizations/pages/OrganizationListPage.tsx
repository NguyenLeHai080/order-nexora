import { useState } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { useAuthStore } from '../../../core/authStore';
import { formatDateTime } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import StatCard from '../../../components/StatCard';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Button } from '../../../ui';
import OrgTree from '../components/OrgTree';
import OrgFormModal from '../components/OrgFormModal';
import { useOrganizations, useOrgAux, useOrgTree, orgActions, type Org } from '../hooks/useOrganizations';
import { useOrganizationStore } from '../store/organizationStore';
import { ORG_STATUS_OPTIONS } from '../config/organizationConfig';

export default function OrganizationListPage() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, refetch } = useOrganizations();
  const store = useOrganizationStore();
  const [view, setView] = useState<'table' | 'tree'>('table');
  const { stats, options, reloadAux } = useOrgAux();
  const { tree, reloadTree } = useOrgTree(view === 'tree');

  function afterChange() {
    void refetch();
    void reloadAux();
    if (view === 'tree') void reloadTree();
  }

  const columns: Column<Org>[] = [
    {
      key: 'name',
      header: 'Tổ chức',
      render: (o) => (
        <div style={{ paddingLeft: o.depth * 16 }}>
          {o.depth > 0 && <i className="bi bi-arrow-return-right text-muted me-1" />}
          <span className="fw-semibold">{o.name}</span>
          <div><small className="text-muted">/{o.slug}</small></div>
        </div>
      ),
    },
    { key: 'description', header: 'Mô tả', render: (o) => o.description ?? '-' },
    { key: 'sort_order', header: 'Thứ tự', render: (o) => o.sort_order },
    { key: 'status', header: 'Trạng thái', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'created_at', header: 'Ngày tạo', render: (o) => formatDateTime(o.created_at) },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (o) => (
        <div className="d-flex gap-1 justify-content-end">
          {can('update', 'Organization') && (
            <Button size="sm" variant="light" icon="pencil" onClick={() => store.openEdit(o)} />
          )}
          {can('destroy', 'Organization') && (
            <Button size="sm" variant="light" icon="trash" className="text-danger" onClick={() => store.askDelete(o)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Tổ chức"
        breadcrumb="Hệ thống › Tổ chức"
        actions={
          <>
            <Button
              variant={view === 'tree' ? 'primary' : 'light'}
              icon={view === 'tree' ? 'table' : 'diagram-3'}
              onClick={() => setView(view === 'tree' ? 'table' : 'tree')}
            >
              {view === 'tree' ? 'Dạng bảng' : 'Dạng cây'}
            </Button>
            {can('create', 'Organization') && (
              <Button variant="primary" icon="plus-lg" onClick={() => store.openCreate()}>
                Thêm tổ chức
              </Button>
            )}
          </>
        }
      />

      <Row className="g-3 mb-3">
        <Col md={4}><StatCard label="Tổng tổ chức" value={stats?.total ?? 0} icon="bi-diagram-3" color="primary" /></Col>
        <Col md={4}><StatCard label="Hoạt động" value={stats?.active ?? 0} icon="bi-check-circle" color="success" /></Col>
        <Col md={4}><StatCard label="Tạm ngưng" value={stats?.inactive ?? 0} icon="bi-pause-circle" color="secondary" /></Col>
      </Row>

      {view === 'tree' ? (
        <Card>
          <Card.Header>Cây tổ chức</Card.Header>
          <Card.Body>
            <OrgTree tree={tree} />
          </Card.Body>
        </Card>
      ) : (
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
              statusOptions={ORG_STATUS_OPTIONS}
            />
          }
          footer={<Paginator meta={meta} onChange={setPage} />}
        />
      )}

      <OrgFormModal
        show={store.showForm}
        editing={store.editing}
        options={options}
        onClose={store.closeForm}
        onSaved={afterChange}
      />
      <ConfirmDialog
        show={!!store.deleting}
        message={`Xóa tổ chức "${store.deleting?.name}"? Các tổ chức con cũng bị ảnh hưởng.`}
        confirmLabel="Xóa"
        onConfirm={async () => { if (store.deleting) await orgActions.remove(store.deleting.id); afterChange(); }}
        onClose={store.cancelDelete}
      />
    </>
  );
}
