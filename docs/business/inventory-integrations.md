# Kho Hàng & Tích Hợp

Phân hệ này quản lý nhà cung cấp, tồn kho và driver tích hợp API bên thứ ba.

## Phạm vi

- Cấu hình nhà cung cấp và API key.
- Mapping dữ liệu sản phẩm từ nhà cung cấp về model nội bộ.
- Kiểm tra tồn kho real-time khi mua.
- Đồng bộ giá gốc và trạng thái sản phẩm.
- Xử lý lỗi từ nhà cung cấp theo format nội bộ.

## Công thức giá

```text
Giá bán = Giá kho x (1 + markup_percent / 100) + markup_amount
```

Markup có thể áp dụng theo sản phẩm, nhóm sản phẩm hoặc chính sách mở rộng sau này.

## Nguyên tắc tích hợp

- Mỗi nhà cung cấp nên có driver riêng trong `backend/app/integrations`.
- Driver chịu trách nhiệm gọi API ngoài, mapping dữ liệu và chuẩn hóa lỗi.
- Service nghiệp vụ chỉ làm việc với interface nội bộ, không phụ thuộc trực tiếp vào format của nhà cung cấp.

API liên quan: [../api/catalog.md](../api/catalog.md), [../api/partner-ctv.md](../api/partner-ctv.md), [../api/vdstore.md](../api/vdstore.md).
