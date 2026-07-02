"""Repositories cho module Content — Article + Faq."""
from sqlalchemy.orm import Session

from app.core.repository import BaseRepository
from app.modules.content.models import Article, Faq


class ArticleRepository(BaseRepository[Article]):
    searchable = ["title", "excerpt", "category"]
    sortable = ["id", "title", "sort_order", "published_at", "created_at", "status"]

    def __init__(self, db: Session):
        super().__init__(Article, db)


class FaqRepository(BaseRepository[Faq]):
    searchable = ["question", "answer"]
    sortable = ["id", "sort_order", "status", "created_at"]

    def __init__(self, db: Session):
        super().__init__(Faq, db)
