"""Schemas công khai cho landing page — CHỈ các trường an toàn để lộ ra ngoài.

So với ProductOut nội bộ, bản này CỐ TÌNH bỏ: base_price, markup_percent,
markup_amount, provider_discount_percent, supplier_id, supplier_name,
external_id, organization_id, owner_* — tránh rò rỉ giá vốn/biên lợi nhuận/NCC.
`price` = giá bán cuối (sale_price); `regular_price` chỉ để hiển thị gạch giá.
"""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class PublicProductOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None = None
    name_en: str | None = None
    category_id: int | None = None
    category_name: str | None = None
    image_url: str | None = None
    price: Decimal  # = sale_price (giá khách trả)
    regular_price: Decimal | None = None  # giá niêm yết để gạch ngang (nếu > price)
    delivery_type: str | None = None
    warranty_days: int = 0
    stock_status: str = "in_stock"
    sold_count: int = 0
    created_at: datetime | None = None  # ngày tạo (hiển thị trên card dịch vụ)


class PublicCategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None = None
    product_count: int = 0


class PublicArticleOut(BaseModel):
    """Bài viết Thủ thuật/Tin tức công khai. `content` chỉ trả ở endpoint chi tiết."""

    id: int
    title: str
    slug: str
    category: str = ""
    category_key: str = "all"
    group: str = "tips"
    author: str | None = None
    excerpt: str | None = None
    image_url: str | None = None
    published_at: datetime | None = None
    content: str | None = None


class PublicFaqOut(BaseModel):
    id: int
    question: str
    answer: str
