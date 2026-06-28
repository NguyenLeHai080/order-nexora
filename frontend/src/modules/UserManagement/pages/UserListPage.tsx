import { useFetchUsers } from '../hooks/useFetchUsers';
import { USER_COLUMNS, USER_STATUS } from '../config';

// Trang danh sách người dùng — kết hợp hook + cấu hình cột.
// Đây là khuôn mẫu (template) để nhân bản cho các module khác:
// mỗi module có config/ hooks/ components/ pages/ riêng.
export default function UserListPage() {
  const { data, meta, loading, page, setPage, search, setSearch } = useFetchUsers();

  return (
    <div>
      <h1>Quản lý người dùng</h1>
      <input
        placeholder="Tìm kiếm..."
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        style={{ marginBottom: 12 }}
      />

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {USER_COLUMNS.map((col) => (
                <th key={col.key} style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id}>
                <td style={{ padding: 8 }}>{u.id}</td>
                <td style={{ padding: 8 }}>{u.name}</td>
                <td style={{ padding: 8 }}>{u.email}</td>
                <td style={{ padding: 8 }}>{u.balance}</td>
                <td style={{ padding: 8 }}>
                  {USER_STATUS[u.status as keyof typeof USER_STATUS] ?? u.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {meta && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Trước
          </button>
          <span>
            Trang {meta.current_page} / {meta.last_page} ({meta.total} bản ghi)
          </span>
          <button disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
