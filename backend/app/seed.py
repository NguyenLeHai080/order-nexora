"""Seed dữ liệu khởi tạo: permissions, roles (admin/ctv/user), admin user, tổ chức.

Chạy: python -m app.seed
"""
from sqlalchemy import select

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password

# Các "subject" nghiệp vụ -> sinh permission subject.action
_SUBJECTS = [
    "users",
    "organizations",
    "roles",
    "permissions",
    "log-activities",
    "settings",
    "suppliers",
    "products",
    "payments",
    "orders",
    "vouchers",
]
_ACTIONS = ["index", "show", "store", "update", "destroy"]


def _all_permissions() -> list[str]:
    return [f"{s}.{a}" for s in _SUBJECTS for a in _ACTIONS]


def seed() -> None:
    import app.database  # noqa: F401 — đăng ký model

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        from app.modules.organizations.models import Organization
        from app.modules.permissions.models import Permission, Role
        from app.modules.users.models import User, UserPreference, UserRole, organization_user

        # 1) Permissions
        existing = {p.name for p in db.scalars(select(Permission)).all()}
        perms: dict[str, Permission] = {}
        for name in _all_permissions():
            if name in existing:
                perms[name] = db.scalars(select(Permission).where(Permission.name == name)).first()
            else:
                p = Permission(name=name)
                db.add(p)
                perms[name] = p
        db.commit()

        # 2) Roles
        def _get_or_create_role(name: str, desc: str) -> Role:
            role = db.scalars(select(Role).where(Role.name == name)).first()
            if role is None:
                role = Role(name=name, description=desc)
                db.add(role)
                db.commit()
                db.refresh(role)
            return role

        admin_role = _get_or_create_role("admin", "Quản trị tối cao")
        ctv_role = _get_or_create_role("ctv", "Cộng tác viên")
        user_role = _get_or_create_role("user", "Khách hàng")

        # admin: toàn bộ quyền
        admin_role.permissions = list(perms.values())
        # ctv: xem sản phẩm/đơn của mình + mua
        ctv_role.permissions = [perms[n] for n in ["products.index", "products.show", "orders.index"]]
        # user: chỉ xem sản phẩm
        user_role.permissions = [perms[n] for n in ["products.index", "products.show"]]
        db.commit()

        # 3) Organization gốc
        org = db.scalars(select(Organization).where(Organization.slug == "order-nexora")).first()
        if org is None:
            org = Organization(name="Order Nexora", slug="order-nexora", status="active")
            db.add(org)
            db.commit()
            db.refresh(org)

        # 4) Admin user
        admin = db.scalars(select(User).where(User.email == "admin@example.com")).first()
        if admin is None:
            admin = User(
                name="Admin",
                user_name="admin",
                email="admin@example.com",
                password=hash_password("password"),
                status="active",
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            db.execute(organization_user.insert().values(organization_id=org.id, user_id=admin.id))
            db.add(UserRole(user_id=admin.id, role_id=admin_role.id, organization_id=org.id))
            db.add(UserPreference(user_id=admin.id, current_organization_id=org.id))
            db.commit()

        print("Seed xong: admin@example.com / password, org_id =", org.id)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
