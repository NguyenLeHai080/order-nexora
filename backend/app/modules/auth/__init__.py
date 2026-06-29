"""Module Auth — xác thực & phân quyền.

Đăng nhập (cấp JWT), lấy thông tin user hiện tại, đăng xuất.
Cung cấp dependency `get_current_user` và `require("subject.action")`
để các module khác bảo vệ endpoint theo quyền (RBAC).
"""
