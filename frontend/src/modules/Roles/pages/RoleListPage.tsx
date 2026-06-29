import { Badge } from 'react-bootstrap';
import { useAuthStore } from '../../../core/authStore';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Button } from '../../../ui';
import { deleteRole, useRoles, usePermissions, type Role } from '../hooks/useRoles';
import { useRoleStore } from '../store/roleStore';
import RoleFormModal from '../components/RoleFormModal';

// Trang quản lý vai trò & phân quyền. Admin tick quyền cho từng vai trò.
export default function RoleListPage() {
  const { can } = useAuthStore();
  const { roles, loading, reload } = useRoles();
  const permissions = usePermissions();
  const store = useRoleStore();

  const columns: Column<Role>[] = [
    { key: 'name', header: 'Vai trò', render: (r) => <span className="fw-semibold text-capitalize">{r.name}</span> },
    { key: 'description', header: 'Mô tả', render: (r) => r.description ?? '-' },
    {
      key: 'permissions',
      header: 'Số quyền',
      render: (r) => <Badge bg="primary-subtle" className="text-primary">{r.permission_ids.length} quyền</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (r) => (
        <div className="d-flex gap-1 justify-content-end">
          {can('update', 'Role') && (
            <Button size="sm" variant="light" icon="pencil" onClick={() => store.openEdit(r)} />
          )}
          {can('destroy', 'Role') && (
            <Button size="sm" variant="light" icon="trash" className="text-danger" onClick={() => store.askDelete(r)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Vai trò & Phân quyền" breadcrumb="Hệ thống › Vai trò" />
      <DataTable
        columns={columns}
        rows={roles}
        loading={loading}
        toolbar={
          <div className="d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Danh sách vai trò</span>
            {can('create', 'Role') && (
              <Button size="sm" variant="primary" icon="plus-lg" onClick={() => store.openCreate()}>
                Thêm vai trò
              </Button>
            )}
          </div>
        }
      />
      <RoleFormModal
        show={store.showForm}
        editing={store.editing}
        permissions={permissions}
        onClose={store.closeForm}
        onSaved={reload}
      />
      <ConfirmDialog
        show={!!store.deleting}
        message={`Xóa vai trò "${store.deleting?.name}"?`}
        confirmLabel="Xóa"
        onConfirm={async () => { if (store.deleting) await deleteRole(store.deleting.id); reload(); }}
        onClose={store.cancelDelete}
      />
    </>
  );
}
