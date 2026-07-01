"""Module Engagement — tương tác của khách trên landing.

Gồm 4 loại (kind) dùng chung một bảng `engagements`:
- review      : đánh giá sao sản phẩm (chỉ người đã mua).
- comment     : bình luận bài viết.
- testimonial : cảm nhận trên trang chủ.
- discussion  : trao đổi/thảo luận theo sản phẩm.

Mọi bản ghi mặc định status='pending' — admin duyệt (approved) mới hiển thị public.
Admin có thể trả lời/cảm ơn qua admin_reply.
"""
