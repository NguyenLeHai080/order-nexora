import { Pagination } from 'react-bootstrap';
import type { PageMeta } from '../core/useList';

// Phân trang dựa trên meta của backend. Hiển thị tối đa 5 nút trang quanh trang hiện tại.
export default function Paginator({
  meta,
  onChange,
}: {
  meta: PageMeta | null;
  onChange: (page: number) => void;
}) {
  if (!meta || meta.last_page <= 1) return null;

  const { current_page, last_page, from, to, total } = meta;
  const start = Math.max(1, current_page - 2);
  const end = Math.min(last_page, start + 4);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
      <span className="text-muted">
        Hiển thị {from ?? 0}–{to ?? 0} trên tổng {total}
      </span>
      <Pagination className="mb-0">
        <Pagination.First disabled={current_page === 1} onClick={() => onChange(1)} />
        <Pagination.Prev disabled={current_page === 1} onClick={() => onChange(current_page - 1)} />
        {pages.map((p) => (
          <Pagination.Item key={p} active={p === current_page} onClick={() => onChange(p)}>
            {p}
          </Pagination.Item>
        ))}
        <Pagination.Next
          disabled={current_page === last_page}
          onClick={() => onChange(current_page + 1)}
        />
        <Pagination.Last
          disabled={current_page === last_page}
          onClick={() => onChange(last_page)}
        />
      </Pagination>
    </div>
  );
}
