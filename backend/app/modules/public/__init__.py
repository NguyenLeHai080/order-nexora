"""Module Public — API đọc công khai (KHÔNG auth) phục vụ landing page.

CẢNH BÁO BẢO MẬT: mọi endpoint trong module này KHÔNG yêu cầu đăng nhập và phục
vụ người dùng ẩn danh. Chỉ trả dữ liệu đã lọc kỹ qua `PublicProductOut` /
`PublicCategoryOut` — TUYỆT ĐỐI không expose giá vốn (base_price), markup, chiết
khấu NCC, supplier, external_id hay owner/profit. Read-only, chỉ 1 org (xem
`settings.service.get_public_org_id`).
"""
