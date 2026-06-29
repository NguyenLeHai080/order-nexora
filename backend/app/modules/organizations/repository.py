"""Repository cho Organization."""
from sqlalchemy.orm import Session

from app.core.repository import BaseRepository
from app.modules.organizations.models import Organization


class OrganizationRepository(BaseRepository[Organization]):
    searchable = ["name", "slug"]
    sortable = ["id", "name", "slug", "status", "created_at", "updated_at"]

    def __init__(self, db: Session):
        super().__init__(Organization, db)
