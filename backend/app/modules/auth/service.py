"""Service xử lý nghiệp vụ Auth: login, switch-org, forgot/reset password."""
import secrets

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.modules.auth.access_control import resolve_roles_permissions, user_organization_ids
from app.modules.users.models import User, UserPreference

# Lưu token reset tạm trong bộ nhớ (demo). Production nên lưu DB/Redis kèm hạn.
_reset_tokens: dict[str, str] = {}


def authenticate(db: Session, login: str, password: str) -> User:
    stmt = select(User).where(or_(User.email == login, User.user_name == login))
    user = db.scalars(stmt).first()
    if user is None or not verify_password(password, user.password):
        raise UnauthorizedError("Email hoặc mật khẩu không đúng.")
    if user.status == "locked":
        raise AppException("Tài khoản đã bị khóa.", 403)
    return user


def _resolve_current_org(db: Session, user: User, available_ids: list[int]) -> int | None:
    """Lấy current_organization_id theo quy ước dự án tham chiếu."""
    pref = db.scalars(select(UserPreference).where(UserPreference.user_id == user.id)).first()
    if pref and pref.current_organization_id in available_ids:
        return pref.current_organization_id
    # Chỉ có đúng 1 tổ chức -> tự gán và lưu preference.
    if len(available_ids) == 1:
        org_id = available_ids[0]
        _save_preference(db, user.id, org_id)
        return org_id
    # Nhiều tổ chức, chưa có preference hợp lệ -> null (frontend cần màn chọn).
    return None


def _save_preference(db: Session, user_id: int, organization_id: int) -> None:
    pref = db.scalars(select(UserPreference).where(UserPreference.user_id == user_id)).first()
    if pref is None:
        pref = UserPreference(user_id=user_id, current_organization_id=organization_id)
        db.add(pref)
    else:
        pref.current_organization_id = organization_id
    db.commit()


def login(db: Session, login_str: str, password: str) -> dict:
    user = authenticate(db, login_str, password)
    available_ids = user_organization_ids(db, user.id)
    current_org = _resolve_current_org(db, user, available_ids)
    roles, permissions = resolve_roles_permissions(db, user.id, current_org)

    from app.modules.organizations.models import Organization

    orgs = db.scalars(select(Organization).where(Organization.id.in_(available_ids))).all()
    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "Bearer",
        "user": {"id": user.id, "name": user.name},
        "available_organizations": [{"id": o.id, "name": o.name} for o in orgs],
        "current_organization_id": current_org,
        "roles": roles,
        "permissions": permissions,
    }


def switch_organization(db: Session, user: User, organization_id: int) -> dict:
    available_ids = user_organization_ids(db, user.id)
    if organization_id not in available_ids:
        raise AppException("Bạn không có quyền truy cập tổ chức này.", 403)
    _save_preference(db, user.id, organization_id)
    roles, permissions = resolve_roles_permissions(db, user.id, organization_id)

    from app.modules.organizations.models import Organization

    org = db.get(Organization, organization_id)
    return {
        "current_organization_id": organization_id,
        "current_organization": {"id": org.id, "name": org.name} if org else None,
        "roles": roles,
        "permissions": permissions,
    }


def forgot_password(db: Session, email: str) -> None:
    user = db.scalars(select(User).where(User.email == email)).first()
    if user:
        # Sinh token reset (demo lưu in-memory).
        _reset_tokens[email] = secrets.token_urlsafe(32)
    # Luôn trả về thành công để tránh dò email tồn tại.


def reset_password(db: Session, email: str, password: str, confirmation: str, token: str) -> None:
    if password != confirmation:
        raise AppException("Xác nhận mật khẩu không khớp.")
    if _reset_tokens.get(email) != token:
        raise AppException("Token đặt lại mật khẩu không hợp lệ.")
    user = db.scalars(select(User).where(User.email == email)).first()
    if user is None:
        raise AppException("Tài khoản không tồn tại.")
    user.password = hash_password(password)
    db.commit()
    _reset_tokens.pop(email, None)
