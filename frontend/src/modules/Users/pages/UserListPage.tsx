import { useState } from 'react';
import { Row, Col } from 'react-bootstrap';
import { useAuthStore } from '../../../core/authStore';
import { formatCurrency, formatDateTime } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import StatCard from '../../../components/StatCard';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Button, Checkbox } from '../../../ui';
import UserFormModal, { type UserRow } from '../components/UserFormModal';
import BalanceModal from '../components/BalanceModal';
import { useUsers, userActions, type UserFull } from '../hooks/useUsers';
import { useUserStore } from '../store/userStore';
import { USER_STATUS_OPTIONS } from '../config/userConfig';

export default function UserListPage() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, stats, refresh } = useUsers();
  const store = useUserStore();
  const canManage = can('update', 'User');

  // Modal số dư có state riêng (khác với modal thêm/sửa của store).
  const [balanceUser, setBalanceUser] = useState<UserRow | null>(null);

  function afterChange() {
    refresh();
    store.clearSelected();
  }

  async function handleBulkDelete() {
    await userActions.bulkDelete(store.selected);
    afterChange();
  }
  async function handleBulkStatus(status: string) {
    await userActions.bulkStatus(store.selected, status);
    afterChange();
  }

  const columns: Column<UserFull>[] = [
    {
      key: 'check',
      header: '',
      width: 40,
      render: (u) => <Checkbox checked={store.isSelected(u.id)} onChange={() => store.toggle(u.id)} />,
    },
    {
      key: 'name',
      header: 'Người dùng',
      render: (u) => (
        <div>
          <div className="fw-semibold">{u.name}</div>
          <small className="text-muted">{u.email}</small>
        </div>
      ),
    },
    { key: 'user_name', header: 'Tên đăng nhập', render: (u) => u.user_name ?? '-' },
    {
      key: 'balance',
      header: 'Số dư',
      render: (u) => <span className="fw-semibold text-primary">{formatCurrency(u.balance)}</span>,
    },
    { key: 'status', header: 'Trạng thái', render: (u) => <StatusBadge status={u.status} /> },
    { key: 'created_at', header: 'Ngày tạo', render: (u) => formatDateTime(u.created_at) },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (u) => (
        <div className="d-flex gap-1 justify-content-end">
          {canManage && (
            <Button size="sm" variant="light" icon="wallet2" className="text-success" title="Số dư"
              onClick={() => setBalanceUser(u)} />
          )}
          {canManage && (
            <Button size="sm" variant="light" icon="pencil" title="Sửa" onClick={() => store.openEdit(u)} />
          )}
          {can('destroy', 'User') && (
            <Button size="sm" variant="light" icon="trash" className="text-danger" title="Xóa"
              onClick={() => store.askDelete(u)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Người dùng"
        breadcrumb="Hệ thống › Người dùng"
        actions={
          can('create', 'User') && (
            <Button variant="primary" icon="plus-lg" onClick={() => store.openCreate()}>
              Thêm người dùng
            </Button>
          )
        }
      />

      <Row className="g-3 mb-3">
        <Col md={4}>
          <StatCard label="Tổng tài khoản" value={stats?.total ?? 0} icon="bi-people" color="primary" />
        </Col>
        <Col md={4}>
          <StatCard label="Đang hoạt động" value={stats?.active ?? 0} icon="bi-person-check" color="success" />
        </Col>
        <Col md={4}>
          <StatCard label="Đã khóa" value={stats?.locked ?? 0} icon="bi-person-lock" color="danger" />
        </Col>
      </Row>

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
            statusOptions={USER_STATUS_OPTIONS}
            right={
              store.selected.length > 0 && canManage ? (
                <>
                  <Button size="sm" variant="success" onClick={() => handleBulkStatus('active')}>
                    Mở khóa ({store.selected.length})
                  </Button>
                  <Button size="sm" variant="warning" onClick={() => handleBulkStatus('locked')}>
                    Khóa
                  </Button>
                  {can('destroy', 'User') && (
                    <Button size="sm" variant="danger" onClick={handleBulkDelete}>
                      Xóa
                    </Button>
                  )}
                </>
              ) : (
                <Checkbox
                  label="Chọn tất cả"
                  checked={data.length > 0 && store.selected.length === data.length}
                  onChange={() => store.toggleAll(data.map((u) => u.id))}
                />
              )
            }
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />

      <UserFormModal show={store.showForm} editing={store.editing} onClose={store.closeForm} onSaved={afterChange} />
      <BalanceModal
        show={!!balanceUser}
        user={balanceUser}
        onClose={() => setBalanceUser(null)}
        onSaved={afterChange}
      />
      <ConfirmDialog
        show={!!store.deleting}
        message={`Xóa người dùng "${store.deleting?.name}"? Hành động không thể hoàn tác.`}
        confirmLabel="Xóa"
        onConfirm={async () => {
          if (store.deleting) await userActions.remove(store.deleting.id);
          afterChange();
        }}
        onClose={store.cancelDelete}
      />
    </>
  );
}
