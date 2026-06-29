import { Badge, Form } from 'react-bootstrap';
import { useAuthStore } from '../../../core/authStore';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Button } from '../../../ui';
import { useLogActivities, logActions, type LogItem } from '../hooks/useLogActivities';
import { useLogStore } from '../store/logStore';
import { HTTP_METHODS } from '../config/logConfig';
import { methodColor, statusColor } from '../helpers/logBadges';
import LogDetailModal from '../components/LogDetailModal';

export default function LogActivityPage() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, patchQuery, refetch } = useLogActivities();
  const store = useLogStore();
  const canDelete = can('destroy', 'Log-activity');

  const columns: Column<LogItem>[] = [
    {
      key: 'method_type',
      header: 'Method',
      width: 90,
      render: (l) => (
        <Badge bg={`${methodColor(l.method_type)}-subtle`} className={`text-${methodColor(l.method_type)}`}>
          {l.method_type}
        </Badge>
      ),
    },
    { key: 'route', header: 'Route', render: (l) => <span className="font-monospace small">{l.route}</span> },
    {
      key: 'status_code',
      header: 'Status',
      width: 80,
      render: (l) => <Badge bg={`${statusColor(l.status_code)}-subtle`} className={`text-${statusColor(l.status_code)}`}>{l.status_code}</Badge>,
    },
    { key: 'user_name', header: 'Người dùng' },
    { key: 'ip_address', header: 'IP', render: (l) => <span className="font-monospace small">{l.ip_address}</span> },
    { key: 'created_at', header: 'Thời gian', render: (l) => <span className="small">{l.created_at ?? '-'}</span> },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (l) => (
        <div className="d-flex gap-1 justify-content-end">
          <Button size="sm" variant="light" icon="eye" onClick={() => store.openDetail(l)} />
          {canDelete && (
            <Button size="sm" variant="light" icon="trash" className="text-danger" onClick={() => store.askDelete(l)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Nhật ký hoạt động"
        breadcrumb="Hệ thống › Nhật ký"
        actions={
          canDelete && (
            <Button variant="danger" icon="trash3" onClick={() => store.askClear()}>
              Xóa toàn bộ
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
            right={
              <Form.Select
                style={{ maxWidth: 160 }}
                value={(query.method_type as string) ?? ''}
                onChange={(e) => patchQuery({ method_type: e.target.value || undefined })}
              >
                <option value="">Tất cả method</option>
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Form.Select>
            }
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />

      <LogDetailModal log={store.detail} onClose={store.closeDetail} />

      <ConfirmDialog
        show={!!store.deleting}
        message={`Xóa log #${store.deleting?.id}?`}
        confirmLabel="Xóa"
        onConfirm={async () => { if (store.deleting) await logActions.remove(store.deleting.id); refetch(); }}
        onClose={store.cancelDelete}
      />
      <ConfirmDialog
        show={store.clearing}
        title="Xóa toàn bộ nhật ký"
        message="Toàn bộ log hoạt động sẽ bị xóa vĩnh viễn. Tiếp tục?"
        confirmLabel="Xóa tất cả"
        onConfirm={async () => { await logActions.clearAll(); refetch(); }}
        onClose={store.cancelClear}
      />
    </>
  );
}
