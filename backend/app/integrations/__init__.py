"""Lớp tích hợp các nhà cung cấp bên thứ ba (anti-corruption layer).

Mỗi nhà cung cấp có một package con (vd `vdstore`, `cazyserver`) chứa:
- `client.py`   : HTTP client gọi API nhà cung cấp (biết shape thật của họ).
- `schemas.py`  : DTO khớp JSON nhà cung cấp — chỉ sống trong lớp này.
- `mapper.py`   : dịch DTO nhà cung cấp ↔ model nội bộ.
- `errors.py`   : map mã lỗi nhà cung cấp ↔ exception nội bộ.

Nghiệp vụ (modules/*) KHÔNG import schema nhà cung cấp trực tiếp, cũng không
import client cụ thể — chỉ lấy driver qua `app.integrations.registry`. Thêm nhà
cung cấp mới = thêm 1 package con + import bên dưới (để nó tự `register`).
"""
# Import để các driver tự đăng ký vào registry khi app khởi động.
from app.integrations import cazyserver, vdstore  # noqa: F401
