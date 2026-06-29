"""Router Roles & Permissions — quản lý vai trò và quyền cho RBAC.

- GET /permissions: liệt kê toàn bộ quyền (để admin tick chọn cho role).
- /roles: CRUD vai trò + gán permission.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import AppException, NotFoundError
from app.core.response import success
from app.modules.auth.dependencies import require
from app.modules.permissions.models import Permission, Role
from app.modules.permissions.schemas import (
    PermissionOut,
    RoleCreate,
    RoleUpdate,
)

# Router quyền (chỉ đọc danh sách).
permissions_router = APIRouter(prefix="/permissions", tags=["Permissions"])
# Router vai trò (CRUD).
router = APIRouter(prefix="/roles", tags=["Roles"])


def _role_out(role: Role) -> dict:
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "permission_ids": [p.id for p in role.permissions],
        "permissions": sorted(p.name for p in role.permissions),
    }


@permissions_router.get("", summary="Danh sách toàn bộ quyền")
def list_permissions(
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("permissions.index")),
) -> dict:
    perms = db.scalars(select(Permission).order_by(Permission.name)).all()
    return success([PermissionOut.model_validate(p).model_dump() for p in perms])


@router.get("", summary="Danh sách vai trò")
def index(
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("roles.index")),
) -> dict:
    roles = db.scalars(select(Role).order_by(Role.id)).all()
    return success([_role_out(r) for r in roles])


@router.get("/{role_id}", summary="Chi tiết vai trò")
def show(
    role_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("roles.show")),
) -> dict:
    role = db.get(Role, role_id)
    if role is None:
        raise NotFoundError("Không tìm thấy vai trò.")
    return {"data": _role_out(role), "success": "true"}


@router.post("", status_code=201, summary="Tạo vai trò")
def create(
    body: RoleCreate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("roles.store")),
) -> dict:
    if db.scalars(select(Role).where(Role.name == body.name)).first():
        raise AppException("Tên vai trò đã tồn tại.", status_code=400)
    role = Role(name=body.name, description=body.description)
    role.permissions = _load_permissions(db, body.permission_ids)
    db.add(role)
    db.commit()
    db.refresh(role)
    return {"data": _role_out(role), "success": "true", "message": "Tạo vai trò thành công!"}


@router.put("/{role_id}", summary="Cập nhật vai trò")
def update(
    role_id: int,
    body: RoleUpdate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("roles.update")),
) -> dict:
    role = db.get(Role, role_id)
    if role is None:
        raise NotFoundError("Không tìm thấy vai trò.")
    if body.name is not None:
        role.name = body.name
    if body.description is not None:
        role.description = body.description
    if body.permission_ids is not None:
        role.permissions = _load_permissions(db, body.permission_ids)
    db.commit()
    db.refresh(role)
    return {"data": _role_out(role), "success": "true", "message": "Cập nhật vai trò thành công."}


@router.delete("/{role_id}", summary="Xóa vai trò")
def destroy(
    role_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("roles.destroy")),
) -> dict:
    role = db.get(Role, role_id)
    if role is None:
        raise NotFoundError("Không tìm thấy vai trò.")
    db.delete(role)
    db.commit()
    return success(message="Đã xóa vai trò thành công!")


def _load_permissions(db: Session, ids: list[int]) -> list[Permission]:
    if not ids:
        return []
    return list(db.scalars(select(Permission).where(Permission.id.in_(ids))).all())
