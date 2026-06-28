"""Router Users — CRUD, đổi trạng thái, điều chỉnh số dư ví."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.core.security import hash_password
from app.modules.auth.dependencies import require
from app.modules.users.models import User, UserRole, organization_user
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import (
    BalanceAdjust,
    BulkIdsRequest,
    BulkStatusRequest,
    UserCreate,
    UserOut,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["Users"])


def _out(u: User) -> dict:
    return UserOut.model_validate(u).model_dump(mode="json")


@router.get("/stats", summary="Thống kê người dùng")
def stats(
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("users.index")),
) -> dict:
    from sqlalchemy import func

    total = db.scalar(select(func.count()).select_from(User)) or 0
    active = db.scalar(select(func.count()).select_from(User).where(User.status == "active")) or 0
    return success({"total": total, "active": active, "locked": total - active})


@router.post("/bulk-delete", summary="Xóa hàng loạt người dùng")
def bulk_delete(
    body: BulkIdsRequest,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("users.destroy")),
) -> dict:
    UserRepository(db).bulk_delete(body.ids)
    return success(message="Đã xóa thành công các người dùng được chọn!")


@router.patch("/bulk-status", summary="Cập nhật trạng thái hàng loạt")
def bulk_status(
    body: BulkStatusRequest,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("users.update")),
) -> dict:
    db.query(User).filter(User.id.in_(body.ids)).update(
        {User.status: body.status}, synchronize_session=False
    )
    db.commit()
    return success(message="Cập nhật trạng thái người dùng thành công.")


@router.get("", summary="Danh sách người dùng")
def index(
    params: ListParams = Depends(list_params),
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("users.index")),
) -> dict:
    items, total = UserRepository(db).paginate(params)
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.get("/{user_id}", summary="Chi tiết người dùng")
def show(
    user_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("users.show")),
) -> dict:
    obj = db.get(User, user_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy người dùng.")
    return {"data": _out(obj), "success": "true"}


@router.post("", status_code=201, summary="Tạo người dùng mới")
def create(
    body: UserCreate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("users.store")),
) -> dict:
    repo = UserRepository(db)
    obj = repo.create(
        name=body.name,
        email=body.email,
        user_name=body.user_name,
        password=hash_password(body.password),
        status=body.status,
    )
    # Gán tổ chức + vai trò.
    for org_id in body.organization_ids:
        db.execute(organization_user.insert().values(organization_id=org_id, user_id=obj.id))
    for role_id in body.role_ids:
        db.add(UserRole(user_id=obj.id, role_id=role_id, organization_id=None))
    db.commit()
    return {"data": _out(obj), "success": "true", "message": "Người dùng đã được tạo thành công!"}


@router.put("/{user_id}", summary="Cập nhật người dùng")
def update(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("users.update")),
) -> dict:
    repo = UserRepository(db)
    obj = repo.get(user_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy người dùng.")
    data = body.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        data["password"] = hash_password(data["password"])
    obj = repo.update(obj, **data)
    return {"data": _out(obj), "success": "true", "message": "Cập nhật người dùng thành công."}


@router.delete("/{user_id}", summary="Xóa người dùng")
def destroy(
    user_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("users.destroy")),
) -> dict:
    repo = UserRepository(db)
    obj = repo.get(user_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy người dùng.")
    repo.delete(obj)
    return success(message="Đã xóa người dùng thành công!")


@router.post("/{user_id}/balance", summary="Cộng/trừ số dư ví (Admin)")
def adjust_balance(
    user_id: int,
    body: BalanceAdjust,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("users.update")),
) -> dict:
    repo = UserRepository(db)
    obj = repo.get(user_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy người dùng.")
    obj = repo.adjust_balance(obj, body.amount)
    return success({"id": obj.id, "balance": str(obj.balance)}, "Điều chỉnh số dư thành công.")
