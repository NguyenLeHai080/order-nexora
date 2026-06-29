# Hướng dẫn Frontend

Tài liệu cho frontend dev: mô hình module, tổ chức assets/SCSS, và **hướng dẫn thêm màn hình mới từng bước**.

## Stack

- **React 18** + **Vite** + **TypeScript**
- **react-router-dom 6** (định tuyến)
- **zustand** (state — phiên đăng nhập toàn cục + **store UI riêng từng module**, xem bên dưới)
- **axios** (gọi API, interceptor tự gắn token + tổ chức)
- **react-bootstrap** + **bootstrap-icons** (UI nền)
- **ApexCharts** (biểu đồ)
- **Sass** (SCSS) cho style tùy biến

## Cây thư mục `src/`

```
src/
├── assets/
│   ├── images/         # logo, ảnh tĩnh
│   └── scss/           # style (partials + main.scss)
├── components/         # component bố cục dùng chung mọi module
│   ├── DataTable.tsx       bảng dữ liệu (cột + loading + empty)
│   ├── Paginator.tsx       phân trang
│   ├── PageHeader.tsx      tiêu đề + breadcrumb + nút hành động
│   ├── ListToolbar.tsx     ô tìm kiếm + lọc trạng thái
│   ├── StatCard.tsx        thẻ số liệu
│   ├── StatusBadge.tsx     nhãn trạng thái
│   └── ConfirmDialog.tsx   hộp thoại xác nhận xóa
├── core/               # hạ tầng FE (không gắn module cụ thể)
│   ├── apiClient.ts        axios + interceptor (Bearer, X-Organization-Id)
│   ├── authStore.ts        zustand: token/user/roles/abilities + can()
│   ├── createListStore.ts  factory zustand: chọn nhiều + state modal (mỗi module 1 store)
│   ├── ProtectedRoute.tsx  chặn route theo đăng nhập + quyền
│   ├── useList.ts          hook list chung (search/sort/page + meta)
│   ├── useUpload.ts        hook upload ảnh
│   └── format.ts           formatCurrency/Number/DateTime, resolveAsset
├── layouts/
│   └── AdminLayout.tsx     khung admin: sidebar + topbar
├── modules/            # màn hình nghiệp vụ theo module
│   └── <Module>/
│       ├── config/         hằng số, endpoint URL, tùy chọn select
│       ├── hooks/          hook gọi API + actions riêng module
│       ├── helpers/        format/validate/tính toán riêng module
│       ├── store/          zustand UI cục bộ của module (modal, chọn nhiều)
│       ├── components/     component chỉ dùng trong module (form, tab, modal)
│       └── pages/          trang chính (ghép các phần)
├── ui/                 # thư viện UI kit nguyên tử (Button, Input...)
├── App.tsx             # khai báo route
├── main.tsx            # điểm vào, import style toàn cục
└── theme.css           # (đang chuyển dần sang assets/scss)
```

## Mô hình module chuẩn

Mỗi module **tự chứa** đầy đủ phần của riêng nó. Một module đầy đủ (ví dụ `Users`, `Products`) gồm:

| Thư mục | Chứa gì | Ví dụ |
|---------|---------|-------|
| `config/` | endpoint URL, hằng số, tùy chọn select | `productConfig.ts` (endpoint + status options) |
| `hooks/` | hook gọi API + object `actions` (create/update/remove) | `useProducts.ts` |
| `helpers/` | hàm format/validate/tính toán riêng module | `pricing.ts`, `permissionGroups.ts` |
| `store/` | zustand UI cục bộ (state modal, chọn nhiều) | `productStore.ts` |
| `components/` | modal, form, tab... chỉ dùng nội bộ module | `ProductFormModal.tsx` |
| `pages/` | trang chính, ghép data + UI | `ProductListPage.tsx` |

**Nguyên tắc:** giữ mọi thứ trong module cho tới khi **dùng chung hết** mọi module mới tách ra `src/components/` (component bố cục lớn) hoặc `src/ui/` (UI kit nguyên tử). Đừng vội tổng quát hóa sớm.

### Store riêng từng module (zustand)

Mỗi module có store UI riêng, **không** dùng chung một store khổng lồ. Phần lớn module CRUD chỉ cần state chuẩn (modal thêm/sửa, xác nhận xóa, chọn nhiều) → dùng factory `createListStore`:

```ts
// modules/Products/store/productStore.ts
import { createListStore } from '../../../core/createListStore';
import type { Product } from '../hooks/useProducts';

export const useProductStore = createListStore<Product>();
```

Factory này cấp sẵn: `selected/toggle/toggleAll/clearSelected/isSelected`, `showForm/editing/openCreate/openEdit/closeForm`, `deleting/askDelete/cancelDelete`. Trang chỉ việc gọi:

```tsx
const store = useProductStore();
// mở form tạo:   store.openCreate()
// mở form sửa:   store.openEdit(row)
// hỏi xóa:       store.askDelete(row)
```

Module có state đặc thù (vd Orders chỉ xem chi tiết, Payments có nhiều modal) thì viết store `create<...>()` thủ công ngay trong `store/` của module đó — vẫn giữ nguyên tắc "mỗi module một store".

### Ba tầng component

| Tầng | Vị trí | Vai trò |
|------|--------|---------|
| **UI kit** | `src/ui/` | nguyên tử, không gắn nghiệp vụ: `Button`, `TextInput`, `SelectInput`, `Loader`... |
| **Bố cục dùng chung** | `src/components/` | lắp **từ** UI kit, dùng ở mọi module: `DataTable`, `PageHeader`, `ConfirmDialog` |
| **Riêng module** | `modules/<M>/components/` | form/modal/tab chỉ module đó dùng |

Component lớn ở `src/components/` phải **gọi UI kit bên ngoài vào** thay vì tự dựng input/nút thô (vd `ConfirmDialog` dùng `Button`, `DataTable` dùng `Loader` + `EmptyState`). Khi viết component riêng module, cũng ưu tiên ghép từ `ui/`.

---

## Công thức: thêm 1 module danh sách CRUD mới

Ví dụ module **Categories**. Dựng đủ `config → hooks → store → components → pages`.

### Bước 1 — Config (`modules/Categories/config/categoryConfig.ts`)

```ts
export const CATEGORIES_ENDPOINT = '/categories';

export const CATEGORY_STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Tạm ngưng' },
];
```

### Bước 2 — Hooks + actions (`modules/Categories/hooks/useCategories.ts`)

```ts
import { apiClient } from '../../../core/apiClient';
import { useList } from '../../../core/useList';
import { CATEGORIES_ENDPOINT } from '../config/categoryConfig';

export interface Category { id: number; name: string; status: string; }

export function useCategories() {
  return useList<Category>(CATEGORIES_ENDPOINT);
}

export const categoryActions = {
  create: (body: Record<string, unknown>) => apiClient.post(CATEGORIES_ENDPOINT, body),
  update: (id: number, body: Record<string, unknown>) => apiClient.put(`${CATEGORIES_ENDPOINT}/${id}`, body),
  remove: (id: number) => apiClient.delete(`${CATEGORIES_ENDPOINT}/${id}`),
};
```

### Bước 3 — Store (`modules/Categories/store/categoryStore.ts`)

```ts
import { createListStore } from '../../../core/createListStore';
import type { Category } from '../hooks/useCategories';

export const useCategoryStore = createListStore<Category>();
```

### Bước 4 — Form modal (`modules/Categories/components/CategoryFormModal.tsx`)

Ghép từ UI kit (`TextInput`, `SelectInput`, `Button`) — xem mẫu `Suppliers/components/SupplierFormModal.tsx`.

### Bước 5 — Trang danh sách (`modules/Categories/pages/CategoryListPage.tsx`)

```tsx
import { useAuthStore } from '../../../core/authStore';
import PageHeader from '../../../components/PageHeader';
import DataTable, { type Column } from '../../../components/DataTable';
import ListToolbar from '../../../components/ListToolbar';
import Paginator from '../../../components/Paginator';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
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
    { key: 'name', header: 'Tên', render: (c) => <span className="fw-semibold">{c.name}</span> },
    { key: 'status', header: 'Trạng thái', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'actions', header: '', className: 'text-end',
      render: (c) => (
        <div className="d-flex gap-1 justify-content-end">
          {can('update', 'Category') && <Button size="sm" variant="light" icon="pencil" onClick={() => store.openEdit(c)} />}
          {can('destroy', 'Category') && <Button size="sm" variant="light" icon="trash" className="text-danger" onClick={() => store.askDelete(c)} />}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Danh mục"
        breadcrumb="Kinh doanh › Danh mục"
        actions={can('create', 'Category') && <Button variant="primary" icon="plus-lg" onClick={() => store.openCreate()}>Thêm danh mục</Button>}
      />
      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        toolbar={<ListToolbar search={query.search} onSearch={setSearch} status={query.status} onStatus={setStatus} statusOptions={CATEGORY_STATUS_OPTIONS} />}
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
```

### Bước 6 — Khai báo route (`App.tsx`)

```tsx
import CategoryListPage from './modules/Categories/pages/CategoryListPage';
// ...
<Route path="categories" element={
  <ProtectedRoute permission="categories.index"><CategoryListPage /></ProtectedRoute>
} />
```

### Bước 7 — Thêm vào menu (`layouts/AdminLayout.tsx`)

Trong nhóm phù hợp của mảng `MENU`:

```tsx
{ to: '/categories', label: 'Danh mục', icon: 'bi-tags', can: { action: 'index', subject: 'Category' } },
```

Menu tự ẩn nếu user không có quyền (`can()` trả false).

---

## Quy ước quan trọng

### Gọi API
- Luôn dùng `apiClient` (`core/apiClient.ts`). Interceptor tự gắn `Authorization` và `X-Organization-Id`, tự đăng xuất khi gặp `401`.
- Không hardcode base URL — đã cấu hình `/api`.

### Kiểm tra `success` theo truthy
Backend trả `success` lúc là boolean `true`, lúc là chuỗi `"true"`. Luôn kiểm tra truthy, **không** `=== true`.

### Số tiền & ngày
- Số tiền/số dư là **chuỗi** → dùng `formatCurrency()` (tự parse).
- Ngày dùng `formatDateTime()` (xử lý cả chuỗi đã format sẵn).

### Ảnh upload
- Upload qua hook `useUpload()` → trả URL `/uploads/...`.
- Hiển thị qua `resolveAsset(url)` trong `core/format.ts`.

### Phân quyền UI
- `can(action, subject)` ẩn/hiện nút và menu.
- `<ProtectedRoute permission="...">` chặn truy cập route.

## Assets & SCSS

- Ảnh tĩnh đặt trong `src/assets/images/`, import trực tiếp trong component.
- Style tùy biến viết trong `src/assets/scss/` (partials), gộp vào `main.scss`, import một lần ở `main.tsx`.
- Biến màu/spacing đặt trong `_variables.scss` — đổi theme tại một chỗ.

Chi tiết UI kit xem [ui-kit.md](ui-kit.md).

## Checklist trước khi mở PR (frontend)

- [ ] `npm run typecheck` sạch
- [ ] `npm run build` thành công
- [ ] Module mới đủ `config/hooks/store/components/pages` (tách `helpers/` khi có logic tính toán)
- [ ] Store UI cục bộ trong module (dùng `createListStore` cho CRUD chuẩn)
- [ ] Màn hình mới có route + quyền (`ProtectedRoute`) + menu (nếu cần)
- [ ] Dùng lại `ui/` và `components/` thay vì viết lại; component riêng ghép từ UI kit
- [ ] Nút/menu ẩn hiện đúng theo `can()`
