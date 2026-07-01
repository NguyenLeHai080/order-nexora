"""Repository cho Category."""
from sqlalchemy.orm import Session

from app.core.repository import BaseRepository
from app.modules.categories.models import Category


class CategoryRepository(BaseRepository[Category]):
    searchable = ["name", "description"]
    sortable = ["id", "name", "sort_order", "status", "created_at", "updated_at"]

    def __init__(self, db: Session):
        super().__init__(Category, db)
