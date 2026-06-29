import type { ReactNode } from 'react';
import { Card, Table } from 'react-bootstrap';
import { Loader, EmptyState } from '../ui';

export interface Column<T> {
  key: string;
  header: string;
  /** Render tùy biến ô; mặc định lấy row[key]. */
  render?: (row: T) => ReactNode;
  className?: string;
  width?: string | number;
}

// Bảng dữ liệu dùng chung: nhận cột + dữ liệu, tự xử lý trạng thái loading/empty.
export default function DataTable<T extends { id: number | string }>({
  columns,
  rows,
  loading,
  empty = 'Không có dữ liệu.',
  toolbar,
  footer,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  empty?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card>
      {toolbar && <Card.Header className="border-bottom-0">{toolbar}</Card.Header>}
      <Card.Body className="pt-2">
        <div className="table-responsive">
          <Table hover className="table-card align-middle mb-0">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={c.className} style={{ width: c.width }}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    <Loader />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    <EmptyState title={empty} />
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.className}>
                        {c.render ? c.render(row) : ((row as Record<string, ReactNode>)[c.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
        {footer}
      </Card.Body>
    </Card>
  );
}
