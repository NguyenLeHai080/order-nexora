"""Dependencies xác thực & phân quyền cho FastAPI.

- get_current_user: giải mã JWT -> User.
- get_context: dựng RequestContext (user + org + roles + permissions) từ
  token và header X-Organization-Id.
- require(permission): factory tạo dependency chặn theo quyền.
"""
from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.modules.auth.access_control import resolve_roles_permissions
from app.modules.users.models import User

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise UnauthorizedError("Thiếu access token.")
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise UnauthorizedError("Token không hợp lệ hoặc đã hết hạn.")
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise UnauthorizedError("Tài khoản không tồn tại.")
    if user.status == "locked":
        raise ForbiddenError("Tài khoản đã bị khóa.")
    return user


def get_context(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_organization_id: int | None = Header(None, alias="X-Organization-Id"),
) -> RequestContext:
    """Ngữ cảnh request gồm tổ chức đang chọn và quyền trong tổ chức đó."""
    roles, permissions = resolve_roles_permissions(db, user.id, x_organization_id)
    return RequestContext(
        user_id=user.id,
        organization_id=x_organization_id,
        roles=roles,
        permissions=permissions,
    )


def require(permission: str):
    """Tạo dependency chặn nếu context không có quyền `permission`."""

    def _checker(ctx: RequestContext = Depends(get_context)) -> RequestContext:
        if not ctx.has_permission(permission):
            raise ForbiddenError(f"Thiếu quyền: {permission}")
        return ctx

    return _checker
