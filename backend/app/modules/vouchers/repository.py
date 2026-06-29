"""Repository cho Voucher."""
from sqlalchemy.orm import Session

from app.core.repository import BaseRepository
from app.modules.vouchers.models import Voucher


class VoucherRepository(BaseRepository[Voucher]):
    searchable = ["code", "description"]
    sortable = ["id", "code", "discount_value", "used_count", "status", "created_at", "updated_at"]

    def __init__(self, db: Session):
        super().__init__(Voucher, db)
