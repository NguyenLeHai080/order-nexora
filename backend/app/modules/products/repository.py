"""Repository cho Product."""
from sqlalchemy.orm import Session

from app.core.pagination import ListParams
from app.core.repository import BaseRepository
from app.modules.products.models import Product


class ProductRepository(BaseRepository[Product]):
    searchable = ["name", "slug", "description"]
    sortable = ["id", "name", "base_price", "status", "sold_count", "created_at", "updated_at"]

    def __init__(self, db: Session):
        super().__init__(Product, db)

    def _apply_filters(self, stmt, params: ListParams, organization_id: int | None):
        stmt = super()._apply_filters(stmt, params, organization_id)
        # Lọc theo nhà cung cấp (tab NCC ở FE).
        if params.supplier_id is not None:
            stmt = stmt.where(Product.supplier_id == params.supplier_id)
        return stmt
