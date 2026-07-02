"""Schemas cho module Content — Article + Faq (admin CRUD)."""
from datetime import datetime

from pydantic import BaseModel, Field

_GROUP_PATTERN = "^(tips|news|policy)$"
_STATUS_PATTERN = "^(active|inactive)$"


class ArticleCreate(BaseModel):
    title: str
    slug: str | None = None
    category: str = ""
    category_key: str = "all"
    group: str = Field("tips", pattern=_GROUP_PATTERN)
    author: str | None = None
    excerpt: str | None = None
    image_url: str | None = None
    content: str | None = None
    published_at: datetime | None = None
    sort_order: int = 0
    status: str = Field("active", pattern=_STATUS_PATTERN)
    show_on_landing: bool = True


class ArticleUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    category: str | None = None
    category_key: str | None = None
    group: str | None = Field(None, pattern=_GROUP_PATTERN)
    author: str | None = None
    excerpt: str | None = None
    image_url: str | None = None
    content: str | None = None
    published_at: datetime | None = None
    sort_order: int | None = None
    status: str | None = Field(None, pattern=_STATUS_PATTERN)
    show_on_landing: bool | None = None


class ArticleOut(BaseModel):
    id: int
    title: str
    slug: str
    category: str
    category_key: str
    group: str
    author: str | None
    excerpt: str | None
    image_url: str | None
    content: str | None
    published_at: datetime | None
    sort_order: int
    status: str
    show_on_landing: bool
    organization_id: int | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class FaqCreate(BaseModel):
    question: str
    answer: str
    sort_order: int = 0
    status: str = Field("active", pattern=_STATUS_PATTERN)
    show_on_landing: bool = True


class FaqUpdate(BaseModel):
    question: str | None = None
    answer: str | None = None
    sort_order: int | None = None
    status: str | None = Field(None, pattern=_STATUS_PATTERN)
    show_on_landing: bool | None = None


class FaqOut(BaseModel):
    id: int
    question: str
    answer: str
    sort_order: int
    status: str
    show_on_landing: bool
    organization_id: int | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}
