"""Schemas cho module Inventory."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class StockInBody(BaseModel):
    """Nhập kho — tăng tồn."""

    product_id: int
    quantity: int = Field(..., gt=0)
    reason: str | None = None
    note: str | None = None


class AdjustBody(BaseModel):
    """Điều chỉnh tồn — delta có dấu (kiểm kê, hao hụt...)."""

    product_id: int
    quantity_delta: int = Field(..., description="Có dấu: dương tăng, âm giảm")
    reason: str | None = None
    note: str | None = None


class StockMovementOut(BaseModel):
    id: int
    product_id: int | None
    product_name: str
    type: str
    quantity_delta: int
    balance_after: int
    tracks_stock: bool = True
    unit_cost: Decimal | None = None
    unit_price: Decimal | None = None
    cash_in: Decimal = Decimal("0.00")
    cash_out: Decimal = Decimal("0.00")
    reason: str | None
    note: str | None
    ref_type: str | None
    ref_id: int | None
    user_id: int | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class StockRow(BaseModel):
    """Một dòng tồn kho hiện tại theo sản phẩm (gộp cả kho riêng + tồn NCC)."""

    product_id: int
    name: str
    category_name: str | None = None
    supplier_name: str | None = None
    manages_local: bool  # True = tự quản kho local; False = tồn nằm bên NCC
    quantity: int  # tồn hiệu lực để hiển thị (local nếu manages_local, ngược lại provider)
    local_quantity: int
    provider_quantity: int | None = None
    stock_status: str
    low_stock_threshold: int
    is_low: bool


class StockSummary(BaseModel):
    """Thẻ tổng quan kho."""

    total: int
    in_stock: int
    out_of_stock: int
    low_stock: int


class CashflowSummary(BaseModel):
    """Tổng quan thu/chi sổ kho trong khoảng thời gian (theo dòng tiền movement)."""

    cash_in: Decimal  # tổng THU (doanh thu bán hàng)
    cash_out: Decimal  # tổng CHI (nhập kho + giá vốn trả NCC + hoàn tiền)
    profit: Decimal  # lợi nhuận thuần = cash_in - cash_out
    stock_in_cost: Decimal  # CHI riêng phần nhập kho local
    revenue: Decimal  # THU riêng phần bán hàng (type=out)
    movement_count: int
