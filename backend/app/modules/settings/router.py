"""Router Settings — quản lý cấu hình hệ thống và bật/tắt bảo trì."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.response import success
from app.modules.auth.dependencies import require
from app.modules.settings import service
from app.modules.settings.models import Setting
from app.modules.settings.schemas import MaintenanceToggle, SettingUpsert

router = APIRouter(prefix="/settings", tags=["Core - Settings"])


@router.get("", summary="Danh sách cấu hình")
def index(
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("settings.index")),
) -> dict:
    items = db.scalars(select(Setting)).all()
    return success([{"key": s.key, "value": s.value, "description": s.description} for s in items])


@router.put("", summary="Tạo/cập nhật cấu hình")
def upsert(
    body: SettingUpsert,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("settings.update")),
) -> dict:
    s = service.set_value(db, body.key, body.value, body.description)
    return success({"key": s.key, "value": s.value}, "Đã lưu cấu hình.")


@router.get("/maintenance", summary="Trạng thái bảo trì")
def get_maintenance(db: Session = Depends(get_db)) -> dict:
    enabled = service.get_value(db, service.MAINTENANCE_KEY, "0") == "1"
    return success({"enabled": enabled})


@router.post("/maintenance", summary="Bật/tắt bảo trì")
def toggle_maintenance(
    body: MaintenanceToggle,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("settings.update")),
) -> dict:
    service.set_value(db, service.MAINTENANCE_KEY, "1" if body.enabled else "0", "Chế độ bảo trì")
    msg = "Đã bật chế độ bảo trì." if body.enabled else "Đã tắt chế độ bảo trì."
    return success({"enabled": body.enabled}, msg)
