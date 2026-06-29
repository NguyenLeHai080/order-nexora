import type { ReactNode } from 'react';
import { Form, InputGroup } from 'react-bootstrap';

interface StatusOption {
  value: string;
  label: string;
}

// Thanh công cụ list: ô tìm kiếm + lọc trạng thái + vùng nút phải. Dùng chung cho các màn CRUD.
export default function ListToolbar({
  search,
  onSearch,
  status,
  onStatus,
  statusOptions,
  right,
}: {
  search: string;
  onSearch: (v: string) => void;
  status?: string;
  onStatus?: (v: string) => void;
  statusOptions?: StatusOption[];
  right?: ReactNode;
}) {
  return (
    <div className="d-flex flex-wrap align-items-center gap-2">
      <InputGroup style={{ maxWidth: 280 }}>
        <InputGroup.Text className="bg-white">
          <i className="bi bi-search" />
        </InputGroup.Text>
        <Form.Control
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </InputGroup>
      {statusOptions && onStatus && (
        <Form.Select
          style={{ maxWidth: 180 }}
          value={status ?? ''}
          onChange={(e) => onStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Form.Select>
      )}
      {right && <div className="ms-auto d-flex gap-2">{right}</div>}
    </div>
  );
}
