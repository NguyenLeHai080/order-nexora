"""Registry driver nhà cung cấp — định tuyến theo `supplier.driver`.

Driver tự đăng ký bằng decorator `@register` khi package của nó được import
(xem `app.integrations.__init__`). Service/router không import client cụ thể mà
lấy qua registry, nhờ đó thêm nhà cung cấp mới không phải sửa core.
"""
from __future__ import annotations

from app.integrations.base import BaseProviderClient, DriverDescriptor
from app.integrations.errors import UnknownDriverError

_REGISTRY: dict[str, type[BaseProviderClient]] = {}


def register(client_cls: type[BaseProviderClient]) -> type[BaseProviderClient]:
    """Đăng ký một driver (dùng làm decorator). Khóa theo `client_cls.driver`."""
    if not client_cls.driver:
        raise ValueError(f"{client_cls.__name__} thiếu thuộc tính 'driver'.")
    _REGISTRY[client_cls.driver] = client_cls
    return client_cls


def is_registered(driver: str) -> bool:
    return driver in _REGISTRY


def get(driver: str) -> type[BaseProviderClient]:
    """Trả class driver hoặc raise UnknownDriverError nếu chưa đăng ký."""
    try:
        return _REGISTRY[driver]
    except KeyError as exc:
        raise UnknownDriverError(driver) from exc


def get_client(supplier) -> BaseProviderClient:
    """Dựng client đã cấu hình từ một Supplier."""
    return get(supplier.driver).from_supplier(supplier)


def descriptor(driver: str) -> DriverDescriptor:
    return get(driver).descriptor()


def list_descriptors() -> list[DriverDescriptor]:
    return [cls.descriptor() for cls in _REGISTRY.values()]


def list_drivers() -> list[str]:
    return list(_REGISTRY.keys())


def has_capability(driver: str, capability: str) -> bool:
    """True nếu driver đã đăng ký VÀ có capability đó. Driver lạ -> False."""
    if driver not in _REGISTRY:
        return False
    return capability in _REGISTRY[driver].descriptor().capabilities
