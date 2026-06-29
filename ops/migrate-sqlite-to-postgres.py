from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import MetaData, create_engine, inspect, text


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Copy Order Nexora data from SQLite to PostgreSQL.")
    parser.add_argument("--sqlite-path", required=True, help="Path to order_nexora.db")
    parser.add_argument("--postgres-url", required=True, help="SQLAlchemy PostgreSQL URL")
    parser.add_argument("--truncate", action="store_true", help="Delete existing PostgreSQL rows first")
    return parser.parse_args()


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def reset_sequence(conn, table_name: str, column_name: str = "id") -> None:
    seq = conn.execute(text("SELECT pg_get_serial_sequence(:table_name, :column_name)"), {
        "table_name": table_name,
        "column_name": column_name,
    }).scalar()
    if not seq:
        return

    max_id = conn.execute(text(f"SELECT COALESCE(MAX({quote_ident(column_name)}), 0) FROM {quote_ident(table_name)}")).scalar()
    conn.execute(text("SELECT setval(:seq, :value, :called)"), {
        "seq": seq,
        "value": int(max_id or 0) + 1,
        "called": False,
    })


def build_valid_fk_values(sqlite_conn, sqlite_meta: MetaData, table) -> dict[str, set]:
    valid_values: dict[str, set] = {}
    for fk in table.foreign_keys:
        column_name = fk.parent.name
        referred_table = fk.column.table.name
        referred_column = fk.column.name
        if referred_table not in sqlite_meta.tables:
            continue

        referred = sqlite_meta.tables[referred_table]
        values = {
            row[0]
            for row in sqlite_conn.execute(referred.select().with_only_columns(referred.c[referred_column])).fetchall()
            if row[0] is not None
        }
        valid_values[column_name] = values
    return valid_values


def filter_orphan_rows(rows: list[dict], valid_fk_values: dict[str, set], table_name: str) -> list[dict]:
    if not valid_fk_values:
        return rows

    kept = []
    skipped = 0
    for row in rows:
        orphan_columns = [
            column
            for column, valid_values in valid_fk_values.items()
            if row.get(column) is not None and row.get(column) not in valid_values
        ]
        if orphan_columns:
            skipped += 1
            print(f"{table_name}: skipped orphan row id={row.get('id')} invalid_fk={','.join(orphan_columns)}")
            continue
        kept.append(row)

    if skipped:
        print(f"{table_name}: skipped {skipped} orphan rows")
    return kept


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parents[1]
    backend = root / "backend"
    sys.path.insert(0, str(backend))

    import app.database  # noqa: F401
    from app.core.database import Base

    sqlite_path = Path(args.sqlite_path).resolve()
    if not sqlite_path.exists():
        raise FileNotFoundError(f"SQLite database not found: {sqlite_path}")

    sqlite_engine = create_engine(f"sqlite:///{sqlite_path.as_posix()}")
    postgres_engine = create_engine(args.postgres_url, pool_pre_ping=True)

    Base.metadata.create_all(bind=postgres_engine)

    sqlite_meta = MetaData()
    sqlite_meta.reflect(bind=sqlite_engine)
    pg_inspector = inspect(postgres_engine)
    pg_tables = set(pg_inspector.get_table_names())
    tables = [table for table in Base.metadata.sorted_tables if table.name in sqlite_meta.tables and table.name in pg_tables]

    with postgres_engine.begin() as pg_conn:
        if args.truncate:
            for table in reversed(tables):
                pg_conn.execute(text(f"TRUNCATE TABLE {quote_ident(table.name)} RESTART IDENTITY CASCADE"))

        with sqlite_engine.connect() as sqlite_conn:
            for table in tables:
                source = sqlite_meta.tables[table.name]
                rows = [dict(row._mapping) for row in sqlite_conn.execute(source.select()).fetchall()]
                rows = filter_orphan_rows(rows, build_valid_fk_values(sqlite_conn, sqlite_meta, table), table.name)
                if not rows:
                    print(f"{table.name}: 0 rows")
                    continue

                pg_conn.execute(table.insert(), rows)
                if "id" in table.c:
                    reset_sequence(pg_conn, table.name, "id")
                print(f"{table.name}: {len(rows)} rows")

    print("Migration completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
