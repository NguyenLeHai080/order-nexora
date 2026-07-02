"""Repository cho Engagement."""
from sqlalchemy.orm import Session

from app.core.repository import BaseRepository
from app.modules.engagement.models import Engagement


class EngagementRepository(BaseRepository[Engagement]):
    searchable = ["content", "author_name", "title"]
    sortable = ["id", "rating", "status", "created_at"]

    def __init__(self, db: Session):
        super().__init__(Engagement, db)
