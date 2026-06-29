"""Router Auth — bám đúng endpoint dự án tham chiếu.

POST /api/auth/login, /logout, /forgot-password, /reset-password,
/switch-organization và GET /api/user.
Các route /auth/* không cần header X-Organization-Id.
"""
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.core.abilities import permissions_to_abilities
from app.core.database import get_db
from app.core.response import success
from app.modules.auth import service
from app.modules.auth.access_control import resolve_roles_permissions
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    SwitchOrganizationRequest,
)
from app.modules.users.models import User

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", summary="Đăng nhập")
def login(body: LoginRequest, db: Session = Depends(get_db)) -> dict:
    data = service.login(db, body.email, body.password)
    data["abilities"] = permissions_to_abilities(data["permissions"])
    return success(data, "Đăng nhập thành công.")


@router.post("/forgot-password", summary="Quên mật khẩu")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict:
    service.forgot_password(db, body.email)
    return success(message="Link reset đã được gửi vào Email")


@router.post("/reset-password", summary="Đặt lại mật khẩu")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict:
    service.reset_password(db, body.email, body.password, body.password_confirmation, body.token)
    return success(message="Mật khẩu đã được đặt lại")


@router.post("/logout", summary="Đăng xuất")
def logout(_user: User = Depends(get_current_user)) -> dict:
    # JWT stateless — client chỉ cần bỏ token. Production có thể thêm blacklist.
    return success(message="Đã đăng xuất")


@router.post("/switch-organization", summary="Chuyển tổ chức làm việc")
def switch_organization(
    body: SwitchOrganizationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    data = service.switch_organization(db, user, body.organization_id)
    data["abilities"] = permissions_to_abilities(data["permissions"])
    return success(data, "Đã chuyển tổ chức làm việc.")


# GET /api/user — đặt ngoài prefix /auth, mount ở main với prefix /api.
user_router = APIRouter(tags=["Auth"])


@user_router.get("/user", summary="Thông tin user đăng nhập + roles/permissions")
def current_user(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_organization_id: int | None = Header(None, alias="X-Organization-Id"),
) -> dict:
    roles, permissions = resolve_roles_permissions(db, user.id, x_organization_id)
    return success(
        {
            "user": {"id": user.id, "name": user.name},
            "roles": roles,
            "permissions": permissions,
            "abilities": permissions_to_abilities(permissions),
        }
    )
