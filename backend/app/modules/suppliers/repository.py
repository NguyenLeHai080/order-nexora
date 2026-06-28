"""Repository cho Supplier."""
from sqlalchemy.orm import Session

from app.core.repository import BaseRepository
from app.modules.suppliers.models import Supplier


class SupplierRepository(BaseRepository[Supplier]):
    searchable = ["name", "note"]
    sortable = ["id", "name", "status", "created_at", "updated_at"]

    def __init__(self, db: Session):
        super().__init__(Supplier, db)
