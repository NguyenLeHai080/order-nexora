"""Dịch DTO Cazyserver sang giá trị nội bộ (anti-corruption layer)."""
from __future__ import annotations

from app.integrations.cazyserver.schemas import CazyBalance


def balance_to_internal(balance: CazyBalance) -> dict:
    """Map số dư Cazy về shape balance nội bộ (giống các driver khác)."""
    return {
        "currency": balance.currency,
        "balance": str(balance.balance),
        "livemode": True,  # Cazy không tách test/live -> coi như live.
    }
