"""Seed dữ liệu khởi tạo: permissions, roles (admin/ctv/user), admin user, tổ chức.

Chạy: python -m app.seed
"""
from datetime import UTC

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
    "finance",
    "orders",
    "vouchers",
    "partner",
    "inventory",
    "invoices",
    "warranties",
    "returns",
    "articles",
    "faqs",
    "engagements",
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

        # 5a) Danh mục + sản phẩm Domain/VPS bán trực tiếp (giao thủ công).
        _seed_domain_vps(db, org.id)

        # 5b) Backfill danh mục: tạo Category từ category_name cũ + gắn category_id.
        _backfill_categories(db, org.id)

        # 5c) Bài viết (Thủ thuật/Tin tức) + FAQ hiển thị trên landing.
        _seed_content(db, org.id)

        # 5d) Tài khoản ngân hàng nhận tiền + ví chủ + cấu hình Zalo xử lý đơn tay.
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

        # 7) Đặt PUBLIC_ORG_ID về org vừa seed — landing hiển thị catalog của org này.
        settings_service.set_value(
            db,
            settings_service.PUBLIC_ORG_ID_KEY,
            str(org.id),
            "Org có catalog sản phẩm hiển thị trên landing công khai (/api/public). Admin đổi nếu cần."
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


def _seed_domain_vps(db, org_id: int) -> None:
    """Danh mục + sản phẩm Domain & VPS/Hosting bán trực tiếp (không qua NCC).

    Đây là nhánh kinh doanh thứ 2 của NexoraTech (ngoài tài khoản AI sync từ VD
    Store). Sản phẩm tự quản, `delivery_type="MANUAL"` -> sau khi khách thanh toán,
    đơn vào trạng thái processing để nhân viên cấp phát thủ công (đăng ký domain /
    dựng VPS) rồi bàn giao. base_price = giá vốn ước tính, regular_price = giá bán.

    Idempotent: get-or-create category theo (org, slug) và product theo (org, slug).
    """
    from decimal import Decimal

    from app.modules.categories.models import Category
    from app.modules.organizations.utils import slugify
    from app.modules.products.models import Product

    def _get_or_create_category(name: str, description: str) -> Category:
        slug = slugify(name)
        cat = db.scalars(
            select(Category).where(Category.organization_id == org_id, Category.slug == slug)
        ).first()
        if cat is None:
            cat = Category(
                name=name,
                slug=slug,
                description=description,
                organization_id=org_id,
                status="active",
            )
            db.add(cat)
            db.commit()
            db.refresh(cat)
        return cat

    domain_cat = _get_or_create_category("Domain", "Đăng ký tên miền .com .vn .net giá tốt")
    vps_cat = _get_or_create_category("VPS/Hosting", "VPS & Hosting hiệu năng cao, uptime 99.9%")

    # (name, category, base_price (vốn), regular_price (giá bán), warranty_days, mô tả)
    samples = [
        (
            "Tên miền .COM (1 năm)",
            domain_cat,
            Decimal("250000"),
            Decimal("319000"),
            0,
            "Đăng ký tên miền quốc tế .com trong 1 năm. Bao gồm quản trị DNS, khóa "
            "chuyển nhượng (registrar lock) và hỗ trợ trỏ tên miền.",
        ),
        (
            "Tên miền .VN (1 năm)",
            domain_cat,
            Decimal("650000"),
            Decimal("830000"),
            0,
            "Đăng ký tên miền quốc gia .vn trong 1 năm theo quy định VNNIC. Hỗ trợ "
            "hồ sơ đăng ký và quản trị DNS.",
        ),
        (
            "VPS 2GB RAM / 2 vCPU / 40GB SSD",
            vps_cat,
            Decimal("120000"),
            Decimal("159000"),
            30,
            "VPS hiệu năng cao: 2GB RAM, 2 vCPU, 40GB NVMe SSD, băng thông không giới "
            "hạn. Toàn quyền root, hỗ trợ Linux/Windows. Giá theo tháng.",
        ),
        (
            "VPS 4GB RAM / 4 vCPU / 80GB SSD",
            vps_cat,
            Decimal("240000"),
            Decimal("309000"),
            30,
            "VPS doanh nghiệp: 4GB RAM, 4 vCPU, 80GB NVMe SSD, IP riêng. Phù hợp web/"
            "app tải vừa. Toàn quyền root. Giá theo tháng.",
        ),
        (
            "Hosting cá nhân 5GB",
            vps_cat,
            Decimal("45000"),
            Decimal("59000"),
            30,
            "Hosting cPanel 5GB SSD, băng thông cao, miễn phí SSL. Phù hợp website "
            "cá nhân/landing page. Giá theo tháng.",
        ),
    ]

    created = 0
    for name, cat, base_price, regular_price, warranty_days, desc in samples:
        slug = slugify(name)
        exists = db.scalars(
            select(Product).where(Product.organization_id == org_id, Product.slug == slug)
        ).first()
        if exists is None:
            db.add(
                Product(
                    name=name,
                    slug=slug,
                    description=desc,
                    category_id=cat.id,
                    category_name=cat.name,
                    base_price=base_price,
                    regular_price=regular_price,
                    markup_percent=Decimal("0.00"),
                    markup_amount=Decimal("0.00"),
                    delivery_type="MANUAL",
                    warranty_days=warranty_days,
                    stock_status="in_stock",
                    status="active",
                    organization_id=org_id,
                )
            )
            created += 1
    db.commit()
    if created:
        print(f"Seed Domain/VPS: tao moi {created} san pham (giao thu cong)")


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


def _seed_content(db, org_id: int) -> None:
    """Bài viết (Thủ thuật/Tin tức) + FAQ hiển thị trên landing.

    Nội dung đã được chốt giao diện ở bản mock FE (articlesData/faqData). Đưa vào
    DB để FE đọc qua /api/public thay vì hard-code. Giữ NGUYÊN slug/tiêu đề/ảnh/
    nội dung để giao diện không đổi. Idempotent: get-or-create theo (org, slug)
    với Article và (org, question) với Faq.
    """
    from datetime import datetime

    from app.modules.content.models import Article, Faq

    def _dmy(s: str) -> datetime:
        """'29/06/2026' -> datetime (UTC) để sắp xếp theo ngày đăng."""
        d, m, y = (int(x) for x in s.split("/"))
        return datetime(y, m, d, tzinfo=UTC)

    img = lambda seed: f"https://picsum.photos/seed/{seed}/420/260"  # noqa: E731

    def _body(lead: str) -> str:
        """Thân bài mock dùng chung — KHỚP đúng helper body() bên FE articlesData."""
        return (
            f"\n    <p>{lead}</p>\n"
            "    <p>Trong bài viết này, NexoraTech sẽ cùng bạn đi qua những điểm quan trọng nhất, "
            "từ khái niệm cơ bản đến các bước thực hiện cụ thể, kèm lưu ý để tránh các lỗi thường gặp.</p>\n"
            "    <h2>Vì sao điều này quan trọng?</h2>\n"
            "    <p>Việc nắm vững nội dung này giúp bạn tiết kiệm thời gian, hạn chế rủi ro và tận dụng "
            "tối đa dịch vụ đang sử dụng. Đây là kiến thức nền tảng mà bất kỳ người dùng nào cũng nên biết.</p>\n"
            "    <ul>\n"
            "      <li>Hiểu rõ bản chất vấn đề trước khi bắt tay vào làm.</li>\n"
            "      <li>Chuẩn bị đầy đủ công cụ và thông tin cần thiết.</li>\n"
            "      <li>Thực hiện theo từng bước, kiểm tra lại kết quả ở mỗi giai đoạn.</li>\n"
            "    </ul>\n"
            "    <h2>Các bước thực hiện</h2>\n"
            "    <p>Bạn nên làm tuần tự và không bỏ qua bước kiểm tra. Nếu gặp trục trặc, hãy quay lại "
            "bước trước đó để rà soát thay vì làm lại từ đầu.</p>\n"
            "    <blockquote>Mẹo: Lưu lại cấu hình hoạt động tốt để có thể khôi phục nhanh khi cần.</blockquote>\n"
            "    <p>Nếu bạn cần hỗ trợ thêm, đội ngũ kỹ thuật NexoraTech luôn sẵn sàng đồng hành 24/7 "
            "qua Zalo và hotline.</p>\n  "
        )

    # (slug, title, category, category_key, group, date, excerpt, img_seed, lead) — sort_order theo thứ tự.
    tips = [
        ("meo-dung-chatgpt-hieu-qua", "Mẹo dùng ChatGPT hiệu quả, tránh bị giới hạn", "Thủ thuật AI", "ai", "tips", "29/06/2026", "Tổng hợp các mẹo prompt và thói quen sử dụng giúp bạn khai thác tối đa tài khoản AI mà vẫn an toàn…", "nx-tip-1", "ChatGPT là công cụ mạnh, nhưng dùng đúng cách mới phát huy hết sức mạnh và tránh bị giới hạn không đáng có."),
        ("so-sanh-claude-va-chatgpt-lap-trinh", "So sánh Claude và ChatGPT cho công việc lập trình", "Thủ thuật AI", "ai", "tips", "28/06/2026", "Đâu là lựa chọn tốt hơn khi bạn cần một trợ lý AI hỗ trợ viết và rà soát mã nguồn hằng ngày…", "nx-tip-2", "Cả Claude và ChatGPT đều hỗ trợ lập trình rất tốt, nhưng mỗi công cụ có thế mạnh riêng tùy theo nhu cầu của bạn."),
        ("cach-tro-ten-mien-vn-ve-hosting", "Cách trỏ tên miền .vn về hosting nhanh nhất", "Thủ thuật Domain", "domain", "tips", "27/06/2026", "Hướng dẫn từng bước cấu hình bản ghi DNS để website của bạn hoạt động chỉ sau vài phút…", "nx-tip-3", "Trỏ tên miền tưởng phức tạp nhưng chỉ cần hiểu đúng bản ghi DNS là bạn có thể làm trong vài phút."),
        ("toi-uu-vps-cho-wordpress", "Tối ưu VPS cho website WordPress tải nhanh", "Thủ thuật VPS", "vps", "tips", "26/06/2026", "Những thiết lập cache, PHP và web server giúp trang WordPress của bạn nhẹ và nhanh hơn rõ rệt…", "nx-tip-4", "Một VPS cấu hình tốt có thể giúp WordPress tải nhanh gấp nhiều lần mà không cần nâng cấp phần cứng."),
        ("bao-mat-vps-cho-nguoi-moi", "Bảo mật VPS: 7 việc cần làm ngay sau khi nhận", "Thủ thuật VPS", "vps", "tips", "25/06/2026", "Đổi cổng SSH, dựng firewall, tắt đăng nhập mật khẩu… checklist bảo mật VPS cho người mới…", "nx-tip-5", "Ngay khi nhận VPS, vài thao tác bảo mật cơ bản sẽ giúp bạn tránh được phần lớn các cuộc tấn công tự động."),
        ("viet-prompt-midjourney-dep", "Viết prompt tạo ảnh Midjourney đẹp như designer", "Thủ thuật AI", "ai", "tips", "24/06/2026", "Công thức prompt theo bố cục, ánh sáng và phong cách giúp bạn ra ảnh chất lượng cao ngay…", "nx-tip-6", "Prompt tốt là chìa khóa để Midjourney cho ra ảnh đẹp; hãy mô tả theo bố cục, ánh sáng và phong cách rõ ràng."),
        ("chon-goi-ten-mien-cho-startup", "Chọn gói tên miền nào cho startup mới?", "Thủ thuật Domain", "domain", "tips", "23/06/2026", ".com, .vn hay .io — phân tích ưu nhược để bạn chọn đúng tên miền cho thương hiệu non trẻ…", "nx-tip-7", "Tên miền là bộ mặt thương hiệu; chọn đúng đuôi tên miền ngay từ đầu giúp bạn xây dựng uy tín lâu dài."),
        ("quan-ly-nhieu-tai-khoan-ai", "Quản lý nhiều tài khoản AI trong cùng trình duyệt", "Thủ thuật AI", "ai", "tips", "22/06/2026", "Dùng profile và tiện ích để chuyển đổi tài khoản nhanh, tránh đăng nhập nhầm và mất phiên…", "nx-tip-8", "Nếu dùng nhiều tài khoản AI, việc tổ chức profile trình duyệt hợp lý sẽ giúp bạn tránh nhầm lẫn và mất phiên."),
    ]
    news = [
        ("openai-he-lo-mo-hinh-moi", "OpenAI hé lộ mô hình mới với khả năng suy luận vượt trội", "Tin AI", "ai", "news", "30/06/2026", "Giới công nghệ xôn xao trước những thông tin về thế hệ mô hình tiếp theo với năng lực lý luận mạnh hơn…", "nx-news-1", "OpenAI được cho là đang chuẩn bị ra mắt thế hệ mô hình mới với khả năng suy luận vượt xa hiện tại."),
        ("xu-huong-gia-vps-2026", "Xu hướng giá VPS 2026: hiệu năng tăng, chi phí giảm", "Tin công nghệ", "tech", "news", "29/06/2026", "Sự cạnh tranh giữa các nhà cung cấp đám mây đang đem lại lợi ích rõ rệt cho người dùng cuối…", "nx-news-2", "Cuộc đua hạ tầng đám mây năm 2026 đang khiến giá VPS giảm trong khi hiệu năng ngày càng tăng."),
        ("google-mo-rong-gemini-workspace", "Google mở rộng Gemini cho người dùng Workspace", "Tin AI", "ai", "news", "28/06/2026", "Tính năng AI được tích hợp sâu hơn vào bộ công cụ văn phòng, thay đổi cách chúng ta làm việc…", "nx-news-3", "Google tiếp tục đưa Gemini vào sâu hơn trong Workspace, thay đổi cách hàng triệu người làm việc mỗi ngày."),
        ("ten-mien-ai-sot-gia", "Tên miền .ai tiếp tục sốt giá trên toàn cầu", "Tin công nghệ", "tech", "news", "27/06/2026", "Cơn sốt trí tuệ nhân tạo kéo theo nhu cầu sở hữu tên miền .ai tăng vọt trong năm qua…", "nx-news-4", "Làn sóng AI khiến tên miền .ai trở thành tài sản được săn đón, đẩy giá lên mức cao kỷ lục."),
        ("canh-bao-lua-dao-tai-khoan-ai", "Cảnh báo thủ đoạn lừa đảo mua bán tài khoản AI giá rẻ", "Tin công nghệ", "tech", "news", "26/06/2026", "Người dùng cần cảnh giác với các tài khoản trôi nổi không bảo hành, dễ mất quyền truy cập…", "nx-news-5", "Tài khoản AI giá rẻ trôi nổi tiềm ẩn rủi ro lớn; hãy mua từ nguồn uy tín có bảo hành rõ ràng."),
        ("anthropic-cap-nhat-lon-cho-claude", "Anthropic công bố cập nhật lớn cho Claude", "Tin AI", "ai", "news", "25/06/2026", "Bản cập nhật mang đến cửa sổ ngữ cảnh lớn hơn và tốc độ phản hồi cải thiện đáng kể…", "nx-news-6", "Anthropic vừa nâng cấp Claude với cửa sổ ngữ cảnh lớn hơn và tốc độ phản hồi nhanh hơn đáng kể."),
    ]

    created = 0
    for order, (slug, title, category, cat_key, group, date, excerpt, seed, lead) in enumerate(
        [*tips, *news]
    ):
        exists = db.scalars(
            select(Article).where(Article.organization_id == org_id, Article.slug == slug)
        ).first()
        if exists is None:
            db.add(
                Article(
                    title=title,
                    slug=slug,
                    category=category,
                    category_key=cat_key,
                    group=group,
                    author="NexoraTech",
                    excerpt=excerpt,
                    image_url=img(seed),
                    content=_body(lead),
                    published_at=_dmy(date),
                    sort_order=order,
                    status="active",
                    organization_id=org_id,
                )
            )
            created += 1
    db.commit()

    faqs = [
        ("NexoraTech cung cấp những dịch vụ số nào?", "Chúng tôi cung cấp tài khoản AI bản quyền (ChatGPT, Claude, Gemini, Midjourney…), dịch vụ đăng ký tên miền (.com, .vn) và thuê VPS/Hosting hiệu năng cao — tất cả trên một nền tảng."),
        ("Sau khi thanh toán, bao lâu tôi nhận được tài khoản?", "Với các sản phẩm giao tự động, bạn nhận được thông tin tài khoản ngay sau khi thanh toán thành công. Một số dịch vụ cần cấp phát thủ công sẽ được nhân viên bàn giao trong thời gian sớm nhất."),
        ("Tôi thanh toán bằng cách nào?", "NexoraTech sử dụng ví trả trước. Bạn nạp ví một lần qua VietQR và dùng số dư để mua nhanh các dịch vụ mà không phải nhập lại thông tin thanh toán mỗi lần."),
        ("Sản phẩm có được bảo hành không?", "Có. Mỗi sản phẩm có thời gian bảo hành rõ ràng. Trong thời gian bảo hành, nếu tài khoản gặp sự cố do nhà cung cấp, chúng tôi hỗ trợ đổi mới (1 đổi 1) theo chính sách."),
        ("Tài khoản AI là chính chủ hay dùng chung?", "Tùy từng gói. Thông tin loại tài khoản (chính chủ/chia sẻ) được mô tả rõ trong chi tiết từng sản phẩm để bạn lựa chọn phù hợp nhu cầu."),
        ("Tôi có thể yêu cầu hoàn tiền không?", "Bạn có thể yêu cầu hoàn tiền theo chính sách hoàn tiền của chúng tôi khi sản phẩm không thể bàn giao hoặc không đúng mô tả. Vui lòng liên hệ hỗ trợ để được xử lý nhanh."),
        ("Đăng ký tên miền và VPS mất bao lâu?", "Tên miền thường được khởi tạo trong vài phút đến vài giờ tùy loại. VPS được cấp phát nhanh sau khi xác nhận đơn. Đội ngũ kỹ thuật sẽ hỗ trợ bạn cấu hình ban đầu nếu cần."),
        ("NexoraTech hỗ trợ kỹ thuật vào thời gian nào?", "Chúng tôi hỗ trợ trực tuyến 24/7 qua Zalo, hệ thống ticket và hotline. Bạn có thể liên hệ bất cứ lúc nào khi cần trợ giúp."),
        ("Làm sao để theo dõi đơn hàng đã mua?", "Sau khi đăng nhập, bạn vào mục “Đơn hàng của tôi” để xem trạng thái đơn, nội dung đã bàn giao và thông tin bảo hành của từng sản phẩm."),
    ]
    faq_created = 0
    for order, (question, answer) in enumerate(faqs):
        exists = db.scalars(
            select(Faq).where(Faq.organization_id == org_id, Faq.question == question)
        ).first()
        if exists is None:
            db.add(
                Faq(
                    question=question,
                    answer=answer,
                    sort_order=order,
                    status="active",
                    organization_id=org_id,
                )
            )
            faq_created += 1
    db.commit()
    if created or faq_created:
        print(f"Seed content: tao moi {created} bai viet, {faq_created} FAQ")


def _seed_payments(db, org_id: int, admin_id: int) -> None:
    """Tài khoản ngân hàng nhận tiền + ví chủ (admin) + cấu hình Zalo xử lý đơn tay.
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
