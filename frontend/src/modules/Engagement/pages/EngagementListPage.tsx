import { useState } from 'react';
import { Badge, Nav } from 'react-bootstrap';
import { useAuthStore } from '../../../core/authStore';
import { formatDateTime } from '../../../core/format';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Button } from '../../../ui';
import ReplyModal from '../components/ReplyModal';
import { useEngagements, engagementActions, type Engagement } from '../hooks/useEngagements';
import {
  ENGAGEMENT_KINDS,
  ENGAGEMENT_KIND_LABELS,
  ENGAGEMENT_STATUS_OPTIONS,
} from '../config/engagementConfig';

/** Hiển thị số sao (nếu có rating). */
function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-muted">—</span>;
  return (
    <span className="text-warning" title={`${rating}/5`}>
      {'★'.repeat(rating)}
      <span className="text-muted">{'☆'.repeat(5 - rating)}</span>
    </span>
  );
}

export default function EngagementListPage() {
  const { can } = useAuthStore();
  const { data, meta, loading, query, setPage, setSearch, setStatus, patchQuery, refetch } = useEngagements();
  const [activeKind, setActiveKind] = useState('review');
  const [replying, setReplying] = useState<Engagement | null>(null);
  const [deleting, setDeleting] = useState<Engagement | null>(null);

  // Đổi tab loại tương tác -> đặt filter kind.
  function handleKindTab(kind: string) {
    setActiveKind(kind);
    patchQuery({ kind });
  }

  async function act(fn: () => Promise<unknown>) {
    await fn();
    refetch();
  }

  const columns: Column<Engagement>[] = [
    {
      key: 'author_name',
      header: 'Người gửi',
      render: (e) => (
        <div>
          <span className="fw-semibold">{e.author_name}</span>
          {e.is_verified_purchase && (
            <Badge bg="success-subtle" className="text-success ms-1">Đã mua</Badge>
          )}
          {e.author_email && <small className="d-block text-muted">{e.author_email}</small>}
        </div>
      ),
    },
    { key: 'rating', header: 'Sao', render: (e) => <Stars rating={e.rating} /> },
    {
      key: 'content',
      header: 'Nội dung',
      render: (e) => (
        <div style={{ maxWidth: 360 }}>
          {e.title && <div className="fw-semibold">{e.title}</div>}
          <div className="text-muted">{e.content.length > 120 ? `${e.content.slice(0, 120)}…` : e.content}</div>
          {e.admin_reply && (
            <div className="mt-1 ps-2 border-start border-2 border-primary small">
              <i className="bi bi-reply-fill me-1 text-primary" />
              {e.admin_reply}
            </div>
          )}
        </div>
      ),
    },
    { key: 'status', header: 'Trạng thái', render: (e) => <StatusBadge status={e.status} /> },
    {
      key: 'created_at',
      header: 'Ngày gửi',
      render: (e) => (e.created_at ? formatDateTime(e.created_at) : '—'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (e) => (
        <div className="d-flex gap-1 justify-content-end">
          {can('update', 'Engagement') && e.status !== 'approved' && (
            <Button size="sm" variant="light" icon="check-lg" className="text-success"
              title="Duyệt" onClick={() => act(() => engagementActions.approve(e.id))} />
          )}
          {can('update', 'Engagement') && e.status !== 'rejected' && (
            <Button size="sm" variant="light" icon="x-lg" className="text-warning"
              title="Từ chối" onClick={() => act(() => engagementActions.reject(e.id))} />
          )}
          {can('update', 'Engagement') && (
            <Button size="sm" variant="light" icon="reply"
              title="Trả lời / cảm ơn" onClick={() => setReplying(e)} />
          )}
          {can('destroy', 'Engagement') && (
            <Button size="sm" variant="light" icon="trash" className="text-danger"
              title="Xóa" onClick={() => setDeleting(e)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Tương tác landing" breadcrumb="Nội dung › Tương tác" />

      <Nav variant="tabs" activeKey={activeKind} className="mb-3" onSelect={(k) => handleKindTab(k ?? 'review')}>
        {ENGAGEMENT_KINDS.map((k) => (
          <Nav.Item key={k.value}>
            <Nav.Link eventKey={k.value}>{k.label}</Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        empty={`Chưa có ${(ENGAGEMENT_KIND_LABELS[activeKind] ?? '').toLowerCase()} nào.`}
        toolbar={
          <ListToolbar
            search={query.search}
            onSearch={setSearch}
            status={query.status}
            onStatus={setStatus}
            statusOptions={ENGAGEMENT_STATUS_OPTIONS}
          />
        }
        footer={<Paginator meta={meta} onChange={setPage} />}
      />

      <ReplyModal engagement={replying} onClose={() => setReplying(null)} onSaved={refetch} />
      <ConfirmDialog
        show={!!deleting}
        message={`Xóa tương tác của "${deleting?.author_name}"?`}
        confirmLabel="Xóa"
        onConfirm={async () => { if (deleting) await engagementActions.remove(deleting.id); refetch(); }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
