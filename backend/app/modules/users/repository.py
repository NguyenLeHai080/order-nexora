"""Repository cho User + thao tác ví (cộng/trừ số dư an toàn)."""
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.core.repository import BaseRepository
from app.modules.users.models import User


class UserRepository(BaseRepository[User]):
    searchable = ["name", "email", "user_name"]
    sortable = ["id", "name", "email", "status", "balance", "created_at", "updated_at"]

    def __init__(self, db: Session):
        super().__init__(User, db)

    def adjust_balance(self, user: User, amount: Decimal) -> User:
        """Cộng (amount>0) hoặc trừ (amount<0) số dư. Không cho âm ví."""
        new_balance = (user.balance or Decimal("0")) + amount
        if new_balance < 0:
            raise AppException("Số dư không đủ để thực hiện giao dịch.")
        user.balance = new_balance
        self.db.commit()
        self.db.refresh(user)
        return user
