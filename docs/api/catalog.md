# Catalog API

Endpoint cho nhóm danh mục kinh doanh: sản phẩm, nhà cung cấp và voucher. Các route bên dưới dùng tiền tố `/api`.

## Products

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/products` | Danh sách sản phẩm | `products.index` |
| GET | `/products/{id}` | Chi tiết sản phẩm | `products.show` |
| POST | `/products` | Tạo sản phẩm | `products.store` |
| PUT | `/products/{id}` | Cập nhật sản phẩm / công thức giá | `products.update` |
| DELETE | `/products/{id}` | Xóa sản phẩm | `products.destroy` |

## Suppliers

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/suppliers` | Danh sách nhà cung cấp | `suppliers.index` |
| GET | `/suppliers/{id}` | Chi tiết nhà cung cấp | `suppliers.show` |
| POST | `/suppliers` | Tạo nhà cung cấp | `suppliers.store` |
| PUT | `/suppliers/{id}` | Cập nhật nhà cung cấp | `suppliers.update` |
| DELETE | `/suppliers/{id}` | Xóa nhà cung cấp | `suppliers.destroy` |

## Vouchers

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/vouchers` | Danh sách mã giảm giá | `vouchers.index` |
| GET | `/vouchers/{id}` | Chi tiết mã giảm giá | `vouchers.show` |
| POST | `/vouchers` | Tạo mã giảm giá | `vouchers.store` |
| PUT | `/vouchers/{id}` | Cập nhật mã giảm giá | `vouchers.update` |
| DELETE | `/vouchers/{id}` | Xóa mã giảm giá | `vouchers.destroy` |

Ghi chú:

- Product có thể lưu giá gốc từ nhà cung cấp và công thức markup nội bộ.
- Supplier là điểm cấu hình kết nối API bên thứ ba.
- Voucher được kiểm tra hiệu lực trong luồng tạo đơn.
