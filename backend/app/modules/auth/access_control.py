"""Phân giải vai trò & quyền của user theo tổ chức đang làm việc.

Dùng chung cho login, switch-organization, /user và dependency phân quyền.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.permissions.models import Role
from app.modules.users.models import UserRole


def resolve_roles_permissions(
    db: Session, user_id: int, organization_id: int | None
) -> tuple[list[str], list[str]]:
    """Trả về (roles, permissions) của user trong phạm vi tổ chức.

    Lấy các UserRole khớp user + (organization_id cụ thể HOẶC global null),
    rồi gom tên role và tên permission của các role đó.
    """
    stmt = select(UserRole.role_id).where(UserRole.user_id == user_id)
    if organization_id is not None:
        stmt = stmt.where(
            (UserRole.organization_id == organization_id) | (UserRole.organization_id.is_(None))
        )
    role_ids = list(db.scalars(stmt).all())
    if not role_ids:
        return [], []

    roles = list(db.scalars(select(Role).where(Role.id.in_(role_ids))).all())
    role_names = sorted({r.name for r in roles})
    perm_names = sorted({p.name for r in roles for p in r.permissions})
    return role_names, perm_names


def user_organization_ids(db: Session, user_id: int) -> list[int]:
    """Danh sách id tổ chức mà user truy cập được."""
    from app.modules.users.models import organization_user

    stmt = select(organization_user.c.organization_id).where(organization_user.c.user_id == user_id)
    return list(db.scalars(stmt).all())
