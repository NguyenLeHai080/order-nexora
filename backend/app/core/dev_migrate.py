"""Migration nhẹ cho môi trường dev (SQLite + Postgres).

`Base.metadata.create_all` chỉ tạo bảng còn THIẾU — nó KHÔNG thêm cột vào bảng đã
tồn tại. Khi thêm cột mới (vd `products.image_url`), DB cũ sẽ thiếu cột đó. Hàm
`ensure_columns` thêm cột thiếu bằng ALTER TABLE, giữ nguyên dữ liệu.

Hỗ trợ SQLite (PRAGMA + ALTER) và PostgreSQL (`ADD COLUMN IF NOT EXISTS`).
DDL trong `_DEV_SCHEMA` phải hợp lệ cho CẢ HAI dialect — dùng `BOOLEAN DEFAULT false`
(không phải `DEFAULT 0/1`, vốn lỗi trên Postgres).

Đây là tiện ích dev/cutover. Production thực thụ nên dùng Alembic migration.
"""
from __future__ import annotations

from sqlalchemy import Engine, text


def ensure_columns(engine: Engine, table: str, columns: dict[str, str]) -> list[str]:
    """Thêm các cột còn thiếu vào `table`. Trả danh sách cột vừa thêm.

    columns: {tên_cột: kiểu_DDL_SQL}, vd {"image_url": "VARCHAR(500)"}.
    Idempotent: cột đã có thì bỏ qua. Hỗ trợ SQLite và PostgreSQL.
    """
    dialect = engine.dialect.name
    if dialect == "sqlite":
        return _ensure_columns_sqlite(engine, table, columns)
    if dialect in {"postgresql", "postgres"}:
        return _ensure_columns_postgres(engine, table, columns)
    return []


def _ensure_columns_sqlite(engine: Engine, table: str, columns: dict[str, str]) -> list[str]:
    """SQLite không có `ADD COLUMN IF NOT EXISTS` — tự đọc PRAGMA để biết cột đã có."""
    added: list[str] = []
    with engine.begin() as conn:
        existing = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}
        for name, ddl in columns.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
                added.append(name)
    return added


def _ensure_columns_postgres(engine: Engine, table: str, columns: dict[str, str]) -> list[str]:
    """Postgres hỗ trợ `ADD COLUMN IF NOT EXISTS` (>= 9.6) — idempotent ở tầng DDL.

    Đối chiếu information_schema trước để báo đúng cột nào vừa thêm (cho log).
    """
    added: list[str] = []
    with engine.begin() as conn:
        existing = {
            row[0]
            for row in conn.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = :t"
                ),
                {"t": table},
            )
        }
        for name, ddl in columns.items():
            if name not in existing:
                conn.execute(text(f'ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {name} {ddl}'))
                added.append(name)
    return added


# Bản đồ cột "mới" theo từng bảng — nguồn chân lý duy nhất cho cả lifespan app
# (main.py) lẫn seed thủ công. Khi thêm cột mới vào model, bổ sung ở đây để DB cũ
# (SQLite hoặc Postgres đã tồn tại trước cột) không bị thiếu cột.
# DDL phải hợp lệ cho CẢ HAI dialect: boolean dùng `DEFAULT false/true`, KHÔNG `0/1`.
_DEV_SCHEMA: dict[str, dict[str, str]] = {
    "suppliers": {"config": "JSON"},
    "categories": {"sort_order": "INTEGER DEFAULT 0"},
    "products": {
        "quantity": "INTEGER DEFAULT 0",
        "low_stock_threshold": "INTEGER DEFAULT 0",
        "warranty_days": "INTEGER DEFAULT 0",
        "name_en": "VARCHAR(255)",
        "category_name": "VARCHAR(255)",
        "category_id": "INTEGER",
        "image_url": "VARCHAR(500)",
        "regular_price": "NUMERIC(18, 2)",
        "provider_discount_percent": "NUMERIC(7, 2)",
        "delivery_type": "VARCHAR(30)",
        "provider_quantity": "INTEGER",
    },
    "stock_movements": {
        "tracks_stock": "BOOLEAN DEFAULT true",
        "unit_cost": "NUMERIC(18, 2)",
        "unit_price": "NUMERIC(18, 2)",
        "cash_in": "NUMERIC(18, 2) DEFAULT 0",
        "cash_out": "NUMERIC(18, 2) DEFAULT 0",
    },
    "orders": {
        "supplier_id": "INTEGER",
        "supplier_payable": "NUMERIC(18, 2) DEFAULT 0",
        "owner_user_id": "INTEGER",
        "owner_profit": "NUMERIC(18, 2) DEFAULT 0",
        "fulfillment_type": "VARCHAR(30)",
        "manual_fulfillment_required": "BOOLEAN DEFAULT false",
        "manual_contact_name": "VARCHAR(255)",
        "manual_contact_url": "TEXT",
        "manual_qr_image_url": "TEXT",
    },
}


def ensure_dev_schema(engine: Engine) -> dict[str, list[str]]:
    """Thêm mọi cột còn thiếu (SQLite/Postgres). Bảng mới do create_all lo.

    Trả {bảng: [cột vừa thêm]} để log. Idempotent — chạy bao nhiêu lần cũng được.
    """
    return {
        table: added
        for table, columns in _DEV_SCHEMA.items()
        if (added := ensure_columns(engine, table, columns))
    }
