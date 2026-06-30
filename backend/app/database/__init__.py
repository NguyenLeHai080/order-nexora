"""Import tập trung mọi ORM model để SQLAlchemy biết toàn bộ bảng khi create_all.

Import module này (hoặc app.main) trước khi gọi Base.metadata.create_all.
"""
from app.modules.categories.models import Category  # noqa: F401
from app.modules.inventory.models import StockMovement  # noqa: F401
from app.modules.invoices.models import Invoice  # noqa: F401
from app.modules.log_activities.models import LogActivity  # noqa: F401
from app.modules.orders.models import Order  # noqa: F401
from app.modules.organizations.models import Organization  # noqa: F401
from app.modules.partner.models import (  # noqa: F401
    ProviderOrderRef,
    ProviderWebhookEvent,
)
from app.modules.payments.models import BankAccount, Deposit  # noqa: F401
from app.modules.permissions.models import Permission, Role, role_permissions  # noqa: F401
from app.modules.products.models import Product  # noqa: F401
from app.modules.returns.models import ReturnRequest  # noqa: F401
from app.modules.settings.models import Setting  # noqa: F401
from app.modules.suppliers.models import Supplier  # noqa: F401
from app.modules.users.models import (  # noqa: F401
    User,
    UserPreference,
    UserRole,
    organization_user,
)
from app.modules.vouchers.models import Voucher  # noqa: F401
from app.modules.warranties.models import Warranty  # noqa: F401
