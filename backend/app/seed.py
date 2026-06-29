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
    "partner",
    "inventory",
    "invoices",
    "warranties",
    "returns",
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

        # 5) Nhà cung cấp mẫu + sản phẩm mẫu (để FE có dữ liệu hiển thị ngay).
        _seed_catalog(db, org.id)

        # 6) Cấu hình mặc định (chỉ tạo nếu chưa có — không ghi đè giá trị admin đã đặt).
        from app.modules.settings import service as settings_service

        if settings_service.get_value(db, settings_service.DEFAULT_MARKUP_KEY) is None:
            settings_service.set_value(
                db,
                settings_service.DEFAULT_MARKUP_KEY,
                "20",
                "% markup mặc định áp cho sản phẩm mới khi đồng bộ NCC",
            )
        if settings_service.get_value(db, settings_service.MANUAL_FULFILLMENT_ZALO_NAME_KEY) is None:
            settings_service.set_value(
                db,
                settings_service.MANUAL_FULFILLMENT_ZALO_NAME_KEY,
                "Nguyen Le Hai",
                "Ten nhan vien/Zalo xu ly don can admin giao thu cong",
            )
        if settings_service.get_value(db, settings_service.MANUAL_FULFILLMENT_INSTRUCTIONS_KEY) is None:
            settings_service.set_value(
                db,
                settings_service.MANUAL_FULFILLMENT_INSTRUCTIONS_KEY,
                "Don nay can nhan vien xu ly thu cong. Vui long quet Zalo hoac lien he nhan vien de giao hang.",
                "Huong dan hien tren don MANUAL sau khi khach thanh toan",
            )

        print("Seed xong: admin@example.com / password, org_id =", org.id)
    finally:
        db.close()


def _seed_catalog(db, org_id: int) -> None:
    """Tạo 1 nhà cung cấp VD Store (driver vdstore) + vài sản phẩm mẫu.

    Mục đích: FE thấy dữ liệu ngay khi chưa có API key thật. Khi có key, admin
    nhập vào supplier này rồi bấm "Đồng bộ NCC" để kéo catalog thật về.
    Giá NCC (base_price) + markup là dữ liệu mô phỏng, an toàn để demo.
    """
    from decimal import Decimal

    from app.modules.organizations.utils import slugify
    from app.modules.products.models import Product
    from app.modules.suppliers.models import Supplier

    supplier = db.scalars(
        select(Supplier).where(Supplier.driver == "vdstore", Supplier.organization_id == org_id)
    ).first()
    if supplier is None:
        supplier = Supplier(
            name="VD Store (demo)",
            driver="vdstore",
            api_endpoint="https://api.vanhdao.io.vn/partner/v1",
            environment="test",
            status="active",
            note="Nhà cung cấp mẫu. Nhập API key test rồi bấm Đồng bộ NCC để lấy catalog thật.",
            organization_id=org_id,
        )
        db.add(supplier)
        db.commit()
        db.refresh(supplier)

    # base_price = giá NCC (giá vốn); markup_percent = % cộng thêm để ra giá bán.
    samples = [
        ("ChatGPT Plus 1 tháng", "prod_demo_chatgpt", Decimal("350000"), Decimal("25")),
        ("Spotify Premium 1 năm", "prod_demo_spotify", Decimal("180000"), Decimal("30")),
        ("Canva Pro 1 năm", "prod_demo_canva", Decimal("120000"), Decimal("40")),
        ("Netflix Premium 1 tháng", "prod_demo_netflix", Decimal("90000"), Decimal("35")),
        ("YouTube Premium 1 năm", "prod_demo_youtube", Decimal("250000"), Decimal("28")),
    ]
    for name, ext_id, base_price, markup in samples:
        exists = db.scalars(
            select(Product).where(
                Product.supplier_id == supplier.id, Product.external_id == ext_id
            )
        ).first()
        if exists is None:
            db.add(
                Product(
                    name=name,
                    slug=slugify(name),
                    supplier_id=supplier.id,
                    external_id=ext_id,
                    base_price=base_price,
                    markup_percent=markup,
                    markup_amount=Decimal("0.00"),
                    stock_status="in_stock",
                    status="active",
                    organization_id=org_id,
                )
            )
    db.commit()


if __name__ == "__main__":
    seed()
