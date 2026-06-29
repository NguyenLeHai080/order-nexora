# Tích hợp VD Store Partner API (driver `vdstore`)

> Tài liệu vận hành cho việc đấu nối VD Store Partner API vào hệ thống Order Nexora.
> Tài liệu gốc của nhà cung cấp (NCC): [partner-ctv.md](partner-ctv.md).

## 1. Nguyên tắc thiết kế

Hệ thống **sở hữu dữ liệu của mình**, không phụ thuộc shape JSON của NCC. Mọi thứ
liên quan VD Store bị cô lập trong một **lớp chống ăn mòn (anti-corruption layer)**:

```
Router/Service nội bộ  ──►  VDStoreClient (adapter)  ──►  VD Store Partner API
        ▲                          │
        │                          ▼
   model nội bộ   ◄── mapper.py (dịch DTO VD → model nội bộ)
```

- Shape JSON của VD **chỉ sống** trong `backend/app/integrations/vdstore/`.
- Nghiệp vụ (`app/modules/*`) **không bao giờ** import schema của VD trực tiếp.
- Đổi/nâng cấp NCC → chỉ sửa trong package adapter; model nội bộ giữ nguyên.
- Hỗ trợ đa-NCC qua trường `driver` (`manual` | `vdstore` | ... thêm sau).

## 2. Cấu trúc thư mục

```
backend/app/
├── integrations/
│   ├── __init__.py                 # mô tả lớp anti-corruption
│   └── vdstore/
│       ├── __init__.py             # export: VDStoreClient, VDStoreError, verify_signature, parse_event
│       ├── client.py               # HTTP client (httpx) gọi VD API
│       ├── schemas.py              # DTO khớp JSON VD — chỉ dùng nội bộ lớp này
│       ├── mapper.py               # dịch DTO VD → field model nội bộ
│       ├── errors.py               # VDStoreError + map problem+json → AppException
│       └── webhook.py              # verify chữ ký HMAC + parse event
└── modules/
    └── partner/                    # tầng nghiệp vụ điều phối adapter ↔ model nội bộ
        ├── models.py               # ProviderOrderRef, ProviderWebhookEvent
        ├── repository.py
        ├── service.py              # fulfill, sync_catalog, get_balance, handle_webhook
        ├── schemas.py
        └── router.py               # webhook + sync + balance + đối soát
```

## 3. Mapping dữ liệu VD ↔ nội bộ

### 3.1. Cấu hình NCC → mở rộng bảng `suppliers`

Không tạo bảng config riêng; tái dùng `suppliers` (đã có CRUD + UI). Một supplier
chạy được 2 môi trường test/live với cặp key + webhook secret riêng.

| Cột `suppliers` | Ý nghĩa |
|---|---|
| `driver` | `manual` (nhập tay) \| `vdstore` (VD Partner API) |
| `api_endpoint` | Base URL, vd `https://api.vanhdao.io.vn/partner/v1` |
| `environment` | `test` \| `live` — quyết key/secret nào đang dùng |
| `api_key_test` / `api_key_live` | `vd_test_...` / `vd_live_...` (không bao giờ trả ra FE) |
| `api_key` | legacy/mặc định (fallback) |
| `webhook_secret_test` / `webhook_secret_live` | `whsec_...` để verify chữ ký |

Helper trên model: `active_api_key`, `active_webhook_secret`, `expects_livemode`
(chọn theo `environment`). `SupplierOut` chỉ trả cờ `has_*` boolean, **không** lộ
giá trị secret.

### 3.2. Catalog VD → bảng `products`

Map theo cặp `(supplier_id, external_id)`.

| Field VD (`catalog.products[]`) | Field `products` |
|---|---|
| `id` | `external_id` |
| `name` | `name` (+ `slug` tự sinh khi tạo mới) |
| `description` | `description` |
| `price` (giá CTV) | `base_price` (giá nhập của ta) |
| `available` / `availableQuantity` | `stock_status` (`in_stock` / `out_of_stock`) |
| `deliveryType` | (chỉ dùng để tham chiếu, chưa lưu) |

`markup_percent` / `markup_amount` **do ta tự đặt**, sync **không đụng tới**.
Giá bán = `base_price × (1 + markup_percent/100) + markup_amount` (`Product.sale_price`).
Sync **không xóa** sản phẩm cũ để giữ lịch sử.

### 3.2b. Luồng giá vốn → markup → giá bán → lợi nhuận

Đây là vòng đời giá trong hệ thống:

```
NCC cập giá ──► sync_catalog ──► products.base_price (giá vốn, tự lưu DB riêng)
                                        │
        Admin mở modal "Tính giá" ──────┤ nhập % markup (hoặc nhập giá bán mong
                                        │ muốn → suy ngược %)
                                        ▼
                            products.markup_percent / markup_amount
                                        │
                                        ▼
                      sale_price = base × (1+%/100) + cố định  ──► hiện cho khách
                                        │
            Khách chốt mua ──► Order snapshot:                  │
              unit_price/total_amount  = giá bán                │
              unit_cost/total_cost     = giá vốn (base_price)   │
                                        ▼
                  Order.profit = total_amount − total_cost
                                        ▼
              Trang Lợi nhuận: Σ doanh thu − Σ giá vốn theo ngày / theo sản phẩm
```

Điểm mấu chốt: **Order snapshot cả giá bán lẫn giá vốn** tại thời điểm mua
(`orders.unit_cost`, `orders.total_cost`). Nhờ vậy lợi nhuận không bị lệch khi
NCC đổi giá hay admin chỉnh markup về sau.

| Cột `orders` | Ý nghĩa |
|---|---|
| `unit_price` / `total_amount` | giá bán khách trả (đã trừ voucher) |
| `unit_cost` / `total_cost` | giá vốn NCC tại thời điểm mua (= `product.base_price`) |
| `profit` (property) | `total_amount − total_cost` |

Báo cáo (chỉ tính đơn `success`):

| Endpoint | Trả về |
|---|---|
| `GET /api/orders/profit-summary?from_date=&to_date=` | doanh thu, giá vốn, lợi nhuận, biên LN %, số đơn |
| `GET /api/orders/profit-by-product?from_date=&to_date=&limit=` | lợi nhuận gộp theo từng sản phẩm |

Frontend:
- **Modal "Tính giá"** ([PriceCalculatorModal](../frontend/src/modules/Products/components/PriceCalculatorModal.tsx)):
  trên trang Sản phẩm, mỗi dòng có nút máy tính — admin thấy giá NCC, nhập %
  (hoặc nhập thẳng giá bán mong muốn để suy ngược %), xem ngay giá bán + lợi
  nhuận/đơn + biên LN, rồi lưu vào sản phẩm.
- **Nút "Đồng bộ NCC"** trên trang Sản phẩm: gọi `sync-catalog` cho mọi supplier
  driver `vdstore`.
- **Trang "Lợi nhuận"** ([ProfitPage](../frontend/src/modules/Profit/pages/ProfitPage.tsx)):
  4 thẻ tổng hợp + bảng lợi nhuận theo sản phẩm, lọc theo khoảng ngày. Menu mục
  *Kinh doanh › Lợi nhuận* (quyền `orders.index`).

### 3.3. Đơn VD ↔ đơn nội bộ

Bảng cầu nối `provider_order_refs` (giữ `orders` sạch, không nhét field riêng NCC):

| Cột | Ý nghĩa |
|---|---|
| `driver` | NCC nào (vd `vdstore`) |
| `order_id` | FK `orders.id` |
| `supplier_id` | FK `suppliers.id` |
| `external_order_id` | mã đơn nội bộ gửi sang = `Order.code` = `Idempotency-Key` |
| `provider_order_id` | id đơn phía VD (vd `po_123`) |
| `provider_status` | trạng thái gốc VD (FULFILLED/PENDING_FULFILLMENT/...) |
| `environment` / `livemode` | môi trường tạo đơn + cờ livemode để đối soát |
| `refunded_amount` | số tiền VD đã hoàn |

Map trạng thái đơn VD → `Order.status`:

| VD status | `Order.status` | Hành động |
|---|---|---|
| `FULFILLED` | `success` | giao nội dung cho khách |
| `PENDING_FULFILLMENT` | `processing` | giữ tiền, chờ admin VD + webhook |
| `PARTIALLY_FULFILLED` | `processing` | chờ tiếp |
| `PARTIALLY_CANCELLED` | `processing` | theo dõi (đã hoàn một phần) |
| `CANCELLED` | `failed` | hoàn tiền vào ví khách |

### 3.4. Webhook → `provider_webhook_events`

Log mọi event để **chống xử lý trùng** theo header `VD-Event-Id` (unique
`(driver, event_id)`). Trạng thái: `received` → `processed` / `skipped` / `failed`.

### 3.5. Voucher thưởng → bảng `vouchers`

`data.rewardVoucher` trong webhook `order.updated` (chỉ đơn live) → tạo `Voucher`
nội bộ (idempotent theo `code`). `discountPercent` → `percent`, ngược lại `amount`.

### 3.6. Ví

| Khái niệm | Bảng nội bộ | Ghi chú |
|---|---|---|
| Ví mua hàng của tổ chức tại VD | (không lưu) `GET /balance` | chỉ hiển thị/đối soát |
| Ví khách cuối | `users.balance` | giữ nguyên, dùng cho mua hàng trên web ta |

## 4. Luồng mua hàng (sequence)

```
Khách        Order service           partner.service          VD Store
 │  mua          │                         │                      │
 │──────────────►│ kiểm sản phẩm/kho       │                      │
 │               │ tính giá + áp voucher   │                      │
 │               │ TRỪ ví khách            │                      │
 │               │ tạo Order (processing)  │                      │
 │               │────────────────────────►│ fulfill_via_vdstore  │
 │               │                         │─────────────────────►│ POST /orders
 │               │                         │                      │ (Idempotency-Key=Order.code)
 │               │                         │◄─────────────────────│ VDOrder
 │               │                         │ ghi ProviderOrderRef │
 │               │                         │ guard livemode       │
 │               │◄────────────────────────│ FulfillmentResult    │
 │               │                                                 │
 │   success ────┤ giao delivered_content                          │
 │   processing ─┤ giữ tiền, chờ webhook                            │
 │   failed ─────┤ HOÀN ví + Order=failed                          │
```

Guard livemode: nếu `environment=live` (hoặc `APP_ENV=prod`) mà đơn trả
`livemode=false` → coi là lỗi cấu hình, **không giao hàng thật**, Order = `failed`.

## 5. Luồng webhook (sequence)

```
VD Store ──► POST /api/partner/webhook/vdstore (raw body)
   │
   ├─ verify HMAC-SHA256 của "t.rawBody" (thử secret live+test), tolerance 300s
   │     sai chữ ký → 400
   ├─ dedup theo VD-Event-Id  → đã có → 2xx (duplicate), bỏ qua
   ├─ webhook.test / không có order → ghi log, 2xx (ignored)
   ├─ tìm ProviderOrderRef theo provider_order_id (fallback external_order_id)
   ├─ guard livemode (prod không nhận sandbox)
   ├─ cập nhật Order: success / processing / failed(+hoàn ví)
   ├─ nếu có rewardVoucher (live) → tạo Voucher nội bộ
   └─ 2xx (processed)
```

Mọi event hợp lệ đều trả `2xx` để VD ngừng retry; chỉ sai chữ ký mới trả `4xx`.

## 6. Endpoint nội bộ (đã đăng ký dưới `/api`)

| Method | Path | Quyền | Mục đích |
|---|---|---|---|
| GET | `/api/partner/webhook-config/vdstore` | `partner.index` | URL webhook cố định + cờ `has_*` (không lộ secret) |
| PUT | `/api/partner/webhook-config/vdstore` | `partner.update` | tạo/cập nhật NCC active (key/secret theo môi trường) |
| POST | `/api/partner/webhook/vdstore` | không auth (HMAC) | webhook cố định khai báo 1 lần cho VD Store |
| POST | `/api/partner/{supplier_id}/webhook` | không auth (HMAC) | nhận webhook VD |
| POST | `/api/partner/{supplier_id}/sync-catalog` | `partner.update` | đồng bộ catalog → Product |
| GET | `/api/partner/{supplier_id}/balance` | `partner.show` | xem số dư ví CTV tại VD |
| GET | `/api/partner/order-refs` | `partner.index` | đối soát liên kết đơn |
| GET | `/api/partner/webhook-events` | `partner.index` | lịch sử webhook |

Permission subject `partner` (`index/show/store/update/destroy`) đã thêm vào
[seed.py](../backend/app/seed.py); admin có toàn bộ.

## 7. Cấu hình & biến môi trường

- `APP_ENV` (`local|staging|prod`): khi `prod`, hệ thống **chỉ giao hàng thật nếu
  `livemode=true`** ([config.py](../backend/app/core/config.py)).
- API key / webhook secret **không** đặt trong `.env` mà lưu trong DB (`suppliers`),
  nhập qua UI quản lý nhà cung cấp. Lý do: hỗ trợ nhiều supplier + xoay key không
  cần deploy lại.

URL webhook cố định khai báo trong admin VD Store:

```
https://<domain-cua-ban>/api/partner/webhook/vdstore
```

Endpoint theo `supplier_id` vẫn được giữ để debug/tương thích cũ, nhưng nên dùng URL cố định
để VD Store không phải cập nhật lại khi ta đổi supplier nội bộ. Yêu cầu: HTTPS public,
không localhost/IP private, không redirect.

## 8. Quy trình lên live (checklist)

1. Tạo Supplier `driver=vdstore`, `environment=test`, điền `api_key_test`, `api_endpoint`.
2. `POST /sync-catalog` → kiểm sản phẩm map vào `products`, đặt markup giá bán.
3. Mua thử bằng key test → kiểm Order, `ProviderOrderRef`, xử lý `FULFILLED` &
   `PENDING_FULFILLMENT`.
4. Khai báo webhook sandbox trong admin VD, lưu `webhook_secret_test`, bấm "Gửi test"
   → kiểm `webhook-events` nhận `webhook.test`, chữ ký OK.
5. Test retry cùng `Idempotency-Key` (= `Order.code`) không tạo trùng đơn.
6. Chuyển `environment=live`, điền `api_key_live` + `webhook_secret_live`, nạp ví VD.
7. Đảm bảo `APP_ENV=prod` và code đã kiểm `livemode === true` trước khi giao thật.

## 9. Bảo mật (bắt buộc tuân thủ)

- API key chỉ ở backend/DB; **không** đưa ra frontend, **không** gửi khách cuối,
  **không** commit lên Git.
- Không dùng chung key live cho test/staging.
- Production chỉ giao hàng thật khi `livemode === true`.
- Webhook luôn verify chữ ký HMAC + lưu `VD-Event-Id` chống trùng.
- Backend **không** log API key, webhook secret hay nội dung giao hàng nhạy cảm.
- Nghi key lộ → báo admin VD Store revoke/rotate, cập nhật lại trong UI supplier.

## 10. Xử lý lỗi

`errors.py` map mã `problem+json` của VD → `AppException` nội bộ với thông điệp
tiếng Việt (vd `insufficient_balance` → "Ví CTV không đủ tiền để tạo đơn"). Khi
tạo đơn lỗi, `ProviderOrderRef` vẫn được ghi với `provider_status=ERROR` + `note`
(code lỗi) để đối soát; Order chuyển `failed` và **hoàn ví khách**.
