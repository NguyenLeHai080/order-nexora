"""Repository cho module Partner."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.repository import BaseRepository
from app.modules.partner.models import ProviderOrderRef, ProviderWebhookEvent


class ProviderOrderRefRepository(BaseRepository[ProviderOrderRef]):
    searchable = ["external_order_id", "provider_order_id"]
    sortable = ["id", "provider_status", "created_at", "updated_at"]

    def __init__(self, db: Session):
        super().__init__(ProviderOrderRef, db)

    def by_order(self, order_id: int, driver: str = "vdstore") -> ProviderOrderRef | None:
        stmt = select(ProviderOrderRef).where(
            ProviderOrderRef.order_id == order_id,
            ProviderOrderRef.driver == driver,
        )
        return self.db.scalars(stmt).first()

    def by_provider_order_id(
        self, provider_order_id: str, driver: str = "vdstore"
    ) -> ProviderOrderRef | None:
        stmt = select(ProviderOrderRef).where(
            ProviderOrderRef.provider_order_id == provider_order_id,
            ProviderOrderRef.driver == driver,
        )
        return self.db.scalars(stmt).first()

    def by_external_order_id(
        self, external_order_id: str, driver: str = "vdstore"
    ) -> ProviderOrderRef | None:
        stmt = select(ProviderOrderRef).where(
            ProviderOrderRef.external_order_id == external_order_id,
            ProviderOrderRef.driver == driver,
        )
        return self.db.scalars(stmt).first()


class ProviderWebhookEventRepository(BaseRepository[ProviderWebhookEvent]):
    searchable = ["event_id", "event_type", "provider_order_id"]
    sortable = ["id", "status", "created_at"]

    def __init__(self, db: Session):
        super().__init__(ProviderWebhookEvent, db)

    def by_event_id(self, event_id: str, driver: str = "vdstore") -> ProviderWebhookEvent | None:
        stmt = select(ProviderWebhookEvent).where(
            ProviderWebhookEvent.event_id == event_id,
            ProviderWebhookEvent.driver == driver,
        )
        return self.db.scalars(stmt).first()
