# Hướng dẫn Backend

Tài liệu cho backend dev: cấu trúc một module, và **hướng dẫn từng bước thêm endpoint/module mới**.

## Cấu trúc một module

Mỗi module nằm trong `app/modules/<tên>/` theo khuôn:

```
modules/suppliers/
├── __init__.py     # docstring mô tả module
├── models.py       # SQLAlchemy model (bảng)
├── schemas.py      # Pydantic schema (request/response)
├── repository.py   # truy vấn dữ liệu (kế thừa BaseRepository)
├── router.py       # endpoint HTTP
└── service.py      # logic nghiệp vụ (chỉ khi cần)
```

Trách nhiệm từng tầng xem [architecture.md](architecture.md#kiến-trúc-phân-lớp-backend).

---

## Công thức: thêm 1 endpoint vào module có sẵn

Ví dụ: thêm `GET /api/suppliers/active` trả danh sách nhà cung cấp đang hoạt động.

```python
# trong app/modules/suppliers/router.py
@router.get("/active", summary="Nhà cung cấp đang hoạt động")
def active(
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(require("suppliers.index")),
) -> dict:
    repo = SupplierRepository(db)
    items = repo.list_active(ctx.organization_id)   # thêm method ở repository
    return success([_out(i) for i in items])
```

Quy tắc:
- **Luôn** khai báo `summary` (hiện trên Swagger).
- **Luôn** gắn `require("subject.action")` trừ khi endpoint công khai.
- Trả về qua `success(...)` / `paginated(...)` để giữ envelope thống nhất.
- Route tĩnh (`/active`) phải đặt **trước** route động (`/{supplier_id}`) nếu trùng tiền tố, tránh bị nuốt.

---

## Công thức: thêm 1 module nghiệp vụ mới

Ví dụ tạo module **categories** (danh mục sản phẩm). Làm theo 7 bước.

### Bước 1 — Tạo thư mục & `__init__.py`

```
app/modules/categories/__init__.py
```
```python
"""Module Categories — danh mục sản phẩm.

CRUD danh mục, gắn sản phẩm vào danh mục.
"""
```

### Bước 2 — Model (`models.py`)

Dùng các mixin có sẵn trong `core/models.py`: `PKMixin` (id tự tăng), `TimestampMixin` (created_at/updated_at), `OrgScopedMixin` (organization_id cho multi-tenant).

```python
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin

class Category(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
```

> Đăng ký model để bảng được tạo: thêm `from app.modules.categories.models import Category  # noqa: F401` vào `app/database/__init__.py`.

### Bước 3 — Schema (`schemas.py`)

```python
from pydantic import BaseModel, Field

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    status: str = Field("active", pattern="^(active|inactive)$")

class CategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    status: str | None = Field(None, pattern="^(active|inactive)$")

class CategoryOut(BaseModel):
    id: int
    name: str
    status: str
    model_config = {"from_attributes": True}
```

### Bước 4 — Repository (`repository.py`)

```python
from sqlalchemy.orm import Session
from app.core.repository import BaseRepository
from app.modules.categories.models import Category

class CategoryRepository(BaseRepository[Category]):
    searchable = ["name"]
    sortable = ["id", "name", "status", "created_at"]

    def __init__(self, db: Session):
        super().__init__(Category, db)
```

`BaseRepository` đã cho sẵn `get / create / update / delete / bulk_delete / paginate`. Chỉ thêm method khi có truy vấn đặc thù.

### Bước 5 — Router (`router.py`)

Sao chép khuôn từ `suppliers/router.py` (CRUD chuẩn), đổi tên entity. Bộ 5 endpoint: `index / show / create / update / destroy`.

### Bước 6 — Đăng ký router

Trong `app/api.py`, thêm import và đưa vào danh sách `_collect_routers()`:

```python
from app.modules.categories.router import router as categories_router
# ...
return [ ..., categories_router ]
```

### Bước 7 — Quyền (permissions) & test

1. Thêm các quyền `categories.index / show / store / update / destroy` vào `app/seed.py`, chạy lại seed.
2. Viết test trong `tests/` (xem mẫu `test_business_flow.py`).
3. Chạy `ruff check . && pytest -q`.

---

## Quy ước & lưu ý quan trọng

### Envelope không đồng nhất ở vài route
- Helper `success()` / `paginated()` trả `success` kiểu **boolean** `true`.
- Một số route show/create/update trả thủ công `"success": "true"` (kiểu **chuỗi**).
- **Frontend phải kiểm tra theo truthy**, không so sánh `=== true`.

### Kiểu dữ liệu serialize
- Trường `Decimal` (số tiền, số dư) được serialize thành **chuỗi** → FE parse trước khi tính.
- Datetime của log-activities là chuỗi đã format sẵn `HH:MM:SS dd/mm/YYYY`.

### Bộ lọc list chuẩn (mọi endpoint danh sách)
`search, status, from_date, to_date, sort_by (mặc định created_at), sort_order (mặc định desc), limit (mặc định 10, 1–100), page (mặc định 1)`. Chi tiết: [api/conventions.md](api/conventions.md).

### Multi-tenant
- Model có cột `organization_id` sẽ tự được `BaseRepository` lọc theo tổ chức khi truyền `organization_id=ctx.organization_id`.
- Lấy tổ chức hiện tại từ `RequestContext` (`ctx.organization_id`), nguồn là header `X-Organization-Id`.

### Phân quyền
- Mỗi route gắn `require("subject.action")`.
- Vai trò `admin` bỏ qua mọi kiểm tra quyền.
- `subject` suy ra từ tên quyền: `categories` → `Category` (xem `core/abilities.py`).

## Checklist trước khi mở PR (backend)

- [ ] `ruff check .` sạch
- [ ] `pytest -q` pass
- [ ] Endpoint mới có `summary` + `require(...)`
- [ ] Quyền mới đã thêm vào `seed.py`
- [ ] Trả envelope chuẩn (`success` / `paginated`)
- [ ] Có test cho luồng chính
