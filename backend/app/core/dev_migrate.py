"""Migration nhẹ cho môi trường dev (SQLite).

`Base.metadata.create_all` chỉ tạo bảng còn THIẾU — nó KHÔNG thêm cột vào bảng đã
tồn tại. Khi thêm cột mới (vd `suppliers.config`), DB dev cũ sẽ thiếu cột đó. Hàm
`ensure_columns` thêm cột thiếu bằng ALTER TABLE, giữ nguyên dữ liệu dev.

CHỈ dùng cho dev. Production phải dùng Alembic migration đúng nghĩa.
"""
from __future__ import annotations

from sqlalchemy import Engine, text


def ensure_columns(engine: Engine, table: str, columns: dict[str, str]) -> list[str]:
    """Thêm các cột còn thiếu vào `table`. Trả danh sách cột vừa thêm.

    columns: {tên_cột: kiểu_DDL_SQL}, vd {"config": "JSON"}.
    Idempotent: cột đã có thì bỏ qua. Chỉ hỗ trợ SQLite (dialect dev mặc định).
    """
    if engine.dialect.name != "sqlite":
        return []

    added: list[str] = []
    with engine.begin() as conn:
        existing = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}
        for name, ddl in columns.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
                added.append(name)
    return added
