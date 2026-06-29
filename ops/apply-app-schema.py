"""Apply small additive schema changes without touching existing data.

This project does not yet use Alembic. The script is intentionally limited to
idempotent ADD COLUMN operations needed by current app code.
"""
from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import inspect, text

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.core.database import engine  # noqa: E402


ORDER_COLUMNS = {
    "supplier_id": "INTEGER",
    "supplier_payable": "NUMERIC(18, 2) DEFAULT 0",
    "owner_user_id": "INTEGER",
    "owner_profit": "NUMERIC(18, 2) DEFAULT 0",
    "fulfillment_type": "VARCHAR(30)",
    "manual_fulfillment_required": "BOOLEAN DEFAULT false",
    "manual_contact_name": "VARCHAR(255)",
    "manual_contact_url": "TEXT",
    "manual_qr_image_url": "TEXT",
}


def _quote(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def ensure_columns(table: str, columns: dict[str, str]) -> list[str]:
    inspector = inspect(engine)
    existing = {col["name"] for col in inspector.get_columns(table)}
    added: list[str] = []
    with engine.begin() as conn:
        for name, ddl in columns.items():
            if name in existing:
                continue
            conn.execute(text(f"ALTER TABLE {_quote(table)} ADD COLUMN {_quote(name)} {ddl}"))
            added.append(name)
    return added


def main() -> None:
    added = ensure_columns("orders", ORDER_COLUMNS)
    if added:
        print("Added orders columns:", ", ".join(added))
    else:
        print("Schema already up to date.")


if __name__ == "__main__":
    main()
