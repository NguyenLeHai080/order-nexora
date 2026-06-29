# Đóng góp & quy trình làm việc

Tài liệu quy trình cho team phát triển theo Scrum. Áp dụng cho mọi thành viên.

## Quy trình theo Sprint

1. **Sprint Planning**: lấy task từ Product Backlog vào Sprint Backlog, ước lượng (story points).
2. **Mỗi task = 1 nhánh + 1 PR**. Task nhỏ, làm xong gộp sớm, tránh nhánh sống lâu.
3. **Daily**: cập nhật trạng thái task trên bảng (To Do / In Progress / Review / Done).
4. **Review & Demo**: PR được review trước khi merge; demo cuối sprint.
5. **Retrospective**: rút kinh nghiệm, cập nhật tài liệu nếu quy trình đổi.

## Chia nhỏ công việc (cho PO & dev)

Mỗi User Story nên tách thành các task kỹ thuật rõ ràng, ví dụ story "Quản lý danh mục sản phẩm":

| Task | Loại | Ghi chú |
|------|------|---------|
| API CRUD categories | BE | router + repository + schema + seed quyền |
| Màn hình danh sách + form | FE | dùng `useList` + `DataTable` |
| Phân quyền menu | FE | thêm vào `MENU` + `ProtectedRoute` |
| Test luồng chính | BE | pytest |

Một task nên hoàn thành trong ≤ 1–2 ngày. Lớn hơn thì tách tiếp.

## Quy ước nhánh (branch)

Không bao giờ push thẳng vào `main`. Tạo nhánh theo dạng:

```
feature/<mã-task>-mo-ta-ngan      # tính năng mới
fix/<mã-task>-mo-ta-ngan          # sửa lỗi
chore/<mo-ta>                     # việc lặt vặt (docs, config, refactor)
```

Ví dụ: `feature/NEX-128-quan-ly-danh-muc`.

## Quy ước commit

Theo [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <mô tả ngắn>

[thân commit tùy chọn]
```

`type`: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`.

Ví dụ:
```
feat(categories): thêm CRUD danh mục sản phẩm
fix(payments): sửa validate ngân hàng khi tạo tài khoản nhận tiền
docs(backend): bổ sung hướng dẫn thêm module mới
```

Mỗi commit nên là một thay đổi logic gọn, build được.

## Pull Request

- **Tiêu đề** ngắn gọn (< 70 ký tự), theo dạng commit.
- **Mô tả** gồm: tóm tắt thay đổi, đã test gì, ảnh chụp màn hình (nếu là UI), task liên quan.
- PR nhỏ dễ review. Một PR nên tập trung một việc.
- CI phải xanh trước khi merge.
- Cần ít nhất **1 reviewer approve**.

### Mẫu mô tả PR

```markdown
## Thay đổi
- Thêm CRUD danh mục sản phẩm (BE + FE)

## Đã test
- [x] pytest pass
- [x] typecheck + build FE
- [x] Thử thủ công: tạo/sửa/xóa danh mục

## Task
NEX-128
```

## Code review

Người review kiểm tra:
- Đúng yêu cầu task, không thừa phạm vi.
- Tuân thủ kiến trúc phân lớp (xem [architecture.md](architecture.md)).
- Dùng lại component/repository có sẵn thay vì viết lại.
- Có test cho luồng chính (BE).
- Không lộ secret, không hardcode cấu hình.
- Quyền (RBAC) áp dụng đúng ở cả BE và FE.

Phản hồi review mang tính xây dựng, kèm lý do.

## Definition of Done (DoD)

Một task chỉ được coi là **Done** khi:

- [ ] Code chạy đúng yêu cầu, đã thử thủ công.
- [ ] **Backend**: `ruff check .` sạch, `pytest -q` pass, endpoint có `summary` + `require(...)`, quyền đã seed.
- [ ] **Frontend**: `npm run typecheck` sạch, `npm run build` thành công, màn hình có route + quyền + menu.
- [ ] Có test cho logic nghiệp vụ mới (BE).
- [ ] Tài liệu cập nhật nếu thay đổi API/quy ước ([api/README.md](api/README.md)).
- [ ] PR được review và approve.
- [ ] CI xanh.

## An toàn

- Không commit secret (`.env`, khóa API). `.gitignore` đã loại trừ `.env`.
- Không commit file build/cache (`dist/`, `__pycache__/`, `.venv/`, `node_modules/`).
- File DB dev (`order_nexora.db`) không nên commit — dùng seed để tái tạo.
- Đổi `JWT_SECRET` thật ở môi trường production.

## Lệnh kiểm tra trước khi push

```bash
# Backend
cd backend && ruff check . && pytest -q

# Frontend
cd frontend && npm run typecheck && npm run build
```
