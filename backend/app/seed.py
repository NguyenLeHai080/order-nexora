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
    "categories",
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
    # Thêm cột mới còn thiếu cho DB dev cũ (SQLite). No-op trên Postgres.
    # Chạy ở đây để seed không phụ thuộc APP_ENV — lifespan app skip migrate khi prod.
    from app.core.dev_migrate import ensure_dev_schema

    added = ensure_dev_schema(engine)
    if added:
        print("Đã thêm cột thiếu:", added)
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

        # 5a) Backfill danh mục: tạo Category từ category_name cũ + gắn category_id.
        _backfill_categories(db, org.id)

        # 5b) Tài khoản ngân hàng nhận tiền + ví chủ + cấu hình Zalo xử lý đơn tay.
        _seed_payments(db, org.id, admin.id)

        # 6) Cấu hình mặc định (chỉ tạo nếu chưa có — không ghi đè giá trị admin đã đặt).
        from app.modules.settings import service as settings_service

        if settings_service.get_value(db, settings_service.DEFAULT_MARKUP_KEY) is None:
            settings_service.set_value(
                db,
                settings_service.DEFAULT_MARKUP_KEY,
                "0",
                "% markup cộng thêm mặc định cho sản phẩm mới khi đồng bộ NCC (0 = bán đúng giá niêm yết)",
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

    # base_price = giá CTV/vốn (phải trả NCC); regular_price = giá niêm yết (giá bán cho khách).
    # markup_percent = 0 → giá bán đúng giá niêm yết; lợi nhuận/sp = regular_price − base_price.
    samples = [
        ("ChatGPT Plus 1 tháng", "prod_demo_chatgpt", Decimal("350000"), Decimal("437500")),
        ("Spotify Premium 1 năm", "prod_demo_spotify", Decimal("180000"), Decimal("234000")),
        ("Canva Pro 1 năm", "prod_demo_canva", Decimal("120000"), Decimal("168000")),
        ("Netflix Premium 1 tháng", "prod_demo_netflix", Decimal("90000"), Decimal("121500")),
        ("YouTube Premium 1 năm", "prod_demo_youtube", Decimal("250000"), Decimal("320000")),
    ]
    for name, ext_id, base_price, regular_price in samples:
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
                    regular_price=regular_price,
                    markup_percent=Decimal("0.00"),
                    markup_amount=Decimal("0.00"),
                    stock_status="in_stock",
                    status="active",
                    organization_id=org_id,
                )
            )
    db.commit()


def _backfill_categories(db, org_id: int) -> None:
    """Tạo Category từ `category_name` cũ và gắn `category_id` cho sản phẩm.

    Idempotent: chỉ tạo danh mục còn thiếu (get-or-create theo (org, name)) và
    chỉ gán category_id cho sản phẩm có category_name nhưng chưa link. Dùng để
    đồng bộ dữ liệu đã sync trước khi có module Danh mục (sync mới đã tự link).
    """
    from app.modules.categories.models import Category
    from app.modules.organizations.utils import slugify
    from app.modules.products.models import Product

    # Cache danh mục hiện có theo tên (lower) để tránh truy vấn lặp.
    existing = db.scalars(select(Category).where(Category.organization_id == org_id)).all()
    by_name: dict[str, Category] = {c.name.strip().lower(): c for c in existing}

    products = db.scalars(
        select(Product).where(
            Product.organization_id == org_id,
            Product.category_name.isnot(None),
            Product.category_id.is_(None),
        )
    ).all()

    created = 0
    linked = 0
    for p in products:
        name = (p.category_name or "").strip()
        if not name:
            continue
        key = name.lower()
        category = by_name.get(key)
        if category is None:
            category = Category(
                name=name,
                slug=slugify(name) or key,
                organization_id=org_id,
                status="active",
            )
            db.add(category)
            db.flush()  # cần id để gán
            by_name[key] = category
            created += 1
        p.category_id = category.id
        linked += 1

    db.commit()
    if created or linked:
        print(f"Backfill danh muc: tao moi {created}, gan category_id cho {linked} san pham")


def _seed_payments(db, org_id: int, admin_id: int) -> None:
    """Tài khoản ngân hàng nhận tiền + ví chủ (admin) + cấu hình Zalo xử lý đơn tay.

    - BankAccount: VietinBank của chủ shop. bank_name PHẢI là định danh VietQR
      ("VietinBank") vì `payments.service.build_vietqr_url` dùng nó để dựng link
      QR động (kèm số tiền) lúc khách nạp. qr_image_url là QR tĩnh (không số tiền)
      lấy thẳng từ img.vietqr.io — luôn quét được, không cần tải file về.
    - Ví chủ: owner_wallet_user_id = admin -> lãi mỗi đơn cộng vào ví này.
    - Zalo: đơn MANUAL hiển thị tên + link Zalo để khách liên hệ nhân viên.
    """
    from urllib.parse import quote

    from app.modules.payments.models import BankAccount
    from app.modules.settings import service as settings_service

    bank_name = "VietinBank"  # định danh VietQR — KHÔNG đổi thành tên có chi nhánh.
    account_number = "109873538727"
    account_holder = "NGUYEN LE HAI"

    bank = db.scalars(
        select(BankAccount).where(BankAccount.account_number == account_number)
    ).first()
    if bank is None:
        static_qr = (
            f"https://img.vietqr.io/image/{bank_name}-{account_number}-compact.png"
            f"?accountName={quote(account_holder)}"
        )
        bank = BankAccount(
            bank_name=bank_name,
            account_number=account_number,
            account_holder=account_holder,
            qr_image_url=static_qr,
            status="active",
            organization_id=org_id,
        )
        db.add(bank)
        db.commit()

    # Ví chủ nhận lãi: mặc định là admin (nếu admin chưa cấu hình tay).
    if settings_service.get_value(db, settings_service.OWNER_WALLET_USER_ID_KEY) is None:
        settings_service.set_value(
            db,
            settings_service.OWNER_WALLET_USER_ID_KEY,
            str(admin_id),
            "User nhận lãi mỗi đơn (ví chủ shop)",
        )

    # Link/QR Zalo cho đơn MANUAL: KHÔNG seed số liên hệ giả. Admin tự nhập
    # `manual_fulfillment_zalo_url` và upload ảnh QR Zalo (-> manual_fulfillment_qr_url)
    # qua trang Cấu hình. Modal đơn hàng tự ẩn phần liên hệ nếu chưa có.


if __name__ == "__main__":
    seed()
