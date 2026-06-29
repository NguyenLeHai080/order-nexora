# UI Kit — thư viện component dùng chung

Catalog các component nguyên tử trong `src/ui/`. Mục tiêu: form và nút bấm trông **nhất quán** khắp dự án, dev mới ghép màn hình nhanh mà không tự chế lại input/button.

> Xem trực quan + thử tương tác tại **`/ui-kit`** trong ứng dụng (menu Hệ thống › UI Kit).

## Cách dùng

Import gọn qua barrel `src/ui/index.ts`:

```tsx
import { Button, TextInput, SelectInput, FormField } from '../../../ui';
```

Mọi component đều có TypeScript types export kèm (vd `ButtonProps`).

## Danh mục component

### Button
Nút bấm bọc react-bootstrap, thêm `loading` và `icon`.

```tsx
<Button variant="primary" icon="plus-lg">Thêm mới</Button>
<Button variant="danger" loading>Đang xóa</Button>
<Button variant="light" icon="trash" className="text-danger" />   {/* chỉ icon */}
```

| Prop | Kiểu | Mặc định | Ý nghĩa |
|------|------|----------|---------|
| `variant` | `primary \| secondary \| success \| danger \| warning \| info \| light \| link` | `primary` | Màu theo theme |
| `size` | `sm \| lg` | — | Kích thước |
| `loading` | `boolean` | `false` | Hiện spinner + khóa nút |
| `icon` | `string` | — | Tên bootstrap-icon (không kèm `bi-`) |

Kế thừa mọi prop của react-bootstrap `Button` (`onClick`, `type`, `disabled`...).

### FormField
Bọc label + helper + lỗi cho một control bất kỳ. Các input bên dưới dùng lại nó.

```tsx
<FormField label="Tùy chỉnh" required error="Có lỗi">
  <input className="form-control" />
</FormField>
```

| Prop | Kiểu | Ý nghĩa |
|------|------|---------|
| `label` | `ReactNode` | Nhãn phía trên |
| `required` | `boolean` | Hiện dấu `*` đỏ |
| `help` | `ReactNode` | Gợi ý (ẩn khi có `error`) |
| `error` | `ReactNode` | Thông báo lỗi |
| `htmlFor` | `string` | Gắn `<label for>` với control |

### TextInput
Ô nhập văn bản (text/email/password/number) kèm label + lỗi.

```tsx
<TextInput id="name" label="Họ tên" required value={name}
  onChange={(e) => setName(e.target.value)} help="Tối đa 100 ký tự" />
<TextInput id="email" label="Email" type="email" error="Email không hợp lệ" />
```

Kế thừa prop của `Form.Control`. Đặt `type` để đổi loại nhập.

### SelectInput
Dropdown kèm label + lỗi. Truyền `options` để tự sinh, hoặc children tùy biến.

```tsx
<SelectInput id="status" label="Trạng thái" placeholder="-- Chọn --"
  value={status} onChange={(e) => setStatus(e.target.value)}
  options={[{ value: 'active', label: 'Hoạt động' }, { value: 'locked', label: 'Đã khóa' }]} />
```

| Prop | Kiểu | Ý nghĩa |
|------|------|---------|
| `options` | `{ value, label }[]` | Danh sách lựa chọn |
| `placeholder` | `string` | Mục rỗng đầu danh sách |

### TextareaInput
Văn bản nhiều dòng. Prop `rows` (mặc định 3).

```tsx
<TextareaInput id="note" label="Ghi chú" rows={4} />
```

### Checkbox
Ô tick hoặc công tắc (`type="switch"`).

```tsx
<Checkbox id="agree" label="Đồng ý" checked={ok} onChange={() => setOk(!ok)} />
<Checkbox id="noti" type="switch" label="Bật thông báo" />
```

### ImageUpload
Tải ảnh qua API (`useUpload`) + preview. Trả URL qua `onChange`.

```tsx
<ImageUpload label="Ảnh QR" value={qrUrl} onChange={setQrUrl} help="JPG/PNG ≤ 5MB" />
```

| Prop | Kiểu | Ý nghĩa |
|------|------|---------|
| `value` | `string` | URL ảnh hiện tại |
| `onChange` | `(url) => void` | Gọi khi upload xong |
| `previewHeight` | `number` | Chiều cao preview (px), mặc định 120 |

### Loader
Vùng đang tải (spinner + nhãn), căn giữa.

```tsx
<Loader label="Đang tải dữ liệu..." />
```

### EmptyState
Trạng thái rỗng: icon + tiêu đề + mô tả + nút hành động.

```tsx
<EmptyState icon="inbox" title="Chưa có dữ liệu"
  description="Danh sách trống."
  action={<Button icon="plus-lg" size="sm">Thêm mới</Button>} />
```

### SectionCard
Khung card có tiêu đề nhỏ, nhóm nội dung trong trang.

```tsx
<SectionCard title="Thông tin chung">...</SectionCard>
```

## Quy ước & style

- Style của UI kit nằm ở `src/assets/scss/_ui-kit.scss`, class tiền tố `ui-` để tránh đụng bootstrap.
- Màu sắc lấy từ biến trong `_variables.scss` — **không hardcode mã màu** trong component.
- Khi cần component mới dùng ≥ 2 nơi: thêm vào `src/ui/`, export trong `index.ts`, bổ sung demo vào trang `/ui-kit` và mục ở đây.

## Khi nào dùng `ui/` vs `components/`

- **`src/ui/`** — component **nguyên tử**, không gắn nghiệp vụ: Button, Input, Select, Loader...
- **`src/components/`** — component **bố cục** ghép từ nhiều phần, có thiên hướng nghiệp vụ chung: `DataTable`, `Paginator`, `PageHeader`, `ListToolbar`, `StatCard`, `StatusBadge`, `ConfirmDialog`.
- **`modules/<X>/components/`** — component chỉ dùng trong một module (form, modal riêng).
