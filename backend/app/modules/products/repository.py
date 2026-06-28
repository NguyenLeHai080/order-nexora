"""Repository cho Product."""
from sqlalchemy.orm import Session

from app.core.repository import BaseRepository
from app.modules.products.models import Product


class ProductRepository(BaseRepository[Product]):
    searchable = ["name", "slug", "description"]
    sortable = ["id", "name", "base_price", "status", "sold_count", "created_at", "updated_at"]

    def __init__(self, db: Session):
        super().__init__(Product, db)
