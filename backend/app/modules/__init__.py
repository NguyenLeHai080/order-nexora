"""Các module nghiệp vụ của Order Nexora.

Mỗi module là một "bounded context" độc lập, theo cấu trúc chuẩn:

    <module>/
        __init__.py     mô tả module
        router.py       định nghĩa endpoint (tầng giao tiếp HTTP)
        service.py      logic nghiệp vụ (tùy module, khi có quy tắc phức tạp)
        repository.py   truy vấn dữ liệu (kế thừa core.repository)
        schemas.py      Pydantic schema (request/response)
        models.py       SQLAlchemy model (bảng dữ liệu)

Quy ước thêm module/endpoint mới xem tại docs/backend-guide.md.
"""
